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

## Requirements

- Node.js 18 or later
- git, available on your `PATH`

## License

MIT
