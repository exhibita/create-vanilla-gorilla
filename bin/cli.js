#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

const TEMPLATE_REPO_URL = 'https://github.com/exhibita/vanilla-gorilla.git';
const TEMPLATE_BRANCH = 'main';

const USAGE = `
Usage: npx create-vanilla-gorilla <project-directory>

Scaffolds a new static site from the vanilla-gorilla template
(https://github.com/exhibita/vanilla-gorilla).

Example:
  npx create-vanilla-gorilla my-site
`;

function fail(message, code = 1) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

function slugify(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 214);
  return slug || 'my-site';
}

function installCommand() {
  const agent = process.env.npm_config_user_agent || '';
  if (agent.startsWith('pnpm')) return 'pnpm install';
  if (agent.startsWith('yarn')) return 'yarn';
  return 'npm install';
}

async function resolveRawArg(argv) {
  if (argv[0]) return argv[0];

  console.log(USAGE);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Project directory name: ');
  rl.close();

  if (!answer.trim()) {
    process.exit(1);
  }
  return answer.trim();
}

function checkGitAvailable() {
  const result = spawnSync('git', ['--version']);
  if (result.error || result.status !== 0) {
    fail(
      'git is required but was not found on your PATH. Install git from https://git-scm.com/downloads and try again.'
    );
  }
}

function checkTargetDir(targetDir) {
  if (!fs.existsSync(targetDir)) return;

  const stat = fs.statSync(targetDir);
  if (!stat.isDirectory()) {
    fail(`${targetDir} exists and is not a directory.`);
  }

  const contents = fs.readdirSync(targetDir);
  if (contents.length > 0) {
    fail(
      `directory "${path.basename(targetDir)}" already exists and is not empty. Choose a different name or remove it first.`
    );
  }
}

function cloneTemplate(targetDir) {
  const preExisted = fs.existsSync(targetDir);

  const result = spawnSync(
    'git',
    ['clone', '--depth', '1', '--branch', TEMPLATE_BRANCH, TEMPLATE_REPO_URL, targetDir],
    { stdio: 'inherit' }
  );

  if (result.error || result.status !== 0) {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fail('git clone failed. See output above.', result.status || 1);
  }

  return preExisted;
}

function reinitGit(targetDir) {
  fs.rmSync(path.join(targetDir, '.git'), { recursive: true, force: true });
  spawnSync('git', ['init', '--initial-branch=main'], { cwd: targetDir });
}

function renamePackageJson(targetDir) {
  const pkgPath = path.join(targetDir, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.name = slugify(path.basename(targetDir));
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  } catch {
    console.warn(
      'Warning: could not update package.json name field automatically. You may want to edit it by hand.'
    );
  }
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv[0] === '--help' || argv[0] === '-h') {
    console.log(USAGE);
    return;
  }

  const rawArg = await resolveRawArg(argv);
  const targetDir = path.resolve(process.cwd(), rawArg);

  checkGitAvailable();
  checkTargetDir(targetDir);
  cloneTemplate(targetDir);
  reinitGit(targetDir);
  renamePackageJson(targetDir);

  const displayPath = path.relative(process.cwd(), targetDir) || rawArg;

  console.log(`
Success! Created ${slugify(path.basename(targetDir))} at ${targetDir}.

Next steps:
  cd ${displayPath}
  ${installCommand()}
  npm run watch

Happy building.
`);
}

main();
