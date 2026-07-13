import React, { useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { REGION_LABEL } from "../data/meta.js";
import { WORLD_HEIGHT, axisTicks, formatYear, yearToY, yToYear } from "../lib/scale.js";
import { buildFlow } from "../lib/flow.js";

const AXIS_W = 58;
const HEADER_H = 28;

export default function Timeline({
    layout,
    mode,
    lang,
    t,
    selectedId,
    onSelect,
    hoverYear,
    onHoverYear,
    aliveIds,
    matchIds,
    dimUnmatched,
    events,
    showEvents,
    widthBy,
    widthExp,
    focusReq,
    lineageLinks,
    lineageIds,
    allLinks,
}) {
    const wrapRef = useRef(null);
    const svgRef = useRef(null);
    const viewportRef = useRef(null);
    const zoomRef = useRef(null);
    const [size, setSize] = useState({ w: 900, h: 600 });
    const [tf, setTf] = useState({ k: 0.7, x: AXIS_W, y: HEADER_H });
    const rafRef = useRef(0);

    const { worldWidth } = layout;
    const flow = useMemo(
        () => (mode === "flow" ? buildFlow(layout, widthBy, widthExp) : null),
        [layout, mode, widthBy, widthExp],
    );
    const blockById = useMemo(() => {
        const m = new Map();
        for (const b of layout.labelAnchors) m.set(b.p.id, b);
        return m;
    }, [layout]);

    // Courbes de filiation (dans le viewport, suivent le zoom) : bas du prédécesseur
    // (fin) → haut du successeur (début), même à travers des colonnes éloignées.
    const linkPath = (f, t) => {
        const a = blockById.get(f);
        const b = blockById.get(t);
        if (!a || !b) return null;
        const ax = a.x + a.w / 2;
        const ay = a.y0 + a.h;
        const bx = b.x + b.w / 2;
        const by = b.y0;
        const dy = Math.max(20, Math.abs(by - ay) * 0.5);
        return `M${ax},${ay} C${ax},${ay + dy} ${bx},${by - dy} ${bx},${by}`;
    };
    const linkPaths = useMemo(
        () => (lineageLinks || []).map(([f, t]) => linkPath(f, t)).filter(Boolean),
        [lineageLinks, blockById],
    );
    const allPaths = useMemo(
        () => (allLinks || []).map(([f, t]) => linkPath(f, t)).filter(Boolean),
        [allLinks, blockById],
    );

    // Taille du conteneur (responsive).
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => {
            const { width, height } = e.contentRect;
            setSize({ w: Math.max(320, width), h: Math.max(360, height) });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Installe le zoom/pan d3 une seule fois.
    useEffect(() => {
        const svg = select(svgRef.current);
        const zm = d3zoom()
            .scaleExtent([0.12, 10])
            .on("zoom", (e) => {
                const tr = e.transform;
                if (viewportRef.current)
                    viewportRef.current.setAttribute(
                        "transform",
                        `translate(${tr.x},${tr.y}) scale(${tr.k})`,
                    );
                if (!rafRef.current)
                    rafRef.current = requestAnimationFrame(() => {
                        rafRef.current = 0;
                        setTf({ k: tr.k, x: tr.x, y: tr.y });
                    });
            });
        zoomRef.current = zm;
        svg.call(zm);
        svg.on("dblclick.zoom", null);
        return () => svg.on(".zoom", null);
    }, []);

    // Transform d'ajustement : colonnes ajustées à la largeur, en haut de la frise.
    const fitTransform = () => {
        const avail = size.w - AXIS_W - 10;
        const k = Math.max(0.08, Math.min(1.15, avail / worldWidth));
        const x = AXIS_W + 5 + Math.max(0, (avail - worldWidth * k) / 2);
        return zoomIdentity.translate(x, HEADER_H + 4).scale(k);
    };

    // Vue initiale.
    useEffect(() => {
        if (!zoomRef.current || !svgRef.current) return;
        select(svgRef.current).call(zoomRef.current.transform, fitTransform());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [worldWidth, size.w]);

    const resetView = () => {
        select(svgRef.current).transition().duration(450).call(zoomRef.current.transform, fitTransform());
    };

    // Recentre la vue sur une polité (clic depuis la recherche) — « aller à ».
    useEffect(() => {
        if (!focusReq || !zoomRef.current || !svgRef.current) return;
        const id = String(focusReq).split("|")[0];
        const b = layout.labelAnchors.find((a) => a.p.id === id);
        if (!b) return;
        const k = 1.4;
        const bx = b.x + b.w / 2;
        const by = b.y0 + b.h / 2;
        const cxs = AXIS_W + (size.w - AXIS_W) / 2;
        const cys = HEADER_H + (size.h - HEADER_H) / 2;
        const tr = zoomIdentity.translate(cxs - k * bx, cys - k * by).scale(k);
        select(svgRef.current).transition().duration(600).call(zoomRef.current.transform, tr);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusReq]);

    // Coordonnées écran d'un point « monde ».
    const sx = (wx) => tf.k * wx + tf.x;
    const sy = (wy) => tf.k * wy + tf.y;

    // Année sous le curseur.
    const handleMove = (e) => {
        const rect = svgRef.current.getBoundingClientRect();
        const wy = (e.clientY - rect.top - tf.y) / tf.k;
        onHoverYear(yToYear(wy));
    };

    // Graduations visibles.
    const ticks = axisTicks();

    // Étiquettes de blocs : seulement celles assez grandes à l'écran (zoom sémantique).
    const labels = [];
    if (mode === "mosaic") {
        for (const b of layout.labelAnchors) {
            const screenH = b.h * tf.k;
            const screenW = b.w * tf.k;
            if (screenH < 13 || screenW < 20) continue;
            const bx = sx(b.x);
            const by = sy(b.y0);
            if (bx > size.w || bx + screenW < AXIS_W || by > size.h || by + screenH < HEADER_H)
                continue; // culling
            labels.push({ b, bx, by, screenW, screenH });
        }
    }

    const cursorY = hoverYear != null ? sy(yearToY(hoverYear)) : null;

    return (
        <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
            <svg
                ref={svgRef}
                className="timeline-svg h-full w-full"
                width={size.w}
                height={size.h}
                onMouseMove={handleMove}
                onMouseLeave={() => onHoverYear(null)}
            >
                {/* Fond : couloir teinté par civilisation, sur sa durée réelle */}
                <g ref={viewportRef}>
                    <rect x={0} y={0} width={worldWidth} height={WORLD_HEIGHT} fill="transparent" />
                    {(layout.civCols || []).map((c, i) => (
                        <rect
                            key={c.region + "-" + c.civ + "-" + i}
                            x={c.x0}
                            y={c.yTop}
                            width={c.x1 - c.x0}
                            height={Math.max(0, c.yBot - c.yTop)}
                            fill={c.color}
                            fillOpacity={0.09}
                        />
                    ))}

                    {mode === "mosaic" &&
                        layout.blocks.map((b, i) => {
                            const dim = dimUnmatched && matchIds && !matchIds.has(b.p.id);
                            const alive = aliveIds && aliveIds.has(b.p.id);
                            const sel = selectedId === b.p.id;
                            const lin = !sel && lineageIds && lineageIds.has(b.p.id);
                            return (
                                <path
                                    key={i}
                                    d={b.d}
                                    fill={b.color}
                                    fillOpacity={dim ? 0.14 : alive || lin ? 1 : 0.9}
                                    stroke={sel ? "#111" : lin ? "#8a3b12" : alive ? "#fff" : "#ffffff55"}
                                    strokeWidth={sel ? 2.2 : lin ? 2 : alive ? 1.4 : 0.6}
                                    vectorEffect="non-scaling-stroke"
                                    style={{ cursor: "pointer" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(b.p.id);
                                    }}
                                />
                            );
                        })}

                    {mode === "flow" &&
                        flow &&
                        flow.streams.map((s) => {
                            const dim = dimUnmatched && matchIds && !matchIds.has(s.p.id);
                            const sel = selectedId === s.p.id;
                            return (
                                <path
                                    key={s.p.id}
                                    d={s.d}
                                    fill={s.color}
                                    fillOpacity={dim ? 0.12 : sel ? 1 : 0.82}
                                    stroke={sel ? "#111" : "#ffffff66"}
                                    strokeWidth={sel ? 2 : 0.6}
                                    vectorEffect="non-scaling-stroke"
                                    style={{ cursor: "pointer" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(s.p.id);
                                    }}
                                />
                            );
                        })}

                    {/* Toutes les filiations, discrètes (héritage / évolution) */}
                    {allPaths.map((d, i) => (
                        <path
                            key={"al" + i}
                            d={d}
                            fill="none"
                            stroke="#8a5a2b"
                            strokeWidth={1}
                            strokeOpacity={0.22}
                            vectorEffect="non-scaling-stroke"
                            style={{ pointerEvents: "none" }}
                        />
                    ))}

                    {/* Filiation de la polité sélectionnée, mise en avant */}
                    {linkPaths.map((d, i) => (
                        <path
                            key={"lk" + i}
                            d={d}
                            fill="none"
                            stroke="#8a3b12"
                            strokeWidth={2}
                            strokeOpacity={0.9}
                            strokeDasharray="1 5"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                            style={{ pointerEvents: "none" }}
                        />
                    ))}
                </g>

                {/* Étiquettes de blocs, taille constante (hors viewport) */}
                <g style={{ pointerEvents: "none" }}>
                    {labels.map(({ b, bx, by, screenW, screenH }) => {
                        const name = b.p.name[lang] || b.p.name.en || b.p.name.zh;
                        const maxChars = Math.max(1, Math.floor(screenW / 8));
                        const txt = name.length > maxChars ? name.slice(0, maxChars) + "…" : name;
                        return (
                            <text
                                key={b.p.id}
                                x={bx + screenW / 2}
                                y={by + Math.min(screenH / 2 + 4, 16)}
                                textAnchor="middle"
                                fontSize={Math.min(12, Math.max(9, screenW / 4))}
                                fill="#1a1a1a"
                                style={{ fontWeight: 600 }}
                            >
                                {txt}
                            </text>
                        );
                    })}
                </g>

                {/* Curseur temporel */}
                {cursorY != null && cursorY > HEADER_H && cursorY < size.h && (
                    <g style={{ pointerEvents: "none" }}>
                        <line
                            x1={AXIS_W}
                            x2={size.w}
                            y1={cursorY}
                            y2={cursorY}
                            stroke="#c0392b"
                            strokeWidth={1}
                            strokeDasharray="4 3"
                        />
                    </g>
                )}

                {/* Jalons de l'humanité (overlay, halo blanc pour la lisibilité) */}
                {showEvents && (
                    <g style={{ pointerEvents: "none" }}>
                        {(() => {
                            let lastY = -999;
                            return events.map((ev) => {
                                const yy = sy(yearToY(ev.year));
                                if (yy < HEADER_H + 2 || yy > size.h - 2) return null;
                                const showLabel = yy - lastY >= 13;
                                if (showLabel) lastY = yy;
                                return (
                                    <g key={ev.year}>
                                        <circle cx={AXIS_W + 5} cy={yy} r={2.6} fill="#7a3b12" stroke="#fff" strokeWidth={0.8} />
                                        {showLabel && (
                                            <text
                                                x={AXIS_W + 11}
                                                y={yy + 3}
                                                fontSize={9.5}
                                                fill="#5b4632"
                                                style={{ paintOrder: "stroke", stroke: "#fbf7ee", strokeWidth: 3, fontWeight: 600 }}
                                            >
                                                {ev[lang] || ev.en}
                                            </text>
                                        )}
                                    </g>
                                );
                            });
                        })()}
                    </g>
                )}

                {/* Axe des années (bande gauche fixe) */}
                <g>
                    <rect x={0} y={0} width={AXIS_W} height={size.h} fill="var(--paper)" />
                    <line x1={AXIS_W} x2={AXIS_W} y1={0} y2={size.h} stroke="#00000018" />
                    {ticks.map((yr) => {
                        const yy = sy(yearToY(yr));
                        if (yy < HEADER_H - 4 || yy > size.h) return null;
                        return (
                            <g key={yr}>
                                <line x1={AXIS_W - 5} x2={AXIS_W} y1={yy} y2={yy} stroke="#00000030" />
                                <text
                                    x={AXIS_W - 7}
                                    y={yy + 3}
                                    textAnchor="end"
                                    fontSize={9.5}
                                    fill="#7a7266"
                                >
                                    {formatYear(yr, lang)}
                                </text>
                            </g>
                        );
                    })}
                    {cursorY != null && cursorY > HEADER_H && cursorY < size.h && (
                        <g>
                            <rect x={0} y={cursorY - 8} width={AXIS_W} height={16} fill="#c0392b" />
                            <text x={AXIS_W / 2} y={cursorY + 3.5} textAnchor="middle" fontSize={10} fill="#fff" style={{ fontWeight: 700 }}>
                                {formatYear(hoverYear, lang)}
                            </text>
                        </g>
                    )}
                </g>

                {/* En-tête des régions (bande haute fixe) */}
                <g>
                    <rect x={0} y={0} width={size.w} height={HEADER_H} fill="var(--paper)" />
                    <line x1={0} x2={size.w} y1={HEADER_H} y2={HEADER_H} stroke="#00000018" />
                    {(() => {
                        let lastRight = -Infinity;
                        return layout.bands.map((band) => {
                            const cx = sx(band.cx);
                            if (cx < AXIS_W - 20 || cx > size.w + 20) return null;
                            const label = REGION_LABEL[band.key][lang];
                            const halfW = label.length * 4 + 8;
                            if (cx - halfW < lastRight) return null; // éviter le chevauchement
                            lastRight = cx + halfW;
                            return (
                                <text
                                    key={band.key}
                                    x={cx}
                                    y={HEADER_H - 9}
                                    textAnchor="middle"
                                    fontSize={13}
                                    fill="#3a352c"
                                    style={{ fontWeight: 700 }}
                                >
                                    {label}
                                </text>
                            );
                        });
                    })()}
                </g>
            </svg>

            <button
                onClick={resetView}
                className="absolute bottom-3 right-3 rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600 shadow ring-1 ring-black/10 hover:bg-white"
            >
                ⤢ {t.reset}
            </button>
        </div>
    );
}
