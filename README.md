# create-vanilla-gorilla

Scaffold a new static site from the [vanilla-gorilla](https://github.com/exhibita/vanilla-gorilla) template.

```bash
npx create-vanilla-gorilla my-site
```

## What it does

1. Clones the `vanilla-gorilla` template into `my-site`.
2. Strips the template's git history and re-initializes a fresh repo.
3. Renames the copied `package.json`'s `name` field to match your project.
4. Prints next steps.

That's it — no config, no prompts beyond the project name, no auto-install. This tool's only job is to hand you a clean copy of the template; everything else (the build pipeline, page scaffolding, deploy workflows) is documented in the [template repo](https://github.com/exhibita/vanilla-gorilla)'s own README.

## Template version

The new site gets the current `main` branch of the template. The template version is in `package.json`:

```json
"vanillaGorilla": { "templateVersion": 2 }
```

The CLI changes only the `name` field, so the new site keeps this marker and the template's license (`AGPL-3.0-or-later`). The smoke test checks this.

[Gorilla To Go](https://gorillatogo.app) is a phone app that edits Vanilla Gorilla sites. It needs template version 2 or newer. To upgrade an older site, see [UPGRADE-v2.md](https://github.com/exhibita/vanilla-gorilla/blob/main/docs/UPGRADE-v2.md) in the template repository.

## Requirements

- Node.js 18 or later
- git, available on your `PATH`

## License

This tool: MIT. A site that you make with it uses the license of the template (`AGPL-3.0-or-later`), which is in its `package.json`.
