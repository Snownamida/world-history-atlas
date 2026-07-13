import React, { useEffect, useMemo, useState } from "react";
import { POLITIES, PRED, SUCC, SUCCESSION } from "./data/index.js";

const BY_ID = new Map(POLITIES.map((p) => [p.id, p]));
const ALL_LINKS = SUCCESSION.map((e) => [e.from, e.to]);
import { EVENTS } from "./data/events.js";
import { REGIONS, REGION_LABEL, civColor } from "./data/meta.js";
import { computeMosaic, politiesAliveAt } from "./lib/layout.js";
import { formatYear } from "./lib/scale.js";
import { UI, LANGS, resolveLang, rememberLang } from "./i18n.js";
import Timeline from "./components/Timeline.jsx";
import WorldMap from "./components/WorldMap.jsx";

const PRESENT = 2024;

export default function App() {
    const [lang] = useState(resolveLang);
    const t = UI[lang];
    const [mode, setMode] = useState("mosaic");
    const [mapOpen, setMapOpen] = useState(() => (typeof window === "undefined" ? true : window.innerWidth >= 768));
    const [showEvents, setShowEvents] = useState(true);
    const [showLinks, setShowLinks] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [widthBy, setWidthBy] = useState("area");
    const [widthExp, setWidthExp] = useState(0.63);
    const [selectedId, setSelectedId] = useState(null);
    const [hoverYear, setHoverYear] = useState(null);
    const [query, setQuery] = useState("");
    const [focusReq, setFocusReq] = useState(null);
    const [activeRegions, setActiveRegions] = useState(() => new Set(REGIONS.map((r) => r.key)));

    useEffect(() => {
        document.documentElement.lang = t.htmlLang;
        document.title = `${t.title} · ${t.subtitle}`;
    }, [t]);

    const filtered = useMemo(
        () => POLITIES.filter((p) => activeRegions.has(p.region)),
        [activeRegions],
    );
    const layout = useMemo(
        () => computeMosaic(filtered, widthBy, PRED, widthExp),
        [filtered, widthBy, widthExp],
    );

    const q = query.trim().toLowerCase();
    const matchIds = useMemo(() => {
        if (!q) return null;
        const s = new Set();
        for (const p of filtered) {
            const hay = `${p.name.zh} ${p.name.en} ${p.name.fr} ${p.civ}`.toLowerCase();
            if (hay.includes(q)) s.add(p.id);
        }
        return s;
    }, [q, filtered]);

    const matchList = useMemo(() => {
        if (!matchIds) return [];
        return filtered.filter((p) => matchIds.has(p.id)).slice(0, 10);
    }, [matchIds, filtered]);

    const aliveList = useMemo(
        () => (hoverYear != null ? politiesAliveAt(filtered, hoverYear) : null),
        [hoverYear, filtered],
    );
    const aliveIds = useMemo(
        () => (aliveList ? new Set(aliveList.map((p) => p.id)) : null),
        [aliveList],
    );

    const selected = useMemo(
        () => POLITIES.find((p) => p.id === selectedId) || null,
        [selectedId],
    );

    // Filiation de la polité sélectionnée : liens à tracer + ids à mettre en avant.
    const lineage = useMemo(() => {
        if (!selectedId) return { links: [], ids: null };
        const links = [];
        const ids = new Set([selectedId]);
        for (const pid of PRED.get(selectedId) || []) {
            links.push([pid, selectedId]);
            ids.add(pid);
        }
        for (const sid of SUCC.get(selectedId) || []) {
            links.push([selectedId, sid]);
            ids.add(sid);
        }
        return { links, ids };
    }, [selectedId]);

    const toggleRegion = (key) => {
        setActiveRegions((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next.size ? next : prev; // ne jamais tout masquer
        });
    };
    const allActive = activeRegions.size === REGIONS.length;

    return (
        <div className="flex h-full flex-col">
            {/* En-tête */}
            <header className="z-20 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-black/10 bg-[#f6f0e4] px-2.5 py-1.5">
                <div className="mr-auto flex items-baseline gap-2">
                    <span className="text-lg font-black tracking-tight text-[#2a251c]">🏛️ {t.title}</span>
                    <span className="hidden text-xs text-slate-500 sm:inline">{t.subtitle}</span>
                </div>

                {/* Recherche */}
                <div className="relative">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t.search}
                        className="w-44 rounded-full border border-black/10 bg-white px-3 py-1 text-sm outline-none focus:w-56 focus:ring-2 focus:ring-amber-300 sm:w-56"
                    />
                    {matchList.length > 0 && (
                        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-64 overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/10">
                            {matchList.map((p) => (
                                <button
                                    key={p.id}
                                    onMouseDown={() => {
                                        setSelectedId(p.id);
                                        setFocusReq(p.id + "|" + Date.now());
                                        setQuery("");
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-amber-50"
                                >
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: civColor(p.civ) }} />
                                    <span className="truncate">{p.name[lang] || p.name.en}</span>
                                    <span className="ml-auto shrink-0 text-[11px] text-slate-400">
                                        {formatYear(p.start, lang)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bascule mode */}
                <div className="flex overflow-hidden rounded-full border border-black/10 bg-white text-sm">
                    {["mosaic", "flow"].map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-3 py-1 ${mode === m ? "bg-[#2a251c] text-white" : "text-slate-600"}`}
                        >
                            {t[m]}
                        </button>
                    ))}
                </div>

                {/* Pilote de largeur */}
                <div
                    className="flex overflow-hidden rounded-full border border-black/10 bg-white text-sm"
                    title={t.widthHint(widthBy)}
                >
                    <span className="hidden items-center pl-2.5 pr-1 text-xs text-slate-400 lg:flex">↔</span>
                    {[["even", t.widthEven], ["area", t.widthArea], ["pop", t.widthPop]].map(([w, lab]) => (
                        <button
                            key={w}
                            onClick={() => setWidthBy(w)}
                            className={`px-2.5 py-1 ${widthBy === w ? "bg-[#6b5533] text-white" : "text-slate-600"}`}
                        >
                            {lab}
                        </button>
                    ))}
                </div>

                {/* Curseur : force de compression de la largeur (compressé ↔ ratios réels) */}
                {widthBy !== "even" && (
                    <label
                        className="flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] text-slate-400"
                        title={t.scaleHint}
                    >
                        <span>{t.scaleLo}</span>
                        <input
                            type="range"
                            min="0.4"
                            max="1"
                            step="0.03"
                            value={widthExp}
                            onChange={(e) => setWidthExp(+e.target.value)}
                            className="h-1 w-16 cursor-pointer accent-[#6b5533]"
                            aria-label={t.scaleHint}
                        />
                        <span>{t.scaleHi}</span>
                    </label>
                )}

                {/* Filiation */}
                <button
                    onClick={() => setShowLinks((v) => !v)}
                    className={`hidden rounded-full border border-black/10 px-3 py-1 text-sm sm:block ${showLinks ? "bg-[#8a3b12] text-white" : "bg-white text-slate-600"}`}
                >
                    ⇣ {t.links}
                </button>

                {/* Repères */}
                <button
                    onClick={() => setShowEvents((v) => !v)}
                    className={`hidden rounded-full border border-black/10 px-3 py-1 text-sm sm:block ${showEvents ? "bg-[#2a251c] text-white" : "bg-white text-slate-600"}`}
                >
                    ◈ {t.events}
                </button>

                {/* Carte */}
                <button
                    onClick={() => setMapOpen((v) => !v)}
                    className={`rounded-full border border-black/10 px-3 py-1 text-sm ${mapOpen ? "bg-[#2a251c] text-white" : "bg-white text-slate-600"}`}
                >
                    🗺 {t.map}
                </button>

                {/* Langue */}
                <div className="flex overflow-hidden rounded-full border border-black/10 bg-white text-sm">
                    {LANGS.map(([code, label, path]) => (
                        <a
                            key={code}
                            href={path}
                            onClick={() => rememberLang(code)}
                            className={`px-2.5 py-1 ${code === lang ? "bg-amber-400 font-semibold text-[#2a251c]" : "text-slate-600"}`}
                        >
                            {label}
                        </a>
                    ))}
                </div>

                <button
                    onClick={() => setAboutOpen(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-slate-600 hover:bg-slate-50"
                    aria-label="About"
                >
                    ⓘ
                </button>
            </header>

            {/* Filtres de région */}
            <div className="z-10 flex items-center gap-1.5 overflow-x-auto border-b border-black/10 bg-[#f6f0e4]/70 px-3 py-1.5 text-xs">
                <button
                    onClick={() => setActiveRegions(new Set(REGIONS.map((r) => r.key)))}
                    className={`shrink-0 rounded-full px-2.5 py-0.5 ${allActive ? "bg-[#2a251c] text-white" : "bg-white text-slate-500 ring-1 ring-black/10"}`}
                >
                    {t.all}
                </button>
                {REGIONS.map((r) => {
                    const on = activeRegions.has(r.key);
                    return (
                        <button
                            key={r.key}
                            onClick={() => toggleRegion(r.key)}
                            className={`shrink-0 rounded-full px-2.5 py-0.5 ${on ? "bg-white text-slate-700 ring-1 ring-black/10" : "bg-transparent text-slate-400 line-through"}`}
                        >
                            {REGION_LABEL[r.key][lang]}
                        </button>
                    );
                })}
                <span className="ml-auto shrink-0 pl-2 text-slate-400">{t.count(filtered.length)}</span>
            </div>

            {/* Corps : frise + carte */}
            <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
                <div className="relative min-h-0 flex-1">
                    <Timeline
                        layout={layout}
                        mode={mode}
                        lang={lang}
                        t={t}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        hoverYear={hoverYear}
                        onHoverYear={setHoverYear}
                        aliveIds={aliveIds}
                        matchIds={matchIds}
                        dimUnmatched={!!q}
                        events={EVENTS}
                        showEvents={showEvents}
                        widthBy={widthBy}
                        widthExp={widthExp}
                        focusReq={focusReq}
                        lineageLinks={lineage.links}
                        lineageIds={lineage.ids}
                        allLinks={showLinks ? ALL_LINKS : null}
                    />

                    {/* Badge : nombre de polités vivantes à l'année survolée */}
                    {hoverYear != null && aliveList && (
                        <div className="pointer-events-none absolute left-16 top-9 rounded-md bg-[#c0392b] px-2 py-1 text-xs font-semibold text-white shadow">
                            {t.aliveIn(hoverYear)} · {aliveList.length}
                        </div>
                    )}

                    {/* Fiche détail */}
                    {selected && (
                        <div className="absolute bottom-3 left-3 w-72 rounded-xl bg-white/95 p-3 shadow-xl ring-1 ring-black/10 backdrop-blur">
                            <div className="flex items-start gap-2">
                                <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded" style={{ background: civColor(selected.civ) }} />
                                <div className="min-w-0">
                                    <div className="text-base font-bold leading-tight text-[#2a251c]">
                                        {selected.name[lang] || selected.name.en}
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                        {selected.name.en !== (selected.name[lang] || selected.name.en) ? selected.name.en : ""}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedId(null)} className="ml-auto text-slate-400 hover:text-slate-700">
                                    ✕
                                </button>
                            </div>
                            <div className="mt-2 text-sm text-slate-700">{selected.desc[lang] || selected.desc.en}</div>
                            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs text-slate-500">
                                <dt>{t.period}</dt>
                                <dd className="text-slate-700">
                                    {formatYear(selected.start, lang)} – {selected.end >= PRESENT ? t.present : formatYear(selected.end, lang)}
                                </dd>
                                <dt>{t.region}</dt>
                                <dd className="text-slate-700">{REGION_LABEL[selected.region][lang]}</dd>
                                {selected.area != null && (
                                    <>
                                        <dt>{t.area}</dt>
                                        <dd className="text-slate-700">≈ {fmtQty(selected.area, lang)} km²</dd>
                                    </>
                                )}
                                {selected.pop != null && (
                                    <>
                                        <dt>{t.pop}</dt>
                                        <dd className="text-slate-700">≈ {fmtQty(selected.pop, lang)}</dd>
                                    </>
                                )}
                            </dl>
                            {(() => {
                                const chip = (p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedId(p.id);
                                            setFocusReq(p.id + "|" + Date.now());
                                        }}
                                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 hover:bg-amber-100"
                                    >
                                        {p.name[lang] || p.name.en}
                                    </button>
                                );
                                const preds = (PRED.get(selected.id) || []).map((id) => BY_ID.get(id)).filter(Boolean);
                                const succs = (SUCC.get(selected.id) || []).map((id) => BY_ID.get(id)).filter(Boolean);
                                if (!preds.length && !succs.length) return null;
                                return (
                                    <div className="mt-2 space-y-1 border-t border-black/10 pt-2">
                                        {preds.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1">
                                                <span className="text-[11px] text-slate-400">↖ {t.from}</span>
                                                {preds.map(chip)}
                                            </div>
                                        )}
                                        {succs.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1">
                                                <span className="text-[11px] text-slate-400">↳ {t.into}</span>
                                                {succs.map(chip)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            <a
                                href={`https://${lang}.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(selected.name[lang] || selected.name.en)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline"
                            >
                                {t.wiki} ↗
                            </a>
                        </div>
                    )}
                </div>

                {mapOpen && (
                    <div className="h-[38vh] min-h-0 shrink-0 border-t border-black/10 md:h-auto md:w-[40%] md:border-l md:border-t-0 lg:w-[36%]">
                        <WorldMap
                            polities={filtered}
                            selected={selected}
                            aliveList={aliveList}
                            lang={lang}
                            onSelect={setSelectedId}
                            t={t}
                        />
                    </div>
                )}
            </div>

            {/* À propos */}
            {aboutOpen && (
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setAboutOpen(false)}
                >
                    <div
                        className="max-h-[80vh] w-full max-w-md overflow-auto rounded-2xl bg-[#fbf7ee] p-5 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-[#2a251c]">🏛️ {t.title}</h2>
                            <button onClick={() => setAboutOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
                        </div>
                        <p className="mt-3 text-sm text-slate-700">{ABOUT[lang].intro}</p>
                        <p className="mt-2 text-sm text-slate-700">{ABOUT[lang].how}</p>
                        <p className="mt-3 text-xs text-slate-500">{ABOUT[lang].credits}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Formatage compact des grands nombres (superficie / population).
function fmtQty(n, lang) {
    if (n == null) return "—";
    if (lang === "zh") {
        if (n >= 1e8) return +(n / 1e8).toFixed(n >= 1e9 ? 0 : 1) + "亿";
        if (n >= 1e4) return Math.round(n / 1e4) + "万";
        return String(n);
    }
    if (n >= 1e9) return +(n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return +(n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return Math.round(n / 1e3) + "K";
    return String(n);
}

const ABOUT = {
    zh: {
        intro: "把人类 5000 年历史铺成一张可探索的长卷：每个王朝、帝国、文明都按真实存续时长缩放成色块，同色系代表同一文明。",
        how: "滚轮缩放、拖拽平移、点击查看详情；把鼠标移到时间轴上，可看到那一年全球同时存在的所有政权，并在地图上点亮它们的位置。「马赛克」重精确，「河流」重势力起落。",
        credits: "共 304 个政权 · 世界地图数据来自 Natural Earth（公有领域）· 灵感源自经典历史长卷海报 · 由 Snownamida 制作。仅供科普参考，年代为学界通行近似值。",
    },
    en: {
        intro: "5000 years of human history as one explorable scroll: every dynasty, empire and civilization is scaled to its real duration, and a shared hue marks a shared civilization.",
        how: "Zoom with the wheel, drag to pan, click for details. Hover the timeline to see every polity alive in that year — and watch them light up on the map. “Mosaic” favors precision; “Flow” shows the rise and fall of power.",
        credits: "304 polities · world map from Natural Earth (public domain) · inspired by classic history-timeline posters · made by Snownamida. For education; dates are standard approximations.",
    },
    fr: {
        intro: "5000 ans d'histoire en un seul rouleau explorable : chaque dynastie, empire et civilisation est mis à l'échelle de sa durée réelle, une même teinte marquant une même civilisation.",
        how: "Zoomez à la molette, glissez pour déplacer, cliquez pour les détails. Survolez la frise pour voir toutes les polités vivantes cette année-là — et les voir s'allumer sur la carte. « Mosaïque » privilégie la précision ; « Flux » montre la montée et le déclin des puissances.",
        credits: "304 polités · carte du monde Natural Earth (domaine public) · inspiré des affiches-frises classiques · réalisé par Snownamida. À visée éducative ; dates approximatives usuelles.",
    },
};
