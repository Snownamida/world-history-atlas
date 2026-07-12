// Agrège tous les fichiers régionaux src/data/regions/*.json en un seul jeu.
// import.meta.glob (eager) ramasse ce qui existe : pas d'erreur si une région manque.

import { REGIONS } from "./meta.js";

const modules = import.meta.glob("./regions/*.json", { eager: true });

const REGION_KEYS = new Set(REGIONS.map((r) => r.key));

function normalize(raw) {
    const out = [];
    const seen = new Set();
    for (const p of raw) {
        if (!p || !p.id || seen.has(p.id)) continue;
        if (typeof p.start !== "number" || typeof p.end !== "number") continue;
        if (!REGION_KEYS.has(p.region)) continue;
        if (p.end < p.start) [p.start, p.end] = [p.end, p.start];
        seen.add(p.id);
        out.push(p);
    }
    return out;
}

const merged = [];
for (const mod of Object.values(modules)) {
    const arr = mod.default || mod;
    if (Array.isArray(arr)) merged.push(...arr);
}

export const POLITIES = normalize(merged);

// Bornes réelles présentes dans les données (utile pour les stats / l'UI).
export const DATA_EXTENT = POLITIES.reduce(
    (acc, p) => ({ min: Math.min(acc.min, p.start), max: Math.max(acc.max, p.end) }),
    { min: Infinity, max: -Infinity },
);
