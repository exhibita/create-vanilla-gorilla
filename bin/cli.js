#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

const TEMPLATE_REPO_URL = process.env.CVG_TEMPLATE_REPO || 'https://github.com/exhibita/vanilla-gorilla.git';
const TEMPLATE_BRANCH = 'main';
const THEMES_REPO_URL = process.env.CVG_THEMES_REPO || 'https://github.com/exhibita/vanilla-gorilla-themes.git';
const THEMES_BRANCH = 'main';
const MANIFEST_VERSION = 1;
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
  --theme <name>              A theme from https://github.com/exhibita/vanilla-gorilla-themes

In a terminal, the command asks for each value that you do not give.
The values go in config.json. The RSS feed and the sitemap use them.

Examples:
  npx create-vanilla-gorilla my-site --site-url https://me.github.io/my-site
  npx create-vanilla-gorilla my-site --theme maison
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

// Remove the project folder after a failure. Keep a folder that existed before, but empty it.
function removeProject(targetDir, preExisted) {
  if (!preExisted) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    return;
  }
  for (const entry of fs.readdirSync(targetDir)) {
    fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
  }
}

// Clone the themes repository into a temporary folder. The folder is removed when the process exits.
function fetchThemes() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvg-themes-'));
  process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));

  const result = spawnSync(
    'git',
    ['clone', '--depth', '1', '--branch', THEMES_BRANCH, THEMES_REPO_URL, dir],
    { stdio: 'inherit' }
  );
  if (result.error || result.status !== 0) return null;

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dir, 'themes.json'), 'utf8'));
  } catch {
    fail(`could not read themes.json in ${THEMES_REPO_URL}.`);
  }
  if (manifest.manifestVersion > MANIFEST_VERSION) {
    fail(
      'the themes repository needs a newer create-vanilla-gorilla. Update it with: npx create-vanilla-gorilla@latest'
    );
  }
  return { dir, manifest };
}

function themeNames(manifest) {
  return manifest.themes.map((theme) => theme.name).join(', ');
}

// Returns the chosen theme, or null for the default theme.
async function askTheme(manifest) {
  const nameWidth = Math.max(...manifest.themes.map((theme) => theme.name.length));
  const typeWidth = Math.max(...manifest.themes.map((theme) => theme.type.length));
  console.log('\nThemes (previews: https://github.com/exhibita/vanilla-gorilla-themes):');
  for (const theme of manifest.themes) {
    console.log(`  ${theme.name.padEnd(nameWidth)}  ${theme.type.padEnd(typeWidth)}  ${theme.description}`);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const answer = (await rl.question('Theme [default]: ')).trim();
      if (!answer || answer === 'default') return null;
      const theme = manifest.themes.find((item) => item.name === answer);
      if (theme) return theme;
      console.log(`Enter one of these names, or press Enter for the default theme: ${themeNames(manifest)}.`);
    }
  } finally {
    rl.close();
  }
}

// Returns the resolved path, or null if it is the root or outside it.
function resolveInside(root, relativePath) {
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}

function applyTheme(targetDir, themesDir, manifest, theme) {
  const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
  const templateVersion = pkg.vanillaGorilla?.templateVersion ?? 0;
  if (templateVersion < theme.minTemplateVersion) {
    fail(
      `the theme "${theme.name}" needs template version ${theme.minTemplateVersion} or newer. The template is version ${templateVersion}.`
    );
  }

  const srcDir = path.join(targetDir, 'src');
  const replacePaths = manifest.replaces.map((entry) => {
    const resolved = resolveInside(srcDir, entry);
    if (!resolved) fail(`themes.json has a "replaces" path outside src/: ${entry}`);
    return resolved;
  });
  const themePath = resolveInside(themesDir, theme.path);
  if (!themePath) fail(`themes.json has a theme path outside the themes repository: ${theme.path}`);

  for (const replacePath of replacePaths) {
    fs.rmSync(replacePath, { recursive: true, force: true });
  }
  fs.cpSync(themePath, srcDir, { recursive: true });
}

function renamePackageJson(targetDir, themeName) {
  const pkgPath = path.join(targetDir, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.name = slugify(path.basename(targetDir));
    if (themeName) pkg.vanillaGorilla = { ...pkg.vanillaGorilla, theme: themeName };
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
        theme: { type: 'string' },
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
  if (flags.theme !== undefined && !/^[a-z0-9-]+$/.test(flags.theme)) {
    fail('--theme must contain only lower-case letters, digits and hyphens.');
  }

  const rawArg = await resolveRawArg(positionals);
  const targetDir = path.resolve(process.cwd(), rawArg);

  checkGitAvailable();
  checkTargetDir(targetDir);
  if (process.stdin.isTTY) await askSiteConfig(targetDir, site);

  let themes = null;
  let theme = null;
  if (flags.theme !== undefined) {
    themes = fetchThemes();
    if (!themes) fail(`could not clone the themes repository ${THEMES_REPO_URL}. See output above.`);
    theme = themes.manifest.themes.find((item) => item.name === flags.theme);
    if (!theme) fail(`there is no theme "${flags.theme}". Available themes: ${themeNames(themes.manifest)}.`);
  } else if (process.stdin.isTTY) {
    themes = fetchThemes();
    if (themes) {
      theme = await askTheme(themes.manifest);
    } else {
      console.warn('Warning: could not clone the themes repository. The site gets the default theme.');
    }
  }

  const preExisted = cloneTemplate(targetDir);
  process.on('exit', (code) => {
    if (code !== 0) removeProject(targetDir, preExisted);
  });
  if (theme) applyTheme(targetDir, themes.dir, themes.manifest, theme);
  reinitGit(targetDir);
  renamePackageJson(targetDir, theme?.name);
  writeSiteConfig(targetDir, site);

  const displayPath = path.relative(process.cwd(), targetDir) || rawArg;
  const unset = SITE_KEYS.filter((key) => !site[key]);
  const configNote = unset.length
    ? `\nBefore your first deploy, set ${unset.join(', ')} in config.json.\nUntil you do, the RSS feed and the sitemap use the template's values.\n`
    : '';
  const themeNote = theme
    ? `\nTheme: ${theme.title}. The site name, the address and the pictures are demo values. Replace them before your first deploy.\n`
    : '';

  console.log(`
Success! Created ${slugify(path.basename(targetDir))} at ${targetDir}.
${themeNote}${configNote}
Next steps:
  cd ${displayPath}
  ${installCommand()}
  npm run watch

To edit the site from your phone, see Gorilla To Go: https://gorillatogo.app

Happy building.
`);
}

main();
