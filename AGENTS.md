# Agent guide: create-vanilla-gorilla

This project is a Node.js CLI. `npx create-vanilla-gorilla my-site` makes a new site from the [vanilla-gorilla](https://github.com/exhibita/vanilla-gorilla) template and can install a theme from [vanilla-gorilla-themes](https://github.com/exhibita/vanilla-gorilla-themes). Read `README.md` for the behavior.

## Commands

* `npm test`: run the smoke test (`node test/smoke.js`).
* `npm link`: make `npx create-vanilla-gorilla` use this local copy.

## Writing style

Write in the spirit of ASD STE100. Use direct sentences. Limit each procedural step to one action. Do not use unnecessary synonyms.

## Rules

* **One file.** All CLI code is in `bin/cli.js`. The package publishes only `bin/`.
* **No dependencies.** Use Node.js built-in modules only. Keep Node.js 18 support.
* **Do not install.** The CLI does not run `npm install` in the new site.
* **Keep the template marker.** Change only the `name` field of the copied `package.json` and, with a theme, add the `theme` key under `vanillaGorilla`. Keep `templateVersion` and the license. Gorilla To Go needs `templateVersion`.
* **Themes manifest.** Read the theme list and the `replaces` list from `themes.json` of the themes repository. Do not hard-code theme names.
* **No terminal, no prompts.** Without a TTY, use only the command-line options. Do not ask questions.
* **License.** This tool is MIT. Do not copy code from the AGPL template or themes.

## Tests

* The smoke test uses `CVG_TEMPLATE_REPO` and `CVG_THEMES_REPO` to clone local folders. Set them to `../vanilla-gorilla` and `../vanilla-gorilla-themes` to test against the local projects.
* `git clone` copies only committed files. Commit a template or theme change before you test it with the CLI.

## Before you finish

1. Run `npm test`.
2. Update `README.md` if a prompt, an option or an environment variable changed.
3. List the edge cases you verified.
