// Métadonnées partagées : ordre des régions (colonnes), libellés trilingues,
// et couleur par civilisation (civ). Les dynasties d'une même civ partagent
// une teinte, comme sur les affiches d'origine.

export const REGIONS = [
    { key: "americas", zh: "美洲", en: "Americas", fr: "Amériques" },
    { key: "europe", zh: "欧洲", en: "Europe", fr: "Europe" },
    { key: "africa", zh: "非洲", en: "Africa", fr: "Afrique" },
    { key: "middle-east", zh: "中东", en: "Middle East", fr: "Moyen-Orient" },
    { key: "south-central-asia", zh: "中南亚", en: "S. & C. Asia", fr: "Asie du Sud" },
    { key: "east-asia", zh: "东亚", en: "East Asia", fr: "Asie de l'Est" },
    { key: "oceania", zh: "大洋洲", en: "Oceania", fr: "Océanie" },
];

export const REGION_LABEL = Object.fromEntries(
    REGIONS.map((r) => [r.key, { zh: r.zh, en: r.en, fr: r.fr }]),
);

// Couleurs par civilisation. Teintes proches = famille culturelle voisine.
const CIV_COLORS = {
    // 东亚
    china: "#d64545",
    korea: "#e0993c",
    japan: "#cf5f7e",
    vietnam: "#2f8f6d",
    steppe: "#8f6f3c",
    tibet: "#c06a2a",
    // 中东
    mesopotamia: "#c9a23b",
    persia: "#3f7cac",
    anatolia: "#d98c3a",
    "islamic-caliphate": "#2e9e5b",
    levant: "#7a5ea6",
    arabia: "#4c9a92",
    // 中南亚
    india: "#e08a3c",
    afghan: "#9c7a4d",
    "southeast-asia": "#4aa06b",
    // 欧洲
    greece: "#4b8fd6",
    rome: "#7b4fa3",
    byzantine: "#6a4c93",
    frankish: "#4a6fb0",
    france: "#3559a0",
    britain: "#b0453a",
    iberia: "#c8783c",
    italy: "#4f9a5a",
    germany: "#5f6066",
    russia: "#4a7aa8",
    norse: "#6b8fa8",
    "balkan-slavic": "#9a5ca0",
    poland: "#b03b6b",
    // 非洲
    egypt: "#cBa13a",
    nubia: "#a9772f",
    carthage: "#8a4b8f",
    "aksum-ethiopia": "#b5622d",
    "west-africa": "#d1a02b",
    bantu: "#7a9a3b",
    "north-africa": "#cf9a3a",
    "colonial-africa": "#7f8a5c",
    "modern-africa": "#8a9a4c",
    // 美洲
    mesoamerica: "#3f9a86",
    andes: "#c96b3b",
    "north-america": "#4472a8",
    "latin-america": "#4a9a76",
    // 大洋洲
    aboriginal: "#b5652d",
    polynesia: "#3b8fa0",
    maori: "#2e8f8f",
    "oceania-colonial": "#6f8faa",
    "oceania-modern": "#5f7f9a",
};

// Génère une couleur stable pour toute civ absente du dictionnaire (hash → HSL).
function fallbackColor(civ) {
    let h = 0;
    for (let i = 0; i < civ.length; i++) h = (h * 31 + civ.charCodeAt(i)) % 360;
    return `hsl(${h} 45% 52%)`;
}

export function civColor(civ) {
    return CIV_COLORS[civ] || fallbackColor(civ || "unknown");
}
