#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

const TEMPLATE_REPO_URL = 'https://github.com/exhibita/vanilla-gorilla.git';
const TEMPLATE_BRANCH = 'main';
const CONFIG_COMMENT =
  'WARNING: Do NOT put secrets (passwords, API keys, tokens, access keys) in this file. It is committed to the GitHub repository.';
const SITE_KEYS = ['siteUrl', 'siteTitle', 'siteDescription'];

const USAGE = `
Usage: npx create-vanilla-gorilla <project-directory> [options]

Scaffolds a new static site from the vanilla-gorilla template
(https://github.com/exhibita/vanilla-gorilla).

Options:
  --site-url <url>            The address of the live site
  --site-title <text>         The title of the site
  --site-description <text>   A short description of the site

In a terminal, the command asks for each value that you do not give.
The values go in config.json. The RSS feed and the sitemap use them.

Example:
  npx create-vanilla-gorilla my-site --site-url https://me.github.io/my-site
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

function parseCliArgs(argv) {
  try {
    return parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        'site-url': { type: 'string' },
        'site-title': { type: 'string' },
        'site-description': { type: 'string' },
      },
    });
  } catch (err) {
    fail(`${err.message}\n${USAGE}`);
  }
}

// Returns the URL without a trailing slash, or null if it is not an http(s) URL.
function normalizeSiteUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, '');
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'https:' || url.protocol === 'http:') return trimmed;
  } catch {
    // Fall through to null.
  }
  return null;
}

function githubLogin() {
  const result = spawnSync('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) return '';
  return result.stdout.trim();
}

// The GitHub Pages address for a repository named like the project directory.
function suggestSiteUrl(targetDir) {
  const login = githubLogin().toLowerCase();
  if (!login) return '';
  const repo = path.basename(targetDir).replace(/[^A-Za-z0-9._-]+/g, '-');
  if (repo.toLowerCase() === `${login}.github.io`) return `https://${login}.github.io`;
  return `https://${login}.github.io/${repo}`;
}

async function askSiteConfig(targetDir, site) {
  console.log('\nThe RSS feed and the sitemap use these values. Press Enter to accept the value in brackets.');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (question, suggestion) => {
    const prompt = suggestion ? `${question} [${suggestion}]: ` : `${question}: `;
    return (await rl.question(prompt)).trim() || suggestion;
  };

  try {
    if (!site.siteUrl) {
      const suggestion = suggestSiteUrl(targetDir);
      for (;;) {
        const answer = await ask('Site address (URL)', suggestion);
        if (!answer) break;
        site.siteUrl = normalizeSiteUrl(answer);
        if (site.siteUrl) break;
        console.log('Enter a full address that starts with https:// or http://.');
      }
    }
    if (!site.siteTitle) site.siteTitle = await ask('Site title', path.basename(targetDir));
    if (!site.siteDescription) site.siteDescription = await ask('Site description', '');
  } finally {
    rl.close();
  }
}

// Merge the site values into the template's config.json. Create the file if the template has none.
function writeSiteConfig(targetDir, site) {
  const configPath = path.join(targetDir, 'config.json');
  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      console.warn('Warning: could not read config.json. Set siteUrl, siteTitle and siteDescription by hand.');
      return;
    }
  }
  config = { _comment: CONFIG_COMMENT, ...config };
  for (const key of SITE_KEYS) {
    if (site[key]) config[key] = site[key];
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

async function main() {
  const { values: flags, positionals } = parseCliArgs(process.argv.slice(2));

  if (flags.help) {
    console.log(USAGE);
    return;
  }

  const site = {
    siteUrl: '',
    siteTitle: flags['site-title']?.trim() || '',
    siteDescription: flags['site-description']?.trim() || '',
  };
  if (flags['site-url'] !== undefined) {
    site.siteUrl = normalizeSiteUrl(flags['site-url']);
    if (!site.siteUrl) fail('--site-url must be a full address that starts with https:// or http://.');
  }

  const rawArg = await resolveRawArg(positionals);
  const targetDir = path.resolve(process.cwd(), rawArg);

  checkGitAvailable();
  checkTargetDir(targetDir);
  if (process.stdin.isTTY) await askSiteConfig(targetDir, site);
  cloneTemplate(targetDir);
  reinitGit(targetDir);
  renamePackageJson(targetDir);
  writeSiteConfig(targetDir, site);

  const displayPath = path.relative(process.cwd(), targetDir) || rawArg;
  const unset = SITE_KEYS.filter((key) => !site[key]);
  const configNote = unset.length
    ? `\nBefore your first deploy, set ${unset.join(', ')} in config.json.\nUntil you do, the RSS feed and the sitemap use the template's values.\n`
    : '';

  console.log(`
Success! Created ${slugify(path.basename(targetDir))} at ${targetDir}.
${configNote}
Next steps:
  cd ${displayPath}
  ${installCommand()}
  npm run watch

To edit the site from your phone, see Gorilla To Go: https://gorillatogo.app

Happy building.
`);
}

main();
