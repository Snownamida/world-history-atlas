// Agrège tous les fichiers régionaux src/data/regions/*.json en un seul jeu,
// et y greffe les estimations superficie/population de src/data/enrich/*.json.
// import.meta.glob (eager) ramasse ce qui existe : pas d'erreur si un fichier manque.

import { REGIONS } from "./meta.js";

const regionModules = import.meta.glob("./regions/*.json", { eager: true });
const enrichModules = import.meta.glob("./enrich/*.json", { eager: true });

const REGION_KEYS = new Set(REGIONS.map((r) => r.key));

// id -> { area, pop } (estimations de pointe ; null si non pertinent).
const ENRICH = new Map();
for (const mod of Object.values(enrichModules)) {
    const arr = mod.default || mod;
    if (!Array.isArray(arr)) continue;
    for (const e of arr) {
        if (e && e.id) ENRICH.set(e.id, { area: e.area ?? null, pop: e.pop ?? null });
    }
}

function normalize(raw) {
    const out = [];
    const seen = new Set();
    for (const p of raw) {
        if (!p || !p.id || seen.has(p.id)) continue;
        if (typeof p.start !== "number" || typeof p.end !== "number") continue;
        if (!REGION_KEYS.has(p.region)) continue;
        if (p.end < p.start) [p.start, p.end] = [p.end, p.start];
        const en = ENRICH.get(p.id);
        p.area = en && typeof en.area === "number" ? en.area : null;
        p.pop = en && typeof en.pop === "number" ? en.pop : null;
        seen.add(p.id);
        out.push(p);
    }
    return out;
}

const merged = [];
for (const mod of Object.values(regionModules)) {
    const arr = mod.default || mod;
    if (Array.isArray(arr)) merged.push(...arr);
}

export const POLITIES = normalize(merged);

export const DATA_EXTENT = POLITIES.reduce(
    (acc, p) => ({ min: Math.min(acc.min, p.start), max: Math.max(acc.max, p.end) }),
    { min: Infinity, max: -Infinity },
);
