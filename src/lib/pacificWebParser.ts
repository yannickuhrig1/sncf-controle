/**
 * Pacific Web tournée parser.
 *
 * Pacific Web doesn't expose a structured export; agents copy-paste or type
 * the day's table. The format is roughly columnar:
 *
 *   Nature  Départ          Arrivée         Num
 *   PS      9:58  Thl       *    *          *
 *   EA      10:18 THL       LUX  10:45      88758
 *   EA      11:39 LUX       THL  12:03      88524
 *   ...
 *
 * Real-world inputs vary: extra spaces, tabs, mixed case, missing fields,
 * different separators when typed from a phone. Rather than enforcing a
 * strict grammar, we tokenize each line and assign tokens to roles by shape:
 *
 *   - HH:MM or H:MM           → time
 *   - all-caps 2-4 letters    → station code
 *   - 4-6 digit number        → train number
 *   - one of the known natures (PS, FS, EA, Ecritures, ECR, EHLP) → nature
 *   - anything else           → label / station name
 *
 * The output is an ordered list of items in the same order as input lines.
 * EA lines are the only ones we surface as "trains to control" later.
 */

export type ServiceItemNature =
  | 'EA'        // En activité (contrôle)
  | 'PS'        // Prise de service
  | 'FS'        // Fin de service
  | 'Ecritures' // Tâches administratives
  | 'EHLP'      // Engagement hors ligne
  | 'HLP'       // Haut-le-pied (déplacement à vide)
  | 'Autre';

export interface ServiceItem {
  nature: ServiceItemNature;
  /** Times in 'HH:MM' (24h, zero-padded). Empty string when missing. */
  departureTime: string;
  /** Station code as written, uppercase normalized for codes (THL, LUX). */
  departureStation: string;
  arrivalTime: string;
  arrivalStation: string;
  /** Train number when present (digits). Empty string when missing. */
  trainNumber: string;
  /** The original line, useful for debugging if a parse looks off. */
  raw: string;
}

const NATURE_TOKENS: Record<string, ServiceItemNature> = {
  EA: 'EA',
  PS: 'PS',
  FS: 'FS',
  ECRITURES: 'Ecritures',
  ECRITURE: 'Ecritures',
  ECR: 'Ecritures',
  EHLP: 'EHLP',
  HLP: 'HLP',
};

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const TRAIN_NUMBER_RE = /^\d{4,6}$/;
const STATION_CODE_RE = /^[A-Za-zÀ-ÿ]{2,5}$/;
const PLACEHOLDER_TOKENS = new Set(['*', '-', '—', '•', '·']);

