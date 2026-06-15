# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-based **PSD mockup editor**. A user uploads a `.psd` file; layers the designer has *tagged by name* become live-editable (recolor + image swap), and the whole thing renders to an HTML canvas in real time. PSD parsing is done with [`ag-psd`](https://www.npmjs.com/package/ag-psd). There is no backend — everything runs client-side.

## Commands

Package manager is **pnpm** (lockfile + `pnpm-workspace.yaml` present).

- `pnpm dev` — start the Next.js dev server (http://localhost:3000)
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — `biome check` (this project uses **Biome**, not ESLint)
- `pnpm format` — `biome format --write`

No test framework is configured. There is no command to run a single test.

## Core architecture

### The layer-name contract (`src/utils/mockupLayers.ts`)

The link between a designer's PSD and this editor is a layer-naming convention. Top-level PSD layers whose names start with one of these prefixes become editable (see `LAYER_PREFIX`):

- `mm_clr:` → a **recolorable** layer (solid shape, masked fill)
- `mm_wrp:` and `mm_img:` → an **image-replacement** slot. *These two are treated identically today* — the wrap/fit distinction is reserved but not yet implemented.

Editable layers **must be top-level children** of the PSD (`psd.children`); `extractEditableLayers` does not recurse into groups.

### Non-destructive rendering pipeline (`src/utils/renderer.ts`)

This is the heart of the app and the easiest place to introduce subtle bugs. It depends on two facts holding:

1. **Parse-time snapshot.** `extractEditableLayers` copies each editable layer's canvas into `originalCanvas` once, when the PSD is loaded. This pristine copy is the source of truth — the original pixels are never lost.
2. **Mutable working canvas.** The renderer **mutates `psdLayer.canvas` in place** during each render: `applyColorLayer` / `applyImageArea` rebuild the layer's canvas from `originalCanvas` + the current user value, then the layers are composited onto the main canvas. So `psdLayer.canvas` is a *scratch buffer*, not pristine data — never read it expecting the original pixels.

Recoloring works by drawing the fill color over a copy of the snapshot, then masking it back to the original shape with `globalCompositeOperation = 'source-in'`. Because every render rebuilds from the snapshot, this is idempotent and survives React StrictMode's double-invoked effects.

### Clipping masks (`drawLayer`)

`renderMockup` walks top-level layers sequentially, tracking a `clipTarget`. A normal layer draws directly and becomes the new clip target. A layer with `layer.clipping === true` is composited only where it overlaps the *previous non-clipped* layer (via a temp canvas + `source-in`) and **does not** become a clip target itself — consecutive clipped layers all mask against the same base. If you change layer ordering or clipping handling, re-read this invariant.

### Data flow (`src/components/Editor.tsx`)

`Editor` is a `'use client'` component (canvas + PSD parsing are browser-only) and owns all state: `psd`, `colorLayers`, `imageAreas` (the shape of `MockupState` in `src/types/layer.d.ts`). Every edit is a `setState` call on one of those arrays; a single `useEffect` watches all three and calls `renderMockup(canvasRef.current, ...)`, which fully repaints the canvas. There is no incremental redraw — the model is "mutate state → re-render everything."

The `ag-psd` parse deliberately avoids a merged composite so the individual layer canvases remain available; `psdLayer.canvas` is the object the renderer paints into.

## Conventions

- **Biome**, 2-space indent, **single quotes**, import auto-organized (`assist.actions.source.organizeImports`). Match existing style — don't introduce ESLint/Prettier configs.
- **`@/*` path alias** → `./src/*` (e.g. `@/components/...`, `@/types/layer`). Prefer it over relative imports.
- **Tailwind v4** (CSS-first: `@import "tailwindcss"` in `src/app/globals.css`, PostCSS plugin, no `tailwind.config.*`). Styling is utility classes with `dark:` variants; dark mode is driven by `prefers-color-scheme` in `globals.css` plus `dark:` classes throughout.
- **React Compiler is on** (`reactCompiler: true` in `next.config.ts` + `babel-plugin-react-compiler`). You generally do not need manual `useMemo`/`useCallback`.
- **Next.js 16, App Router.** `src/app/page.tsx` just renders `<Editor />`.
- UI primitives live in `src/components/ui/` (`Icon`, `UploadButton`, `PanelSection`); per-editable-type controls in `src/components/controls/`; add new editable layer kinds there and surface them via `Sidebar`.
