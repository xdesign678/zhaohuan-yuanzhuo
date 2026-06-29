import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = process.env.M2_URL ?? 'http://localhost:5173/';
const debugPort = Number(process.env.M2_DEBUG_PORT ?? 9335);
const userDataDir = `/tmp/zhaohuan-yuanzhuo-m2-chromium-${debugPort}`;
const homeDir = `/tmp/zhaohuan-yuanzhuo-m2-chromium-home-${debugPort}`;

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data.toString());
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
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
      if (response.ok) return response.json();
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
    if (result.result.value !== null && result.result.value !== undefined) return result.result.value;
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
      if (page) return page;
    } catch {
      await delay(100);
    }
  }
  throw new Error('Timed out waiting for a Chromium page target');
}

async function navigate(client, url) {
  await client.send('Page.navigate', { url });
  await waitForValue(client, 'document.readyState === "complete" ? true : null');
}

async function tapSelector(client, selector, index = 0) {
  const rect = await waitForValue(
    client,
    `(() => {
      const node = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`
  );

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: rect.x, y: rect.y, id: 1, radiusX: 8, radiusY: 8, force: 1 }]
  });
  await delay(120);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: []
  });
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
    { stdio: 'ignore', env: { ...process.env, HOME: homeDir } }
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

    await navigate(client, `${baseUrl}?m2all=1`);
    const allPets = await waitForValue(
      client,
      `(() => {
        const snapshot = globalThis.__ZH_GAME__?.scene?.getScene('GameScene')?.getM2Snapshot?.();
        return snapshot?.petCount === 5 && snapshot.reactions > 0 ? snapshot : null;
      })()`
    );

    await navigate(client, `${baseUrl}?m2upgrade=1`);
    const choices = await waitForValue(
      client,
      `(() => {
        const cards = [...document.querySelectorAll('.upgrade-card')];
        const snapshot = globalThis.__ZH_GAME__?.scene?.getScene('GameScene')?.getM2Snapshot?.();
        return cards.length === 3 && snapshot?.upgradeChoiceCount === 3
          ? { cards: cards.map((card) => card.textContent), snapshot }
          : null;
      })()`
    );

    await tapSelector(client, '.upgrade-card', 1);
    const afterTouch = await waitForValue(
      client,
      `(() => {
        const snapshot = globalThis.__ZH_GAME__?.scene?.getScene('GameScene')?.getM2Snapshot?.();
        return snapshot?.upgradeChoiceCount === 0 && snapshot.petCount >= 2 ? snapshot : null;
      })()`
    );

    console.log(
      `M2 browser verified: pets=${allPets.petNames.join('/')}, reactions=${allPets.reactions}, choices=${choices.snapshot.upgradeChoiceCount}, afterTouchPets=${afterTouch.petCount}`
    );
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