function normalizeTime(token: string): string {
  const m = TIME_RE.exec(token.trim());
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function isTime(token: string): boolean {
  return TIME_RE.test(token.trim());
}

function isTrainNumber(token: string): boolean {
  return TRAIN_NUMBER_RE.test(token.trim());
}

function isStationCode(token: string): boolean {
  // Pacific Web mostly uses 2-4 letter codes (THL, LUX, MZ, BTG). Allow
  // letters with accents to handle agents typing full names accidentally.
  return STATION_CODE_RE.test(token.trim());
}

function looksLikeNature(token: string): ServiceItemNature | null {
  const up = token.trim().toUpperCase();
  return NATURE_TOKENS[up] ?? null;
}

/**
 * Tokenize a single line: split on whitespace, drop placeholder tokens
 * (Pacific Web shows `*` for missing fields), and lower-case nothing — we
 * preserve case for station names and only normalize codes when classifying.
 */
function tokenize(line: string): string[] {
  return line
    .split(/[\s\t]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0 && !PLACEHOLDER_TOKENS.has(t));
}

/**
 * Parse a single line into a ServiceItem if it looks like a tournée row.
 * Returns null when the line is clearly a header, a separator, or empty.
 */
function parseLine(line: string): ServiceItem | null {
  const tokens = tokenize(line);
  if (tokens.length === 0) return null;

  // Header detection: the first row contains "Nature" / "Départ" / "Arrivée"
  // / "Num" labels. Skip any line that's only made of those keywords.
  const lowerJoined = tokens.join(' ').toLowerCase();
  const headerKeywords = ['nature', 'départ', 'depart', 'arrivée', 'arrivee', 'num'];
  const matchedHeaders = headerKeywords.filter(k => lowerJoined.includes(k)).length;
  if (matchedHeaders >= 2 && tokens.length <= 8) return null;

  // Skip "JOURNÉE Y001" header lines — no nature token, no times.
  if (/^journ[ée]e?$/i.test(tokens[0]) && tokens.length <= 3) return null;

  // We expect roughly: [nature?, depTime?, depStation?, arrStation?, arrTime?, trainNumber?]
  // We classify each token by shape and then assemble in document order.
  const times: string[] = [];
  const stations: string[] = [];
  let trainNumber = '';
  let nature: ServiceItemNature | null = null;

  for (const tok of tokens) {
    if (nature === null) {
      const n = looksLikeNature(tok);
      if (n) { nature = n; continue; }
    }
    if (isTime(tok)) { times.push(normalizeTime(tok)); continue; }
    if (isTrainNumber(tok)) { trainNumber = tok; continue; }
    if (isStationCode(tok)) { stations.push(tok.toUpperCase()); continue; }
    // Unknown token — likely free text station name (e.g. "Thionville-V").
    // Treat as a station only if no codes have been classified yet.
    if (stations.length < 2) stations.push(tok);
  }

  // A row needs at least one of: a time, a station, or a train number.
  // Otherwise it's not a tournée line.
  if (times.length === 0 && stations.length === 0 && !trainNumber) return null;

  // Disambiguate departure vs arrival when both times are present:
  // first time = departure, second time = arrival. Same for stations.
  const [departureTime = '', arrivalTime = ''] = times;
  const [departureStation = '', arrivalStation = ''] = stations;

  return {
    nature: nature ?? 'Autre',
    departureTime,
    departureStation,
    arrivalTime,
    arrivalStation,
    trainNumber,
    raw: line.trim(),
  };
}

export interface ParseResult {
  items: ServiceItem[];
  /** Lines that were dropped (headers, blanks, garbage) — exposed for debug. */
  skipped: string[];
}

export function parsePacificWebTournee(rawText: string): ParseResult {
  const lines = rawText.split(/\r?\n/);
  const items: ServiceItem[] = [];
  const skipped: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const parsed = parseLine(line);
    if (parsed) items.push(parsed);
    else skipped.push(line);
  }

  return { items, skipped };
}

/**
 * Convenience: keep only lines representing actual train control activities
 * (EA — En Activité). Other natures (PS, FS, Ecritures, EHLP, HLP) are kept
 * in the parsed output for context but aren't usable as "trains to control".
 */
export function getControlTrains(items: ServiceItem[]): ServiceItem[] {
  return items.filter(item => item.nature === 'EA' && item.trainNumber);
}

/**
 * Group EA items by their departure station. Used by the import dialog when
 * the day spans multiple stations and the user must pick which to import as
 * embarkment missions.
 */
export function groupTrainsByDepartureStation(items: ServiceItem[]): Map<string, ServiceItem[]> {
  const trains = getControlTrains(items);
  const groups = new Map<string, ServiceItem[]>();
  for (const t of trains) {
    const station = t.departureStation || '?';
    if (!groups.has(station)) groups.set(station, []);
    groups.get(station)!.push(t);
  }
  return groups;
}

/**
 * Optional: full station-name resolution. Pacific Web codes are short and
 * SNCF agents read them fluently, but the rest of the app uses full names
 * (e.g. "Metz-Ville" not "MZ"). We resolve a small set of known codes for
 * the East region; unknown codes fall back to the code itself.
 */
const STATION_CODE_TO_NAME: Record<string, string> = {
  THL: 'Thionville',
  LUX: 'Luxembourg',
  MZ: 'Metz-Ville',
  BTG: 'Bettembourg',
  NCY: 'Nancy-Ville',
  STR: 'Strasbourg',
  FOR: 'Forbach',
  BNG: 'Bénestroff',
  LON: 'Longwy',
  HVL: 'Hagondange',
};

export function resolveStationName(code: string): string {
  if (!code) return '';
  const up = code.toUpperCase();
  return STATION_CODE_TO_NAME[up] ?? code;
}
