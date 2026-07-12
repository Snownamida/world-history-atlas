// Échelle temporelle verticale, partagée par tous les modes.
// Le temps descend : Antiquité en haut, époque moderne en bas (comme l'affiche 1).
// Pas d'année 0 : l'an 1 av. J.-C. = -1, l'an 1 = 1 ; l'écart d'un an est négligeable.

export const DOMAIN_START = -3600; // toute culture antérieure est écrêtée en haut
export const DOMAIN_END = 2025;
export const PX_PER_YEAR = 1; // hauteur « monde » de base : ~6025 px
export const WORLD_HEIGHT = (DOMAIN_END - DOMAIN_START) * PX_PER_YEAR;

// année (signée) -> y en coordonnées « monde »
export function yearToY(year) {
    const clamped = Math.max(DOMAIN_START, Math.min(DOMAIN_END, year));
    return (clamped - DOMAIN_START) * PX_PER_YEAR;
}

// y « monde » -> année
export function yToYear(y) {
    return Math.round(y / PX_PER_YEAR + DOMAIN_START);
}

// Graduations de l'axe : denses vers l'époque moderne, espacées dans l'Antiquité.
export function axisTicks() {
    const ticks = [];
    for (let y = -3500; y < -1000; y += 500) ticks.push(y);
    for (let y = -1000; y < 500; y += 250) ticks.push(y);
    for (let y = 500; y < 1500; y += 100) ticks.push(y);
    for (let y = 1500; y <= 2000; y += 50) ticks.push(y);
    return ticks;
}

// Libellé d'une année : « 3000 BCE » / « 476 CE » selon la langue.
export function formatYear(year, lang = "zh") {
    const abs = Math.abs(year);
    if (lang === "zh") return year < 0 ? `前${abs}` : `${abs}`;
    return year < 0 ? `${abs} BCE` : `${abs} CE`;
}
