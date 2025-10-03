# ThreeMe Documentation

This is the documentation site for the **ThreeMe** 3D rendering library. It uses [TypeDoc](https://typedoc.org/) with the modern DMT theme to automatically generate API documentation from TypeScript source code.

## Quick Start

Generate and serve the documentation locally:

```bash
# Generate documentation
bun run build

# Serve documentation locally
bun run serve
```

Or do both at once:

```bash
bun run dev
```

The documentation will be available at `http://localhost:3001`

## Commands

- **`bun run build`** - Generate documentation from the `@acme/threeme` package
- **`bun run serve`** - Start a local dev server to preview the docs
- **`bun run dev`** - Build and serve in one command

## How It Works

The documentation is automatically generated from:
- TypeScript type definitions
- JSDoc comments in the source code
- README files from the packages

To update the documentation, simply:
1. Make changes to the `@acme/threeme` package
2. Run `bun run build`
3. The documentation will reflect your changes

## Configuration

Documentation settings can be customized in `typedoc.json`:
- Entry points
- Output directory
- Theme settings
- Navigation options
- And more

## Deployment

The generated `dist/` folder contains static HTML that can be deployed to any static hosting service:
- GitHub Pages
- Vercel
- Netlify
- AWS S3
- etc.
