import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = process.env.M4_URL ?? 'http://localhost:5173/';
const debugPort = Number(process.env.M4_DEBUG_PORT ?? 9337);
const userDataDir = `/tmp/zhaohuan-yuanzhuo-m4-chromium-${debugPort}`;
const homeDir = `/tmp/zhaohuan-yuanzhuo-m4-chromium-home-${debugPort}`;
const saveKey = 'summoner-survivor-save-v1';

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
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
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

function zeroGrowth() {
  return {
    vitality: 0,
    swiftness: 0,
    wisdom: 0,
    magnet: 0,
    bond: 0,
    reaction: 0,
    soulHarvest: 0
  };
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

    await navigate(client, baseUrl);
    await client.send('Runtime.evaluate', { expression: 'localStorage.clear()', returnByValue: true });
    await navigate(client, baseUrl);
    const titleSnapshot = await waitForValue(
      client,
      `(() => {
        const snapshot = globalThis.__ZH_GAME__?.scene?.getScene('GameScene')?.getM4Snapshot?.();
        return snapshot?.titleVisible && snapshot.growthNodeCount >= 6 && snapshot.growthNodeCount <= 8 ? snapshot : null;
      })()`
    );

    const seededSave = {
      version: 1,
      soulCrystals: 50,
      growth: zeroGrowth(),
      bestKills: 0,
      bestTime: 0,
      runs: 0
    };
    await client.send('Runtime.evaluate', {
      expression: `localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(JSON.stringify(seededSave))})`,
      returnByValue: true
    });
    await navigate(client, baseUrl);
    await client.send('Runtime.evaluate', {
      expression: `document.querySelector('[data-node-id="vitality"]')?.click()`,
      returnByValue: true
    });
    const purchaseSnapshot = await waitForValue(
      client,
      `(() => {
        const snapshot = globalThis.__ZH_GAME__?.scene?.getScene('GameScene')?.getM4Snapshot?.();
        return snapshot?.growthLevels?.vitality === 1 && snapshot.soulCrystals < 50 ? snapshot : null;
      })()`
    );

    await navigate(client, `${baseUrl}?m4autostart=1&m4gameover=1`);
    const resultSnapshot = await waitForValue(
      client,
      `(() => {
        const snapshot = globalThis.__ZH_GAME__?.scene?.getScene('GameScene')?.getM4Snapshot?.();
        return snapshot?.resultVisible && snapshot.lastRunSoulCrystals > 0 && snapshot.persistedRuns >= 1 ? snapshot : null;
      })()`,
      12000
    );

    await client.send('Runtime.evaluate', {
      expression: `localStorage.setItem(${JSON.stringify(saveKey)}, '{broken')`,
      returnByValue: true
    });
    await navigate(client, baseUrl);
    const corruptSnapshot = await waitForValue(
      client,
      `(() => {
        const snapshot = globalThis.__ZH_GAME__?.scene?.getScene('GameScene')?.getM4Snapshot?.();
        return snapshot?.titleVisible && snapshot.saveFallbackUsed ? snapshot : null;
      })()`
    );

    const layoutOk = await waitForValue(
      client,
      `(() => {
        const nodes = [...document.querySelectorAll('.title-screen:not(.hidden), .result-panel:not(.hidden), .game-hud')];
        if (nodes.length === 0) return null;
        return nodes.every((node) => {
          const rect = node.getBoundingClientRect();
          return rect.left >= -1 && rect.top >= -1 && rect.right <= window.innerWidth + 1 && rect.bottom <= window.innerHeight + 1;
        }) ? true : null;
      })()`
    );

    if (!layoutOk) {
      throw new Error('M4 UI layout exceeded the mobile viewport');
    }

    console.log(
      `M4 browser verified: nodes=${titleSnapshot.growthNodeCount}, vitality=${purchaseSnapshot.growthLevels.vitality}, reward=${resultSnapshot.lastRunSoulCrystals}, fallback=${corruptSnapshot.saveFallbackUsed}`
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
