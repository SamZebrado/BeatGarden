import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const [wsUrl, adbPath, xRaw, yRaw] = process.argv.slice(2);
if (!wsUrl || !adbPath || !xRaw || !yRaw) {
  throw new Error('usage: node --experimental-websocket tools/android_rhythm_hold_smoke.mjs <ws-url> <adb> <x> <y>');
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

async function status() {
  const result = await call('Runtime.evaluate', {
    expression: "JSON.parse(document.querySelector('#beatgarden-runtime-status').textContent)",
    returnByValue: true,
  });
  return result.result.value;
}

let before;
for (let attempt = 0; attempt < 200; attempt++) {
  before = await status();
  if (before.phase === 'tutorial' && before.beat >= 2.72 && before.beat <= 2.9) break;
  await new Promise((resolve) => setTimeout(resolve, 35));
}
if (!before || before.phase !== 'tutorial' || before.beat < 2.72 || before.beat > 2.9) {
  throw new Error(`tutorial timing window not reached: ${JSON.stringify(before)}`);
}

await run(adbPath, ['shell', 'input', 'swipe', xRaw, yRaw, xRaw, yRaw, '1300']);
await new Promise((resolve) => setTimeout(resolve, 900));
const after = await status();
socket.close();
console.log(JSON.stringify({ before, after }, null, 2));
