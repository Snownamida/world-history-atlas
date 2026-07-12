// Disposition « mosaïque » façon affiche : chaque colonne-région est entièrement
// pavée. À un instant donné, les polités vivantes se partagent la largeur ; une
// polité seule occupe toute la colonne, deux se la partagent, etc. La hauteur
// reste ∝ durée réelle — l'invariant sacré des deux affiches.

import { REGIONS, civColor } from "../data/meta.js";
import { yearToY, DOMAIN_START, DOMAIN_END } from "./scale.js";

export const SLOT_W = 48;
export const REGION_GAP = 22;
const MIN_H = 2;

// Frontières temporelles (débuts + fins) écrêtées au domaine visible.
function boundaries(items) {
    const set = new Set();
    for (const p of items) {
        set.add(Math.max(DOMAIN_START, p.start));
        set.add(Math.min(DOMAIN_END, p.end));
    }
    return [...set].sort((a, b) => a - b);
}

// Fusionne les rectangles verticalement adjacents d'une même polité (même x,w).
function mergeRects(rects) {
    rects.sort((a, b) => a.y0 - b.y0);
    const out = [];
    for (const r of rects) {
        const last = out[out.length - 1];
        if (last && Math.abs(last.x - r.x) < 0.5 && Math.abs(last.w - r.w) < 0.5 && Math.abs(last.y0 + last.h - r.y0) < 0.5) {
            last.h = r.y0 + r.h - last.y0;
        } else {
            out.push({ ...r });
        }
    }
    return out;
}

export function computeMosaic(polities) {
    const byRegion = new Map(REGIONS.map((r) => [r.key, []]));
    for (const p of polities) if (byRegion.has(p.region)) byRegion.get(p.region).push(p);

    const blocks = [];
    const labelAnchors = [];
    const centers = new Map(); // id -> x central pondéré (pour le mode flux)
    const bands = [];
    let cursor = 0;

    for (const region of REGIONS) {
        const items = byRegion.get(region.key);
        if (!items.length) {
            bands.push({ key: region.key, x0: cursor, x1: cursor + SLOT_W, cx: cursor + SLOT_W / 2 });
            cursor += SLOT_W + REGION_GAP;
            continue;
        }
        const bnds = boundaries(items);

        // Segments + concurrence max (pour dimensionner la largeur de colonne).
        const segments = [];
        let maxC = 1;
        for (let i = 0; i < bnds.length - 1; i++) {
            const y0 = bnds[i];
            const y1 = bnds[i + 1];
            if (y1 <= y0) continue;
            const alive = items
                .filter((p) => p.start <= y0 && p.end >= y1)
                .sort((a, b) => a.start - b.start || (a.id < b.id ? -1 : 1));
            if (!alive.length) continue;
            maxC = Math.max(maxC, alive.length);
            segments.push({ y0, y1, alive });
        }
        const W = maxC * SLOT_W;
        const x0 = cursor;

        // Pavage + accumulation des rects par polité.
        const perPolity = new Map();
        const weight = new Map(); // id -> {sumcx, sumw}
        for (const seg of segments) {
            const n = seg.alive.length;
            const slotW = W / n;
            const yA = yearToY(seg.y0);
            const yB = yearToY(seg.y1);
            const h = Math.max(MIN_H, yB - yA);
            seg.alive.forEach((p, idx) => {
                const x = x0 + idx * slotW;
                if (!perPolity.has(p.id)) perPolity.set(p.id, { p, rects: [] });
                perPolity.get(p.id).rects.push({ x, w: slotW, y0: yA, h });
                const wgt = weight.get(p.id) || { sx: 0, sw: 0 };
                wgt.sx += (x + slotW / 2) * h;
                wgt.sw += h;
                weight.set(p.id, wgt);
            });
        }

        for (const { p, rects } of perPolity.values()) {
            const merged = mergeRects(rects);
            const color = civColor(p.civ);
            let best = merged[0];
            for (const r of merged) if (r.w * r.h > best.w * best.h) best = r;
            for (const r of merged) blocks.push({ p, region: region.key, color, ...r });
            labelAnchors.push({ p, region: region.key, color, ...best });
            const wgt = weight.get(p.id);
            centers.set(p.id, wgt ? wgt.sx / wgt.sw : x0 + W / 2);
        }

        bands.push({ key: region.key, x0, x1: x0 + W, cx: x0 + W / 2, maxC });
        cursor = x0 + W + REGION_GAP;
    }

    return { blocks, labelAnchors, centers, bands, worldWidth: Math.max(1, cursor - REGION_GAP) };
}

export function politiesAliveAt(polities, year) {
    return polities.filter((p) => p.start <= year && year <= p.end);
}
