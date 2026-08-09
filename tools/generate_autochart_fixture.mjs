import { writeFile } from 'node:fs/promises';

const output = process.argv[2];
if (!output) throw new Error('usage: node tools/generate_autochart_fixture.mjs OUTPUT.wav');
const sampleRate = 22_050;
const durationSec = 10;
const samples = new Float32Array(sampleRate * durationSec);
for (let time = 0; time < durationSec; time += 0.5) {
  const start = Math.floor(time * sampleRate);
  for (let i = 0; i < sampleRate * 0.05 && start + i < samples.length; i++) {
    const envelope = Math.exp(-i / (sampleRate * 0.012));
    samples[start + i] += Math.sin(2 * Math.PI * 90 * i / sampleRate) * envelope * 0.75;
  }
}
const dataBytes = samples.length * 2;
const buffer = Buffer.alloc(44 + dataBytes);
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataBytes, 4);
buffer.write('WAVEfmt ', 8);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataBytes, 40);
for (let i = 0; i < samples.length; i++) {
  buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
}
await writeFile(output, buffer);
console.log(output);

