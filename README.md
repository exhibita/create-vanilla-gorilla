# create-vanilla-gorilla

Scaffold a new static site from the [vanilla-gorilla](https://github.com/exhibita/vanilla-gorilla) template.

```bash
npx create-vanilla-gorilla my-site
```

Note that my-site will be the folder name underneath the current folder that you are running the `npx` command in. If, for example, you'd wish to have the initial folder created adjacent to the current folder, use `..\my-site` (or `../my-site` for Linux/Mac). 

## What it does

1. Asks for your site's address (URL), title and description, and for a theme.
2. Clones the `vanilla-gorilla` template into `my-site`.
3. Installs the theme, if you chose one.
4. Strips the template's git history and re-initializes a fresh repo.
5. Renames the copied `package.json`'s `name` field to match your project.
6. Writes the site's address, title and description to `config.json`.
7. Asks for theme to apply (default or the themes in [Vanilla Gorilla Themes](../vanilla-gorilla-themes/)
8. Prints next steps.

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
npx create-vanilla-gorilla my-site --site-url https://www.example.com --site-title "My Site" --site-description "A short description." --theme field-notes
```

Without a terminal (for example in CI), the CLI does not ask. It uses only the options. It then lists the values that you must set in `config.json` before your first deploy.

## Themes

A theme from [vanilla-gorilla-themes](https://github.com/exhibita/vanilla-gorilla-themes) replaces the template's pages, styles and pictures. Give the theme name as an option:

```bash
npx create-vanilla-gorilla my-site --theme maison
```

In a terminal without `--theme`, the CLI lists the themes (name, type and description) after the site questions and asks `Theme [default]`. Press Enter to keep the template's own theme. If the CLI cannot reach the themes repository, it prints a warning and keeps the default theme. Without a terminal and without `--theme`, the CLI does not download the themes.

The CLI always uses the `main` branch of the themes repository. It deletes the template paths that the theme replaces under `src/` and copies the theme into `src/`. It writes the theme name in `package.json`, for example `"vanillaGorilla": { "templateVersion": 4, "theme": "maison" }`. The site name, the address and the pictures of a theme are demo values. Replace them before your first deploy.

Two environment variables change the repository addresses. The smoke tests use them to run with local folders:

- `CVG_TEMPLATE_REPO`: the template repository. The default is `https://github.com/exhibita/vanilla-gorilla.git`.
- `CVG_THEMES_REPO`: the themes repository. The default is `https://github.com/exhibita/vanilla-gorilla-themes.git`.

The theme files use the `AGPL-3.0-or-later` license, the same as the template. A site with a theme has `AGPL-3.0-or-later` files from two repositories. This tool stays MIT.

## Template version

The new site gets the current `main` branch of the template. The template version is in `package.json`:

```json
"vanillaGorilla": { "templateVersion": 2 }
```

The CLI changes only the `name` field and, with a theme, adds the `theme` key. The new site keeps this marker and the template's license (`AGPL-3.0-or-later`). The smoke test checks this.

[Gorilla To Go](https://gorillatogo.app) is a phone app that edits Vanilla Gorilla sites. It needs template version 2 or newer. To upgrade an older site, see [UPGRADE-v2.md](https://github.com/exhibita/vanilla-gorilla/blob/main/docs/UPGRADE-v2.md) in the template repository.

## Requirements

- Node.js 18 or later
- git, available on your `PATH`

## License

This tool: MIT. A site that you make with it uses the license of the template (`AGPL-3.0-or-later`), which is in its `package.json`. A theme uses the same license.
