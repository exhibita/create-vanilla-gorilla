# create-vanilla-gorilla

Scaffold a new static site from the [vanilla-gorilla](https://github.com/exhibita/vanilla-gorilla) template.

```bash
npx create-vanilla-gorilla my-site
```

## What it does

1. Asks for your site's address (URL), title and description.
2. Clones the `vanilla-gorilla` template into `my-site`.
3. Strips the template's git history and re-initializes a fresh repo.
4. Renames the copied `package.json`'s `name` field to match your project.
5. Writes the site's address, title and description to `config.json`.
6. Prints next steps.

No auto-install. This tool's only job is to hand you a clean copy of the template; everything else (the build pipeline, page scaffolding, deploy workflows) is documented in the [template repo](https://github.com/exhibita/vanilla-gorilla)'s own README.

## Site address, title and description

The RSS feed and the sitemap use `siteUrl`, `siteTitle` and `siteDescription` from `config.json`. Git commits this file, so do not put secrets in it.

In a terminal, the CLI asks for each value. Press Enter to accept the suggestion in brackets:

- Site address: `https://<your-github-login>.github.io/<my-site>`, if the GitHub CLI (`gh`) is signed in.
- Site title: the project directory name.
- Site description: no suggestion.

The CLI removes a trailing `/` from the address. The template builds `<siteUrl>/rss.xml` and the other addresses from it.

You can also give the values as options. The CLI does not ask for a value that you give:

```bash
npx create-vanilla-gorilla my-site --site-url https://www.example.com --site-title "My Site" --site-description "A short description."
```

Without a terminal (for example in CI), the CLI does not ask. It uses only the options. It then lists the values that you must set in `config.json` before your first deploy.

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
