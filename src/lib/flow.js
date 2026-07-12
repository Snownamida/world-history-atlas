// Mode « flux » : chaque polité devient un ruban vertical qui enfle jusqu'à son
// apogée puis se resserre — la largeur évoque la puissance, comme l'affiche-fleuve.
// On réutilise le centre pondéré calculé par la mosaïque pour placer chaque ruban.

import { line, curveBasis } from "d3-shape";
import { civColor } from "../data/meta.js";
import { yearToY } from "./scale.js";
import { SLOT_W } from "./layout.js";

const pathGen = line().x((d) => d[0]).y((d) => d[1]).curve(curveBasis);

function maxWidth(p) {
    const tags = p.tags || [];
    if (tags.includes("empire") || tags.includes("caliphate")) return SLOT_W * 1.05;
    if (tags.includes("culture")) return SLOT_W * 0.55;
    if (tags.includes("city-state") || tags.includes("confederation")) return SLOT_W * 0.7;
    return SLOT_W * 0.85;
}

function profile(t, tp) {
    const tri = t <= tp ? t / (tp || 1e-6) : (1 - t) / (1 - tp || 1e-6);
    return Math.pow(Math.max(0, tri), 0.55);
}

export function buildFlow(layout) {
    const streams = [];
    for (const a of layout.labelAnchors) {
        const { p } = a;
        const cx = layout.centers.get(p.id) ?? a.x + a.w / 2;
        const span = p.end - p.start || 1;
        const mw = maxWidth(p);
        const tp = p.peak != null ? Math.max(0.05, Math.min(0.95, (p.peak - p.start) / span)) : 0.5;
        const y0 = yearToY(p.start);
        const y1 = yearToY(p.end);
        const N = Math.max(6, Math.min(48, Math.round((y1 - y0) / 18)));
        const left = [];
        const right = [];
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const yy = y0 + t * (y1 - y0);
            const half = (mw * (0.12 + 0.88 * profile(t, tp))) / 2;
            left.push([cx - half, yy]);
            right.push([cx + half, yy]);
        }
        streams.push({ p, d: pathGen(left.concat(right.reverse())) + "Z", color: civColor(p.civ) });
    }
    return { streams };
}
