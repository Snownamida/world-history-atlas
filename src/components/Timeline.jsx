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
        () => (mode === "flow" ? buildFlow(layout, widthBy) : null),
        [layout, mode, widthBy],
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
                            return (
                                <rect
                                    key={i}
                                    x={b.x}
                                    y={b.y0}
                                    width={b.w}
                                    height={b.h}
                                    rx={1.5}
                                    fill={b.color}
                                    fillOpacity={dim ? 0.14 : alive ? 1 : 0.9}
                                    stroke={sel ? "#111" : alive ? "#fff" : "#ffffff55"}
                                    strokeWidth={sel ? 2.2 : alive ? 1.4 : 0.6}
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
                    {layout.bands.map((band) => {
                        const cx = sx(band.cx);
                        if (cx < AXIS_W - 20 || cx > size.w + 20) return null;
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
                                {REGION_LABEL[band.key][lang]}
                            </text>
                        );
                    })}
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
