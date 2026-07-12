import React, { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { civColor } from "../data/meta.js";

// Carte du monde hors-ligne (Natural Earth empaqueté, aucune tuile externe).
// Elle réagit à la frise : polité sélectionnée mise en avant, ou marqueurs de
// toutes les polités vivantes à l'année survolée.
export default function WorldMap({ polities, selected, aliveList, lang, onSelect, t }) {
    const wrapRef = useRef(null);
    const [land, setLand] = useState(null);
    const [size, setSize] = useState({ w: 420, h: 340 });

    useEffect(() => {
        let ok = true;
        fetch("/geo/countries-110m.json")
            .then((r) => r.json())
            .then((topo) => {
                if (ok) setLand(feature(topo, topo.objects.countries));
            })
            .catch(() => {});
        return () => {
            ok = false;
        };
    }, []);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => {
            const { width, height } = e.contentRect;
            setSize({ w: Math.max(240, width), h: Math.max(200, height) });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const { projection, pathGen } = useMemo(() => {
        const proj = geoNaturalEarth1();
        if (land) proj.fitExtent([[6, 6], [size.w - 6, size.h - 6]], land);
        return { projection: proj, pathGen: geoPath(proj) };
    }, [land, size.w, size.h]);

    const countries = land ? land.features : [];

    // Marqueurs à afficher.
    const markers = useMemo(() => {
        const list = selected ? [selected] : aliveList || [];
        return list
            .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
            .map((p) => {
                const xy = projection([p.lng, p.lat]);
                return xy ? { p, x: xy[0], y: xy[1] } : null;
            })
            .filter(Boolean);
    }, [selected, aliveList, projection]);

    return (
        <div ref={wrapRef} className="relative h-full w-full bg-[#eaf3f7]">
            <svg width={size.w} height={size.h} className="block">
                <rect x={0} y={0} width={size.w} height={size.h} fill="#dceaf2" />
                {land && (
                    <path d={pathGen({ type: "Sphere" })} fill="#eaf3f7" stroke="#b9d3df" strokeWidth={0.6} />
                )}
                {countries.map((f, i) => (
                    <path key={i} d={pathGen(f)} fill="#f4efe2" stroke="#cfc4a8" strokeWidth={0.4} />
                ))}

                {markers.map(({ p, x, y }) => {
                    const sel = selected && selected.id === p.id;
                    const r = sel ? 6 : 4;
                    return (
                        <g key={p.id} style={{ cursor: "pointer" }} onClick={() => onSelect(p.id)}>
                            {sel && <circle cx={x} cy={y} r={12} fill={civColor(p.civ)} opacity={0.25} />}
                            <circle
                                cx={x}
                                cy={y}
                                r={r}
                                fill={civColor(p.civ)}
                                stroke="#fff"
                                strokeWidth={1.3}
                            />
                            {sel && (
                                <text
                                    x={x}
                                    y={y - 12}
                                    textAnchor="middle"
                                    fontSize={12}
                                    fill="#1a1a1a"
                                    style={{ fontWeight: 700, paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}
                                >
                                    {p.name[lang] || p.name.en}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {!selected && (!aliveList || aliveList.length === 0) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] text-slate-500">
                    {t.cursorHint}
                </div>
            )}
        </div>
    );
}
