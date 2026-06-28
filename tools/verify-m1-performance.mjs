import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const appUrl = process.env.M1_URL ?? 'http://localhost:5173/?m1perf=1';
const debugPort = Number(process.env.M1_DEBUG_PORT ?? 9334);
const userDataDir = `/tmp/zhaohuan-yuanzhuo-m1-chromium-${debugPort}`;
const homeDir = `/tmp/zhaohuan-yuanzhuo-m1-chromium-home-${debugPort}`;

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data.toString());
      if (!message.id) {
        return;
      }

      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }

      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message));
        return;
      }

      pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = JSON.stringify({ id, method, params });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(payload);
    });
  }
}

async function waitForJson(url, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    } catch {
      await delay(100);
    }
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForValue(client, expression, timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });

    if (result.result.value !== null && result.result.value !== undefined) {
      return result.result.value;
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for expression: ${expression}`);
}

async function waitForPageTarget(timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`, 1000);
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) {
        return page;
      }
    } catch {
      await delay(100);
    }
  }

  throw new Error('Timed out waiting for a Chromium page target');
}

async function main() {
  await rm(userDataDir, { recursive: true, force: true });
  await rm(homeDir, { recursive: true, force: true });

  const chromium = spawn(
    'xvfb-run',
    [
      '-a',
      'chromium-browser',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank'
    ],
    {
      stdio: 'ignore',
      env: {
        ...process.env,
        HOME: homeDir
      }
    }
  );

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    const target = await waitForPageTarget();
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });

    const client = new CdpClient(socket);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    await client.send('Page.navigate', { url: appUrl });
    await waitForValue(client, 'document.readyState === "complete" ? true : null');
    await waitForValue(
      client,
      `(() => {
        const game = globalThis.__ZH_GAME__;
        const scene = game?.scene?.getScene('GameScene');
        const snapshot = scene?.getM1Snapshot?.();
        return snapshot?.enemyCount >= 200 ? snapshot : null;
      })()`
    );
    await delay(2200);

    const snapshot = await waitForValue(
      client,
      `(() => {
        const game = globalThis.__ZH_GAME__;
        const scene = game?.scene?.getScene('GameScene');
        return scene?.getM1Snapshot?.() ?? null;
      })()`
    );

    if (snapshot.enemyCount < 200) {
      throw new Error(`Expected at least 200 enemies, got ${snapshot.enemyCount}`);
    }

    if (snapshot.fps < 30) {
      throw new Error(`Expected >=30fps with 200 enemies, got ${snapshot.fps.toFixed(1)}fps`);
    }

    console.log(`M1 performance verified: enemies=${snapshot.enemyCount}, fps=${snapshot.fps.toFixed(1)}`);
    socket.close();
  } finally {
    chromium.kill('SIGTERM');
    await delay(300);
    await rm(userDataDir, { recursive: true, force: true });
    await rm(homeDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
