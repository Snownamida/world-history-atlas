// Chaînes d'interface (le contenu historique est trilingue dans les données).
// La langue vient du chemin (/en/ /fr/) puis de localStorage puis du navigateur.

export const UI = {
    zh: {
        htmlLang: "zh-CN",
        title: "世界历史长卷",
        subtitle: "5000 年 · 交互时间线与地图",
        mosaic: "马赛克",
        flow: "河流",
        map: "地图",
        hideMap: "收起地图",
        showMap: "展开地图",
        search: "搜索王朝 / 帝国 / 国家…",
        noResult: "无结果",
        regions: "区域",
        all: "全部",
        cursorHint: "移到时间轴上查看某一年全球同时存在的政权",
        aliveIn: (y) => `公元${y < 0 ? `前 ${-y}` : ` ${y}`} 年 · 在世政权`,
        period: "存续",
        region: "区域",
        civ: "文明",
        wiki: "维基百科",
        reset: "重置视图",
        loading: "加载中…",
        count: (n) => `${n} 个政权`,
        present: "至今",
        help: "滚轮缩放 · 拖拽平移 · 点击查看详情",
        eras: "纪元",
        events: "大事",
        widthLabel: "宽度", widthEven: "均衡", widthArea: "面积", widthPop: "人口", area: "面积", pop: "人口", widthHint: (d)=>d==="area"?"宽度∝疆域面积":d==="pop"?"宽度∝人口":"宽度=同期平分",
    },
    en: {
        htmlLang: "en",
        title: "World History Atlas",
        subtitle: "5000 Years · Interactive Timeline & Map",
        mosaic: "Mosaic",
        flow: "Flow",
        map: "Map",
        hideMap: "Hide map",
        showMap: "Show map",
        search: "Search a dynasty, empire, country…",
        noResult: "No match",
        regions: "Regions",
        all: "All",
        cursorHint: "Hover the timeline to see every polity alive in a given year",
        aliveIn: (y) => `${y < 0 ? `${-y} BCE` : `${y} CE`} · polities alive`,
        period: "Span",
        region: "Region",
        civ: "Civilization",
        wiki: "Wikipedia",
        reset: "Reset view",
        loading: "Loading…",
        count: (n) => `${n} polities`,
        present: "present",
        help: "Scroll to zoom · drag to pan · click for details",
        eras: "Eras",
        events: "Events",
        widthLabel: "Width", widthEven: "Balanced", widthArea: "Area", widthPop: "Pop.", area: "Area", pop: "Population", widthHint: (d)=>d==="area"?"Width ∝ territory":d==="pop"?"Width ∝ population":"Width = equal share",
    },
    fr: {
        htmlLang: "fr",
        title: "Atlas de l'histoire mondiale",
        subtitle: "5000 ans · frise et carte interactives",
        mosaic: "Mosaïque",
        flow: "Flux",
        map: "Carte",
        hideMap: "Masquer la carte",
        showMap: "Afficher la carte",
        search: "Chercher une dynastie, un empire, un pays…",
        noResult: "Aucun résultat",
        regions: "Régions",
        all: "Toutes",
        cursorHint: "Survolez la frise pour voir toutes les polités vivantes une année donnée",
        aliveIn: (y) => `${y < 0 ? `${-y} av. J.-C.` : `${y} apr. J.-C.`} · polités vivantes`,
        period: "Durée",
        region: "Région",
        civ: "Civilisation",
        wiki: "Wikipédia",
        reset: "Réinitialiser la vue",
        loading: "Chargement…",
        count: (n) => `${n} polités`,
        present: "aujourd'hui",
        help: "Molette pour zoomer · glisser pour déplacer · cliquer pour les détails",
        eras: "Époques",
        events: "Repères",
        widthLabel: "Largeur", widthEven: "Équilibré", widthArea: "Superficie", widthPop: "Pop.", area: "Superficie", pop: "Population", widthHint: (d)=>d==="area"?"Largeur ∝ territoire":d==="pop"?"Largeur ∝ population":"Largeur = part égale",
    },
};

export const LANGS = [
    ["zh", "中", "/"],
    ["en", "EN", "/en/"],
    ["fr", "FR", "/fr/"],
];

export function resolveLang() {
    if (typeof window === "undefined") return "zh";
    const seg = window.location.pathname.split("/").filter(Boolean)[0];
    if (UI[seg]) return seg;
    try {
        const saved = localStorage.getItem("wha_lang");
        if (UI[saved]) return saved;
    } catch {}
    const nav = (navigator.language || "").slice(0, 2).toLowerCase();
    return UI[nav] ? nav : "zh";
}

export function rememberLang(lang) {
    try {
        localStorage.setItem("wha_lang", lang);
    } catch {}
}
