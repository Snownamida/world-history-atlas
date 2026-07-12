# 世界历史长卷 · World History Atlas

An interactive, trilingual (中/English/Français) **5000-year world-history timeline** that you can zoom, search, slice by year, and cross-reference on a world map. It fuses the two classic history-poster traditions — the **precise mosaic** (every polity scaled to its real duration) and the **organic flow** (empires swelling and fading like rivers) — into one explorable web app, and adds what paper never could: zoom, search, a draggable time-cursor, and a linked map.

**Live:** https://history.snownamida.top · **中** `/` · **EN** `/en/` · **FR** `/fr/`

## Features

- **Dual view modes** — *Mosaic* fully tiles each region column (a partition where co-existing polities share the width); *Flow* renders each polity as a swelling ribbon whose width evokes power.
- **Timeline ↔ Map linkage** — hover any year and the world map lights up **every polity alive that year** at its real location; click a block to fly to it and read its details.
- **Semantic zoom** — labels appear and grow as blocks get bigger on screen; wheel to zoom, drag to pan, pinch on mobile.
- **Search · region filter · milestones** — jump to any dynasty; toggle regions; overlay humanity's landmark events on the time axis.
- **304 polities** across 7 macro-regions, from Sumer and Caral to the present, each with a trilingual name, one-line description and map coordinates.
- **Fully self-contained** — the world map is bundled Natural Earth GeoJSON rendered with `d3-geo`; no external tiles, no API keys, works offline.

## Stack

Vite · React 18 · Tailwind CSS v4 · D3 (`d3-geo`, `d3-scale`, `d3-zoom`, `d3-shape`, `d3-selection`) · `topojson-client`. Path-based i18n (`/`, `/en/`, `/fr/`) with per-page localized `<head>` + hreflang for SEO.

## Develop

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # -> dist/  (static, deploy anywhere)
npm run preview
```

## Data model

Each polity lives in `src/data/regions/<region>.json`:

```json
{
  "id": "han-dynasty", "region": "east-asia", "civ": "china",
  "start": -206, "end": 220,
  "name": { "zh": "汉朝", "en": "Han Dynasty", "fr": "Dynastie Han" },
  "desc": { "zh": "…", "en": "…", "fr": "…" },
  "lat": 34.3, "lng": 108.9, "tags": ["empire", "dynasty"], "peak": 100
}
```

`start`/`end` are signed years (BCE negative, no year 0). Same `civ` ⇒ same colour. Files are merged and validated at build time (`src/data/index.js`).

## Credits

World map: [Natural Earth](https://www.naturalearthdata.com/) (public domain), via `world-atlas`. Inspired by classic world-history timeline posters. Dates are standard scholarly approximations, for educational use. Made by [Snownamida](https://github.com/Snownamida).
