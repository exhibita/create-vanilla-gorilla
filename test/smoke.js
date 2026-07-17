import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, '..', 'bin', 'cli.js');

function run(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    ...options,
  });
}

function withTmpDir(name, fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cvg-smoke-'));
  const target = path.join(tmpRoot, name);
  try {
    fn(target, tmpRoot);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

console.log('smoke: happy path (fresh directory)');
withTmpDir('Test Site', (target) => {
  const result = run([target]);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(target, 'package.json')), 'package.json should exist');
  assert.ok(fs.existsSync(path.join(target, 'src', 'index.html')), 'src/index.html should exist');
  assert.ok(fs.existsSync(path.join(target, '.git')), 'a fresh .git directory should exist after reinit');

  const pkg = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'test-site', 'package.json name should be slugified');

  const remotes = spawnSync('git', ['remote', '-v'], { cwd: target, encoding: 'utf8' });
  assert.equal(remotes.stdout.trim(), '', 'freshly re-initialized repo should have no remotes');
});
console.log('  ok');

console.log('smoke: existing empty directory succeeds');
withTmpDir('empty-dir', (target) => {
  fs.mkdirSync(target, { recursive: true });
  const result = run([target]);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(target, 'package.json')));
});
console.log('  ok');

console.log('smoke: existing non-empty directory is refused and left untouched');
withTmpDir('non-empty-dir', (target) => {
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'keep-me.txt'), 'do not delete');
  const result = run([target]);
  assert.notEqual(result.status, 0, 'should exit non-zero');
  assert.match(result.stderr, /already exists and is not empty/);
  assert.ok(fs.existsSync(path.join(target, 'keep-me.txt')), 'existing file must survive');
  assert.ok(!fs.existsSync(path.join(target, 'package.json')), 'clone must not have proceeded');
});
console.log('  ok');

console.log('smoke: no argument, empty prompt answer exits with usage');
{
  const result = spawnSync(process.execPath, [cliPath], {
    input: '\n',
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0, 'should exit non-zero');
  assert.match(result.stdout, /Usage: npx create-vanilla-gorilla/);
}
console.log('  ok');

console.log('\nAll smoke tests passed.');
