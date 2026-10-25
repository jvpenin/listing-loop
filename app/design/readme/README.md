# Listing Loop · README design kit

A small GitHub-oriented kit for Cal Hacks judges and technical visitors. It follows the existing palette, Inter typography and Lo / Fox / Spark artwork. Two graphic bands carry the identity; the rest stays in accessible, searchable Markdown.

- [Header SVG](../../public/readme/header.svg) / [PNG](../../public/readme/header.png): 1320 × 500.
- [Product loop SVG](../../public/readme/loop.svg) / [PNG](../../public/readme/loop.png): 1320 × 236.
- [Product screenshot](../../public/readme/product.png): the existing launch screen.
- [Figma workspace](https://www.figma.com/design/XDf8Er4HW0v29ziTEv80Qw): created for this task; the original transparent mascot sheet was uploaded there.

The Figma Starter MCP call limit blocked canvas composition. The finished layouts are delivered locally as self-contained SVGs and PNGs. Import `header.svg` and `loop.svg` into that workspace as vector artwork. The SVG source preserves the text, shapes and embedded Inter fonts; text editability after import depends on Figma’s SVG importer. The raster mascot artwork remains an image.

`figma-layout.js` preserves the intended native Figma construction script. It was not executed because the tool limit was reached. `render-kit.mjs` is the local source of truth for the delivered graphics and embeds their fonts and artwork so the SVGs do not depend on remote assets.

To regenerate the kit from the repository root:

```sh
node app/design/readme/render-kit.mjs
```

The renderer uses `@playwright/test` from `app/` and the installed Chrome. Set `CHROME_PATH` when needed. It writes only to `app/public/readme/`.

Brand colors: primary `#3269E8`, deep ink `#18304D`, sky `#E7EFFF`, warm accent `#FFBB67`, success `#1D9983`. Fonts retain their [OFL license](../../public/fonts/OFL.txt). Mascots come from the project's supplied design guide; their transparent cutout was prepared during front-end implementation.
