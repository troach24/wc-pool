// Maps pool pick display labels (flag stripped, normalized) → API player/team names.
// Needed because pool uses "Mbappé" but API has "Kylian Mbappé", etc.

const FLAG_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]️?(‍[\p{Emoji_Presentation}\p{Extended_Pictographic}]️?)*|\p{Regional_Indicator}{2}/gu;

export function stripFlag(label: string): string {
  return label.replace(FLAG_REGEX, '').trim();
}

// Normalize for fuzzy matching: lowercase, remove accents, collapse spaces
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Manual overrides for known mismatches between pool labels and API names
const ALIASES: Record<string, string> = {
  'mbappe': 'kylian mbappe',
  'raul jimenez': 'raul jimenez',
  'jimenez': 'raul jimenez',
  'simon': 'unai simon',
  'sìmon': 'unai simon',
  'martinez': 'emiliano martinez',
  'alisson': 'alisson',
  'ueda': 'ayase ueda',
  'gyokeres': 'viktor gyokeres',
  'guller': 'arda guller',
  'guler': 'arda guler',
  'nunez': 'darwin nunez',
  'e valencia': 'enner valencia',
  'caicedo': 'moises caicedo',
};

export function resolveAlias(raw: string): string {
  const n = normalize(raw);
  return ALIASES[n] ?? n;
}

export function matchesApiName(pickLabel: string, apiName: string): boolean {
  const pickNorm = resolveAlias(stripFlag(pickLabel));
  const apiNorm = normalize(apiName);
  // Match if pick name appears anywhere in API name or vice versa
  return apiNorm.includes(pickNorm) || pickNorm.includes(apiNorm) ||
    pickNorm.split(' ').some(word => word.length > 3 && apiNorm.includes(word));
}
