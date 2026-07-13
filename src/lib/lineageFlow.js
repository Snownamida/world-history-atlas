// Mode « flux de filiation » (blitz généalogique / Sankey) : la géographie cède la
// place à la lignée. Chaque polité descend physiquement de son prédécesseur ; une
// scission se ramifie, une fusion converge. x = position dans l'arbre de filiation,
// y = temps, largeur = superficie/population (profil début→pic→fin, comme la mosaïque).

import { civColor } from "../data/meta.js";
import { yearToY, WORLD_HEIGHT } from "./scale.js";
import { SLOT_W, widthMultiplier } from "./layout.js";

const GAP = 8;
const KIND_RANK = { continuation: 0, succession: 1, split: 2, conquest: 3 };

export function buildLineageFlow(polities, succession, widthBy = "even", widthExp = 0.63) {
    const byId = new Map(polities.map((p) => [p.id, p]));
    const present = (id) => byId.has(id);

    // Prédécesseurs (avec type) présents dans le jeu filtré.
    const predsOf = new Map();
    for (const e of succession) {
        if (!present(e.from) || !present(e.to)) continue;
        if (!predsOf.has(e.to)) predsOf.set(e.to, []);
        predsOf.get(e.to).push(e);
    }

    // Parent principal : type le plus « continu », puis fin la plus proche du début.
    const parentOf = new Map();
    for (const p of polities) {
        const es = predsOf.get(p.id);
        if (!es || !es.length) continue;
        let best = null;
        for (const e of es) {
            const from = byId.get(e.from);
            const rank = KIND_RANK[e.kind] ?? 4;
            const cand = { id: e.from, rank, end: from.end };
            if (
                !best ||
                cand.rank < best.rank ||
                (cand.rank === best.rank && cand.end > best.end)
            )
                best = cand;
        }
        if (best) parentOf.set(p.id, best.id);
    }

    // Enfants + racines.
    const children = new Map();
    for (const [c, par] of parentOf) {
        if (!children.has(par)) children.set(par, []);
        children.get(par).push(c);
    }
    for (const arr of children.values())
        arr.sort((a, b) => byId.get(a).start - byId.get(b).start);
    const roots = polities
        .filter((p) => !parentOf.has(p.id))
        .sort((a, b) => a.start - b.start);

    // Largeur (multiple de SLOT_W) par valeur.
    const pv = (p) => (widthBy === "pop" ? p.pop || 0 : p.area || 0);
    const vS = (p) => (widthBy === "pop" ? p.popStart : p.areaStart);
    const vE = (p) => (widthBy === "pop" ? p.popEnd : p.areaEnd);
    let vMax = 1;
    for (const p of polities) if (pv(p) > vMax) vMax = pv(p);
    const wm = (v) => SLOT_W * widthMultiplier(v ?? null, vMax, widthExp);
    const prof = (p) => {
        if (widthBy === "even") return { s: SLOT_W, k: SLOT_W, e: SLOT_W, max: SLOT_W };
        const s = wm(vS(p) ?? pv(p));
        const k = wm(pv(p));
        const e = wm(vE(p) ?? pv(p));
        return { s, k, e, max: Math.max(s, k, e) };
    };
    const profById = new Map(polities.map((p) => [p.id, prof(p)]));

    // Affectation x façon arbre tidy : feuilles espacées selon leur largeur, nœuds
    // internes centrés sur leurs enfants.
    const x = new Map();
    const visited = new Set();
    let cursor = GAP;
    function assign(id) {
        if (visited.has(id)) return;
        visited.add(id);
        const kids = children.get(id) || [];
        if (!kids.length) {
            const w = profById.get(id).max;
            cursor += w / 2;
            x.set(id, cursor);
            cursor += w / 2 + GAP;
            return;
        }
        for (const k of kids) assign(k);
        const xs = kids.map((k) => x.get(k)).filter((v) => v != null);
        x.set(id, xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : cursor);
    }
    for (const r of roots) assign(r.id);
    // Sécurité : tout nœud non atteint (cycle improbable) reçoit une piste.
    for (const p of polities)
        if (!x.has(p.id)) {
            x.set(p.id, cursor);
            cursor += profById.get(p.id).max + GAP;
        }

    // Nœuds = rubans symétriques (profil début→pic→fin).
    const blocks = [];
    const labelAnchors = [];
    const centers = new Map();
    for (const p of polities) {
        const cx = x.get(p.id);
        const pr = profById.get(p.id);
        const yTop = yearToY(p.start);
        const yBot = Math.max(yTop + 2, yearToY(p.end));
        const pk =
            typeof p.peak === "number" && p.peak > p.start && p.peak < p.end
                ? p.peak
                : (p.start + p.end) / 2;
        const yPk = Math.min(yBot, Math.max(yTop, yearToY(pk)));
        const R = (w) => (cx + w / 2).toFixed(1);
        const L = (w) => (cx - w / 2).toFixed(1);
        const d =
            `M${R(pr.s)},${yTop} L${R(pr.k)},${yPk.toFixed(1)} L${R(pr.e)},${yBot} ` +
            `L${L(pr.e)},${yBot} L${L(pr.k)},${yPk.toFixed(1)} L${L(pr.s)},${yTop} Z`;
        const b = {
            p,
            region: p.region,
            color: civColor(p.civ),
            x: cx - pr.max / 2,
            w: pr.max,
            y0: yTop,
            h: yBot - yTop,
            d,
        };
        blocks.push(b);
        labelAnchors.push(b);
        centers.set(p.id, cx);
    }

    // Liens = bandes remplies du bas du parent vers le haut de l'enfant.
    const links = [];
    for (const [c, par] of parentOf) {
        const cP = x.get(par);
        const cC = x.get(c);
        if (cP == null || cC == null) continue;
        const parP = byId.get(par);
        const chP = byId.get(c);
        const yP = yearToY(parP.end);
        const yC = yearToY(chP.start);
        const w = Math.min(profById.get(c).s, profById.get(par).e) || 4;
        const my = (yP + yC) / 2;
        const d =
            `M${(cP - w / 2).toFixed(1)},${yP.toFixed(1)} ` +
            `C${(cP - w / 2).toFixed(1)},${my.toFixed(1)} ${(cC - w / 2).toFixed(1)},${my.toFixed(1)} ${(cC - w / 2).toFixed(1)},${yC.toFixed(1)} ` +
            `L${(cC + w / 2).toFixed(1)},${yC.toFixed(1)} ` +
            `C${(cC + w / 2).toFixed(1)},${my.toFixed(1)} ${(cP + w / 2).toFixed(1)},${my.toFixed(1)} ${(cP + w / 2).toFixed(1)},${yP.toFixed(1)} Z`;
        links.push({ d, color: civColor(chP.civ) });
    }

    return {
        blocks,
        labelAnchors,
        centers,
        links,
        bands: [],
        civCols: [],
        worldWidth: Math.max(1, cursor),
        worldHeight: WORLD_HEIGHT,
    };
}
