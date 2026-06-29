import { createServer } from 'node:http';
import { readFile, rm, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const devStartUrl = process.env.M5_DEV_START_URL ?? 'http://localhost:5173/?m5low=1';
const prodPort = Number(process.env.M5_PROD_PORT ?? 4175);
const prodUrl = `http://127.0.0.1:${prodPort}/`;
const debugPort = Number(process.env.M5_DEBUG_PORT ?? 9338);
const userDataDir = `/tmp/zhaohuan-yuanzhuo-m5-chromium-${debugPort}`;
const homeDir = `/tmp/zhaohuan-yuanzhuo-m5-chromium-home-${debugPort}`;

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

async function tapSelector(client, selector) {
  const rect = await waitForValue(
    client,
    `(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
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

async function dragFromBottomEdge(client) {
  const before = await waitForValue(
    client,
    `(() => {
      const scene = globalThis.__ZH_GAME__?.scene?.getScene('GameScene');
      const canvas = document.querySelector('canvas');
      if (!scene?.player || !canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        player: { x: scene.player.x, y: scene.player.y },
        start: { x: window.innerWidth / 2, y: window.innerHeight - 24 },
        end: { x: window.innerWidth / 2 + 90, y: window.innerHeight - 108 },
        canvasBottom: rect.bottom,
        viewportHeight: window.innerHeight
      };
    })()`
  );

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: before.start.x, y: before.start.y, id: 2, radiusX: 8, radiusY: 8, force: 1 }]
  });
  await delay(120);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: before.end.x, y: before.end.y, id: 2, radiusX: 8, radiusY: 8, force: 1 }]
  });
  await delay(900);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: []
  });

  return waitForValue(
    client,
    `(() => {
      const scene = globalThis.__ZH_GAME__?.scene?.getScene('GameScene');
      if (!scene?.player) return null;
      const moved = scene.player.x > ${before.player.x + 20} && scene.player.y < ${before.player.y - 20};
      return moved ? { before: ${JSON.stringify(before.player)}, after: { x: scene.player.x, y: scene.player.y }, canvasBottom: ${before.canvasBottom}, viewportHeight: ${before.viewportHeight} } : null;
    })()`
  );
}

function createStaticServer() {
  const root = join(process.cwd(), 'dist');
  const mimeTypes = new Map([
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.png', 'image/png']
  ]);

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', prodUrl);
      const requestPath = url.pathname === '/' ? '/index.html' : url.pathname;
      const filePath = normalize(join(root, requestPath));
      if (!filePath.startsWith(root)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      await stat(filePath);
      const body = await readFile(filePath);
      response.writeHead(200, {
        'content-type': mimeTypes.get(extname(filePath)) ?? 'application/octet-stream',
        'cache-control': 'no-cache'
      });
      response.end(body);
    } catch {
      const body = await readFile(join(root, 'index.html'));
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(body);
    }
  });
}

async function main() {
  await rm(userDataDir, { recursive: true, force: true });
  await rm(homeDir, { recursive: true, force: true });

  const staticServer = createStaticServer();
  await new Promise((resolve) => staticServer.listen(prodPort, '127.0.0.1', resolve));

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

    await navigate(client, devStartUrl);
    await tapSelector(client, '.title-screen:not(.hidden) .primary-action');
    const lowSnapshot = await waitForValue(
      client,
      `(() => {
        const snapshot = globalThis.__ZH_GAME__?.scene?.getScene('GameScene')?.getM5Snapshot?.();
        const titleVisible = Boolean(document.querySelector('.title-screen:not(.hidden)'));
        return !titleVisible && snapshot?.deviceTier === 'low' && snapshot.audioUnlocked && snapshot.enemySoftCap === 120 && snapshot.targetFps === 24
          ? snapshot
          : null;
      })()`
    );
    const movementSnapshot = await dragFromBottomEdge(client);

    await navigate(client, prodUrl);
    const serviceWorkerReady = await waitForValue(
      client,
      `navigator.serviceWorker?.ready
        ?.then(() => navigator.serviceWorker.getRegistrations())
        .then((registrations) => registrations.some((registration) => Boolean(registration.active)))
        .then((ready) => ready ? true : null) ?? null`,
      12000
    );

    if (!serviceWorkerReady) {
      throw new Error('Service Worker did not become active');
    }

    console.log(
      `M5 browser verified: tier=${lowSnapshot.deviceTier}, cap=${lowSnapshot.enemySoftCap}, audio=${lowSnapshot.audioUnlocked}, moved=${movementSnapshot.after.x.toFixed(1)}, sw=${serviceWorkerReady}`
    );
    socket.close();
  } finally {
    chromium.kill('SIGTERM');
    staticServer.close();
    await delay(300);
    await rm(userDataDir, { recursive: true, force: true });
    await rm(homeDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
