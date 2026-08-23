import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const WARN = {
  initialJsGzip: 100_000,
  initialPayloadGzip: 102_000,
  pwaPrecacheGzip: 135_000,
  largestLazyJsGzip: 360_000,
  runtimeAssetsGzip: 535_000,
  distRaw: 14_000_000,
};
const HARD = {
  initialJsGzip: 115_000,
  initialPayloadGzip: 118_000,
  pwaPrecacheGzip: 155_000,
  largestLazyJsGzip: 410_000,
  runtimeAssetsGzip: 610_000,
  distRaw: 16_000_000,
};

const files = walk(DIST).map((file) => {
  const bytes = readFileSync(file);
  return { path: file, relative: relative(DIST, file), raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
});
const byUrl = new Map(files.map((file) => [`/${file.relative}`, file]));
const index = readFileSync(join(DIST, 'index.html'), 'utf8');
const initialUrls = extractEntryAssets(index);
const initialFiles = initialUrls.map(resolveDistAsset);
const initialJs = initialFiles.filter((file) => file.relative.endsWith('.js'));
const runtime = files.filter((file) => !file.relative.endsWith('.map'));
const lazyJs = runtime.filter((file) => file.relative.endsWith('.js') && !initialFiles.includes(file));
const shell = ['./', './index.html', './manifest.webmanifest', './icons/beatgarden.svg', './icons/beatgarden-192.png', './icons/beatgarden-512.png'];
const precacheFiles = [...shell.map(resolveShellAsset), ...initialFiles];
const metrics = {
  initialJsGzip: sum(initialJs, 'gzip'),
  initialPayloadGzip: sum([resolveDistAsset('/index.html'), ...initialFiles], 'gzip'),
  pwaPrecacheGzip: sum(precacheFiles, 'gzip'),
  largestLazyJsGzip: Math.max(0, ...lazyJs.map((file) => file.gzip)),
  runtimeAssetsGzip: sum(runtime, 'gzip'),
  distRaw: sum(files, 'raw'),
};

const serviceWorker = readFileSync('public/sw.js', 'utf8');
if (!serviceWorker.includes('modulepreload')) throw new Error('Service worker must explicitly precache modulepreload dependencies.');
if (files.some((file) => file.relative.endsWith('.map') && serviceWorker.includes(file.relative))) throw new Error('Source maps must not be explicitly precached.');

let failed = false;
for (const [name, value] of Object.entries(metrics)) {
  const state = value > HARD[name] ? 'FAIL' : value > WARN[name] ? 'WARN' : 'PASS';
  if (state === 'FAIL') failed = true;
  console.log(`${state.padEnd(4)} ${name.padEnd(24)} ${format(value)}  warn=${format(WARN[name])} hard=${format(HARD[name])}`);
}
console.log(`INFO initial assets: ${initialFiles.map((file) => file.relative).join(', ')}`);
console.log(`INFO largest lazy JS: ${lazyJs.sort((a, b) => b.gzip - a.gzip)[0]?.relative ?? 'none'}`);
if (failed) process.exitCode = 1;

function extractEntryAssets(html) {
  const values = [];
  for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const tag = match[0];
    const attributes = Object.fromEntries([...tag.matchAll(/([^\s=]+)\s*=\s*["']([^"']*)["']/g)]
      .map((attribute) => [attribute[1].toLowerCase(), attribute[2]]));
    if (match[1].toLowerCase() === 'script' && attributes.src) values.push(attributes.src);
    if (match[1].toLowerCase() === 'link' && attributes.rel?.split(/\s+/).includes('modulepreload') && attributes.href) values.push(attributes.href);
  }
  return [...new Set(values)];
}

function resolveDistAsset(url) {
  const pathname = new URL(url, 'https://example.test/').pathname.replace(/^\/BeatGarden/, '');
  const file = byUrl.get(pathname);
  if (!file) throw new Error(`Production entry references missing asset: ${url}`);
  return file;
}

function resolveShellAsset(url) {
  if (url === './' || url === './index.html') return resolveDistAsset('/index.html');
  return resolveDistAsset(`/${url.replace(/^\.\//, '')}`);
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function sum(values, key) { return values.reduce((total, value) => total + value[key], 0); }
function format(value) { return `${(value / 1000).toFixed(1)} kB`; }
