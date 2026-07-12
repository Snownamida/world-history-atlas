// Mode « flux » : chaque polité devient un ruban vertical qui enfle jusqu'à son
// apogée puis se resserre. La largeur max vient du pilote choisi (superficie /
// population, racine carrée normalisée) ou, en mode « équilibré », du type.

import { line, curveBasis } from "d3-shape";
import { civColor } from "../data/meta.js";
import { yearToY } from "./scale.js";
import { SLOT_W, driverValue } from "./layout.js";

const pathGen = line().x((d) => d[0]).y((d) => d[1]).curve(curveBasis);

// Fourchette large : les mastodontes (Chine, Rome, Empire britannique) deviennent
// de gros fleuves, les petits États de minces filets (rapport ~10:1).
const MINW = 8;
const MAXW = SLOT_W * 3.6;

// Largeur par type (mode « équilibré »).
function widthByType(p) {
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

export function buildFlow(layout, widthBy = "even") {
    // Médiane de la valeur (référence) pour le mode superficie/population.
    let ref = 1;
    if (widthBy !== "even") {
        const vals = layout.labelAnchors
            .map((a) => driverValue(a.p, widthBy))
            .filter((v) => v != null)
            .sort((a, b) => a - b);
        if (vals.length) ref = vals[vals.length >> 1] || 1;
    }

    const maxWidth = (p) => {
        if (widthBy === "even") return widthByType(p);
        const v = driverValue(p, widthBy);
        if (v == null) return MINW;
        return Math.max(MINW, Math.min(MAXW, SLOT_W * Math.pow(v / ref, 0.42)));
    };

    const streams = [];
    for (const a of layout.labelAnchors) {
        const { p } = a;
        const cx = layout.centers.get(p.id) ?? a.x + a.w / 2;
        const lifespan = p.end - p.start || 1;
        const mw = maxWidth(p);
        const tp = p.peak != null ? Math.max(0.05, Math.min(0.95, (p.peak - p.start) / lifespan)) : 0.5;
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
        streams.push({ p, d: pathGen(left.concat(right.reverse())) + "Z", color: civColor(p.civ), mw });
    }
    // Les gros fleuves d'abord (dessous), les filets par-dessus : rien n'est masqué.
    streams.sort((a, b) => b.mw - a.mw);
    return { streams };
}
