import { writeFile } from 'node:fs/promises';

const [wsUrl, outputPath] = process.argv.slice(2);
if (!wsUrl || !outputPath) {
  throw new Error('usage: node --experimental-websocket tools/android_rhythm_r2_pause_smoke.mjs <ws-url> <screenshot-output>');
}

const socket = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
});

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function status() {
  return evaluate("JSON.parse(document.querySelector('#beatgarden-runtime-status').textContent)");
}

async function touch(x, y) {
  const point = { x, y, radiusX: 8, radiusY: 8, force: 1, id: 1 };
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await call('Runtime.enable');
await call('Page.enable');
await call('Page.bringToFront');
await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await evaluate(`(() => {
  const key = 'beatgarden.rhythmTutorials.v1';
  const parsed = JSON.parse(localStorage.getItem(key) || '[]');
  const value = Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  if (!value.includes('cloud-post')) value.push('cloud-post');
  localStorage.setItem(key, JSON.stringify(value));
  location.reload();
  return true;
})()`);
await wait(900);

const unlock = await evaluate(`(() => {
  const el = document.querySelector('[data-role="unlock-action"]');
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
})()`);
let before;
for (let unlockAttempt = 0; unlockAttempt < 3; unlockAttempt++) {
  await touch(unlock.x, unlock.y);
  for (let attempt = 0; attempt < 120; attempt++) {
    before = await status();
    if (before.phase === 'playing') break;
    await wait(50);
  }
  if (before?.phase === 'playing') break;
}
if (before?.phase !== 'playing') throw new Error(`playing phase not reached: ${JSON.stringify(before)}`);

const control = await evaluate(`(() => {
  const el = document.querySelector('[data-role="rhythm-pause"]');
  const rect = el.getBoundingClientRect();
  return {
    aria: el.getAttribute('aria-label'),
    width: rect.width,
    height: rect.height,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
  };
})()`);
await touch(control.x, control.y);
await wait(180);
const paused = await status();
const resumeAria = await evaluate("document.querySelector('[data-role=\"rhythm-pause\"]').getAttribute('aria-label')");
await touch(control.x, control.y);
await wait(180);
const resumed = await status();

const screenshot = await call('Page.captureScreenshot', { format: 'png', fromSurface: true });
await writeFile(outputPath, Buffer.from(screenshot.data, 'base64'));
socket.close();

console.log(JSON.stringify({ before, control, paused, resumeAria, resumed, screenshot: outputPath }, null, 2));
