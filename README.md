# PSD Mockup Editor

A browser-based **PSD mockup editor**. Upload a `.psd` file and the layers the designer has *tagged by name* become live-editable — recolor them, or swap in your own images — with the result rendering to an HTML canvas in real time. There is no backend and nothing is uploaded: everything runs client-side, with [`ag-psd`](https://www.npmjs.com/package/ag-psd) handling PSD parsing.

## Features

- **Recolor** tagged layers with a color picker.
- **Swap images** into tagged slots. The replacement is placed at the smart object's original **perspective/angle**, fills the area (cover), and is cropped to its bounds — so it looks like it belongs in the mockup.
- **Reposition & resize** any placed image in a dedicated dialog: drag to pan, slider to zoom.
- **Show/hide** individual layers.
- **Download** the rendered mockup as a PNG.
- **Responsive** UI — controls collapse into a slide-in drawer on small screens.
- **Built-in examples** — open a starter mockup without a PSD of your own.
- Live, non-destructive re-rendering on every edit.

## Designing a PSD for this editor

The link between a PSD and this editor is a layer-naming convention. Top-level layers whose names start with one of these prefixes become editable:

| Prefix      | Editable type                                            |
| ----------- | -------------------------------------------------------- |
| `mm_clr:` | Recolorable layer (solid shape / masked fill)            |
| `mm_wrp:` | Image-replacement slot                                   |
| `mm_img:` | Image-replacement slot                                   |

Notes for designers:

- `mm_wrp:` and `mm_img:` are treated identically (the wrap/fit distinction is reserved).
- Editable layers **must be top-level children** of the document, not nested in groups.
- Image slots should be **smart objects** so the editor can read their perspective/placement and apply it to the replacement image.

## Getting started

Package manager: **pnpm**.

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and upload a `.psd`.

Other scripts:

- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — `biome check`
- `pnpm format` — `biome format --write`

## Built-in examples

A few starter mockups ship in the repo (3D Business Card, Book Cover, T-Shirt) and are reachable without your own PSD, e.g.:

```
http://localhost:3000/examples/business-card
http://localhost:3000/examples/book-cover
http://localhost:3000/examples/t-shirt
```

They're listed in the editor's empty state and also linkable directly. Each maps a slug to a PSD + preview image in `src/data/examples.ts`; add your own by dropping files in `/public` and appending an entry.

## How it works

At parse time each editable layer's pixels are snapshotted once — that pristine snapshot is the source of truth. On every edit the renderer rebuilds each editable layer's canvas from the snapshot plus the current value, then composites all layers onto the main canvas. Edits are therefore non-destructive and idempotent.

Image slots read the smart object's recorded placement (`nonAffineTransform`) as a perspective quad and map the uploaded image into it with a homography. Canvas 2D has no native perspective transform, so the quad is rebuilt from a grid of small affine cells. User zoom/pan is applied in the flat source box and projected through that same transform.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture and the invariants that are easy to break.

## Tech stack

Next.js 16 (App Router) · React · TypeScript · Tailwind v4 · Biome · ag-psd
