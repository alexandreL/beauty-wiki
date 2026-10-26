import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const version = manifest.version;
const targets = process.argv[2] ? [process.argv[2]] : ['firefox', 'chrome'];

const COPY = ['src', 'fonts', 'icons', 'LICENSE', 'README.md'];
const TEXT_EXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.md', '.svg', '.yml', '.yaml']);
const FORBIDDEN = new RegExp(['wiki', 'wand'].join(''), 'i');

function assertClean() {
  const hits = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'artifacts') continue;
      const full = path.join(dir, entry);
      if (full === path.join(root, 'scripts', 'build.mjs')) continue;
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (TEXT_EXT.has(path.extname(entry)) && FORBIDDEN.test(readFileSync(full, 'utf8'))) hits.push(full);
    }
  };
  walk(root);
  if (hits.length) {
    console.error('Forbidden reference found in:\n' + hits.map((h) => '  ' + path.relative(root, h)).join('\n'));
    process.exit(1);
  }
}

function manifestFor(target) {
  const copy = structuredClone(manifest);
  if (target === 'chrome') {
    delete copy.browser_specific_settings;
    copy.minimum_chrome_version = '110';
  }
  return copy;
}

function build(target) {
  if (!['firefox', 'chrome'].includes(target)) {
    console.error(`Unknown target: ${target}`);
    process.exit(1);
  }

  const outDir = path.join(root, 'dist', target);
  const artifacts = path.join(root, 'artifacts');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  mkdirSync(artifacts, { recursive: true });

  for (const entry of COPY) {
    cpSync(path.join(root, entry), path.join(outDir, entry), { recursive: true });
  }
  writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifestFor(target), null, 2) + '\n');

  const zipPath = path.join(artifacts, `beauty-wiki-${target}-${version}.zip`);
  rmSync(zipPath, { force: true });
  execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: outDir });

  console.log(`built ${path.relative(root, zipPath)}`);
}

assertClean();
for (const target of targets) build(target);
