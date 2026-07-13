// Disposition « mosaïque » façon affiche 1 : chaque **civilisation** a sa propre
// colonne (couloir), et une polité y occupe UNE voie fixe pendant toute sa vie —
// donc les dynasties d'une même civ s'enchaînent verticalement sans jamais sauter
// de gauche à droite. Les régions (continents) ne sont qu'un en-tête de second
// niveau regroupant les colonnes-civ. Hauteur ∝ durée réelle.

import { REGIONS, civColor } from "../data/meta.js";
import { yearToY } from "./scale.js";

export const SLOT_W = 28;
export const CIV_GAP = 1;
export const REGION_GAP = 14;
const MIN_H = 2;

// Échelle d'affichage : le plus grand du monde = MAXSIZE voies. Tout le reste au
// prorata (v/vMax) élevé à l'exposant réglable `exp` (1 = strictement linéaire /
// ratios réels ; plus bas = compression douce pour que les petits restent visibles).
// Un plancher minuscule évite la largeur nulle. Utilisé par la mosaïque ET le flux.
export const MAXSIZE = 4.6;
export function widthMultiplier(v, vMax, exp) {
    if (!v) return 0.35;
    return Math.max(0.35, MAXSIZE * Math.pow(v / vMax, exp));
}

// Valeur de « poids » d'une polité selon le pilote de largeur choisi.
export function driverValue(p, widthBy) {
    if (widthBy === "area") return typeof p.area === "number" && p.area > 0 ? p.area : null;
    if (widthBy === "pop") return typeof p.pop === "number" && p.pop > 0 ? p.pop : null;
    return null; // "even"
}

// Tolérance de chevauchement : un changement de dynastie se chevauche souvent de
// quelques années (Ming 1368–1644 / Qing 1636–1912…). On autorise ce petit
// recouvrement à partager la voie, pour que le fil principal reste une seule
// colonne continue au lieu de zigzaguer.
const OVERLAP_TOL = 30;

// Empilage d'intervalles, guidé par la filiation : une polité hérite de préférence
// de la VOIE de son prédécesseur (Espagne reprend la voie de l'Empire espagnol),
// sinon la voie libre la plus récemment libérée (continuité du fil principal).
function packLanes(items, preds) {
    const laneEnds = [];
    const laneOf = new Map();
    const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
    for (const p of sorted) {
        let lane = -1;
        const pr = preds.get(p.id);
        if (pr) {
            for (const pid of pr) {
                if (!laneOf.has(pid)) continue;
                const L = laneOf.get(pid);
                if (laneEnds[L] <= p.start + OVERLAP_TOL && (lane === -1 || laneEnds[L] > laneEnds[lane])) lane = L;
            }
        }
        if (lane === -1) {
            let bestEnd = -Infinity;
            for (let L = 0; L < laneEnds.length; L++) {
                if (laneEnds[L] <= p.start + OVERLAP_TOL && laneEnds[L] > bestEnd) {
                    bestEnd = laneEnds[L];
                    lane = L;
                }
            }
        }
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(p.end);
        } else {
            laneEnds[lane] = Math.max(laneEnds[lane], p.end);
        }
        p._lane = lane;
        laneOf.set(p.id, lane);
    }
    return Math.max(1, laneEnds.length);
}

