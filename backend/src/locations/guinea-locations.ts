// Découpage administratif de la Guinée : 8 régions (dont la ville de Conakry) et leurs préfectures.
// Les noms sont stockés tels quels en base : ils doivent rester identiques à ceux de cette liste.
// La commune n'est pas listée : elle reste en texte libre.
export const GUINEA_REGIONS = {
  Boké: ['Boffa', 'Boké', 'Fria', 'Gaoual', 'Koundara'],
  Conakry: ['Conakry'],
  Faranah: ['Dabola', 'Dinguiraye', 'Faranah', 'Kissidougou'],
  Kankan: ['Kankan', 'Kérouané', 'Kouroussa', 'Mandiana', 'Siguiri'],
  Kindia: ['Coyah', 'Dubréka', 'Forécariah', 'Kindia', 'Télimélé'],
  Labé: ['Koubia', 'Labé', 'Lélouma', 'Mali', 'Tougué'],
  Mamou: ['Dalaba', 'Mamou', 'Pita'],
  Nzérékoré: ['Beyla', 'Guéckédou', 'Lola', 'Macenta', 'Nzérékoré', 'Yomou'],
} as const satisfies Record<string, readonly string[]>;

export type GuineaRegion = keyof typeof GUINEA_REGIONS;

export const GUINEA_REGION_NAMES = Object.keys(
  GUINEA_REGIONS,
) as GuineaRegion[];

// Toutes les préfectures, sans distinction de région (filtre du catalogue par préfecture seule)
export const GUINEA_PREFECTURE_NAMES: readonly string[] =
  Object.values(GUINEA_REGIONS).flat();

export function isGuineaRegion(value: unknown): value is GuineaRegion {
  return typeof value === 'string' && Object.hasOwn(GUINEA_REGIONS, value);
}

// Vrai si `prefecture` fait partie de la région `region`
export function isPrefectureOfRegion(
  region: unknown,
  prefecture: unknown,
): boolean {
  return (
    isGuineaRegion(region) &&
    typeof prefecture === 'string' &&
    (GUINEA_REGIONS[region] as readonly string[]).includes(prefecture)
  );
}