export function computeMosaic(polities, widthBy = "even", preds = new Map(), widthExp = 0.63) {
    const byRegion = new Map(REGIONS.map((r) => [r.key, []]));
    for (const p of polities) if (byRegion.has(p.region)) byRegion.get(p.region).push(p);

    // Mosaïque : ce n'est pas le bloc mais toute la COLONNE-civ qui s'élargit selon
    // l'ordre de grandeur de la civilisation — Chine / Rome / Empire britannique =
    // large couloir, petit État = mince (rapport ~5:1), tout en gardant la continuité
    // (chaque polité garde sa voie à vie). Une nuance intra-colonne élargit un peu les
    // plus vastes dynasties d'une même civ.
    // Chaque bloc a la largeur de SA PROPRE taille (superficie/population) : la Chine
    // des Xia est mince, celle des Qing très large — la civilisation « grandit » à
    // l'écran. Blocs alignés à GAUCHE => colonne vertébrale continue (l'héritage), bord
    // droit en escalier qui montre la puissance. Le blanc à droite d'un petit État est réel.
    // Largeur du bloc : voir widthMultiplier. Exposant `widthExp` réglable par curseur.
    // Cohérent pour toutes les régions (même vMax global, même formule).
    const pv = (p) => (widthBy === "pop" ? p.pop || 0 : p.area || 0);
    let vMax = 1;
    for (const p of polities) {
        const v = pv(p);
        if (v > vMax) vMax = v;
    }
    const blockSize = (p) => (widthBy === "even" ? 1 : widthMultiplier(pv(p), vMax, widthExp));

    const blocks = [];
    const labelAnchors = [];
    const centers = new Map();
    const bands = [];
    const civCols = [];
    let cursor = 0;

    for (const region of REGIONS) {
        const items = byRegion.get(region.key);
        if (!items.length) {
            bands.push({ key: region.key, x0: cursor, x1: cursor + SLOT_W, cx: cursor + SLOT_W / 2 });
            cursor += SLOT_W + REGION_GAP;
            continue;
        }

        // Regroupe par civ ; ordonne les civ par leur plus ancienne polité.
        const civMap = new Map();
        for (const p of items) {
            if (!civMap.has(p.civ)) civMap.set(p.civ, []);
            civMap.get(p.civ).push(p);
        }
        const civs = [...civMap.entries()].sort(
            (a, b) => Math.min(...a[1].map((p) => p.start)) - Math.min(...b[1].map((p) => p.start)),
        );

        const regionX0 = cursor;
        for (const [civ, list] of civs) {
            const laneCount = packLanes(list, preds);
            const civX0 = cursor;
            const color = civColor(civ);
            // largeur réservée d'une voie = son plus gros bloc (pour ne pas chevaucher)
            const laneW = new Array(laneCount).fill(SLOT_W * (widthBy === "even" ? 1 : 0.32));
            for (const p of list) laneW[p._lane] = Math.max(laneW[p._lane], SLOT_W * blockSize(p));
            const laneOff = [];
            let acc = 0;
            for (let L = 0; L < laneCount; L++) {
                laneOff[L] = acc;
                acc += laneW[L];
            }
            const civW = acc;
            for (const p of list) {
                const w = SLOT_W * blockSize(p);
                const laneX = civX0 + laneOff[p._lane];
                const y0 = yearToY(p.start);
                const h = Math.max(MIN_H, yearToY(p.end) - y0);
                const b = { p, region: region.key, color, x: laneX, w, y0, h };
                blocks.push(b);
                labelAnchors.push(b);
                centers.set(p.id, laneX + laneW[p._lane] / 2);
            }
            const cStart = Math.min(...list.map((p) => p.start));
            const cEnd = Math.max(...list.map((p) => p.end));
            civCols.push({
                civ,
                region: region.key,
                x0: civX0,
                x1: civX0 + civW,
                color,
                yTop: yearToY(cStart),
                yBot: yearToY(cEnd),
            });
            cursor = civX0 + civW + CIV_GAP;
        }

        const regionX1 = cursor - CIV_GAP;
        bands.push({ key: region.key, x0: regionX0, x1: regionX1, cx: (regionX0 + regionX1) / 2 });
        cursor = regionX1 + REGION_GAP;
    }

    return { blocks, labelAnchors, centers, bands, civCols, worldWidth: Math.max(1, cursor - REGION_GAP) };
}

export function politiesAliveAt(polities, year) {
    return polities.filter((p) => p.start <= year && year <= p.end);
}
