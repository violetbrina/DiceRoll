// Any integer number of sides from 2 to 100 is a valid die. Types with no
// dedicated artwork (e.g. d7) fall back to the circle placeholder at render time.
export type DieType = number;

export const MIN_SIDES = 2;
export const MAX_SIDES = 100;

export type DieColor = 'white' | 'black';

export interface DieResult {
  sides: DieType;
  value: number;
  // Whether this die counts toward the total. Dice dropped by keep-highest /
  // keep-lowest / advantage / disadvantage are still rolled and shown (struck
  // through), but kept=false so they don't count and aren't inserted.
  kept: boolean;
  // Explicit colour from a keyword on the group (white/light/hope/good ->
  // white; black/dark/fear/bad -> black). Undefined means "follow the global
  // Black-dice toggle".
  color?: DieColor;
}

export interface RollResult {
  dice: DieResult[];
  modifier: number;
  total: number;
}

export interface ParseError {
  message: string;
}

export type ParseResult =
  | { ok: true; result: RollResult }
  | { ok: false; error: ParseError };

// A keep spec that may immediately follow a dice group: keep-highest/lowest X,
// or advantage/disadvantage (sugar for rolling two and keeping the best/worst).
// The keep count is optional and defaults to 1, so "2d20kl" == "2d20kl1".
const KEEP = 'kh\\d*|kl\\d*|advantage|adv|disadvantage|dis';
// An optional colour keyword after a dice group; the former of each pair is
// white, the latter black.
const COLOR = 'white|light|hope|good|black|dark|fear|bad';
const WHITE_WORDS = new Set(['white', 'light', 'hope', 'good']);
// A signed/comma-separated term: a dice group ([N]dX[keep][colour]) or a flat
// numeric modifier. ',' and '+' both join groups; '-' is a negative modifier.
const TERM_RE = new RegExp(
  `[+,-]?(?:\\d*d\\d+(?:${KEEP})?(?:${COLOR})?|\\d+)`,
  'g',
);
const DICE_TERM_RE = new RegExp(`^(\\d*)d(\\d+)(${KEEP})?(${COLOR})?$`);

function colorFromKeyword(kw: string | undefined): DieColor | undefined {
  if (!kw) return undefined;
  return WHITE_WORDS.has(kw) ? 'white' : 'black';
}

export function rollDice(sides: DieType, count: number): DieResult[] {
  const results: DieResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push({ sides, value: Math.floor(Math.random() * sides) + 1, kept: true });
  }
  return results;
}

// Mark the best/worst `keepCount` dice as kept and the rest as dropped, without
// reordering them (so the display preserves roll order).
function applyKeep(dice: DieResult[], keepCount: number, mode: 'high' | 'low'): void {
  const order = dice.map((_, i) => i);
  order.sort((a, b) =>
    mode === 'high' ? dice[b].value - dice[a].value : dice[a].value - dice[b].value,
  );
  const keep = new Set(order.slice(0, keepCount));
  dice.forEach((d, i) => {
    d.kept = keep.has(i);
  });
}

function err(message: string): ParseResult {
  return { ok: false, error: { message } };
}

function validateGroup(count: number, sides: number): ParseResult | null {
  if (sides < MIN_SIDES || sides > MAX_SIDES) {
    return err(
      `Die type d${sides} is not supported. Use d${MIN_SIDES} to d${MAX_SIDES}.`,
    );
  }
  if (count < 1 || count > 100) {
    return err('Number of dice must be between 1 and 100');
  }
  return null;
}

const INVALID = 'Invalid notation. Try: 4d6, 2d20+3, 4d6kh3, d20adv';

// Resolve a keep spec into (rollCount, keepCount, mode), validated against the
// group's die count. Returns a ParseResult error string on invalid input.
function resolveKeep(
  count: number,
  keep: string | undefined,
): { rollCount: number; keepCount: number; mode: 'high' | 'low' | null } | ParseResult {
  if (!keep) return { rollCount: count, keepCount: count, mode: null };

  if (keep === 'adv' || keep === 'advantage' || keep === 'dis' || keep === 'disadvantage') {
    if (count !== 1) {
      return err(
        'Advantage/disadvantage applies to a single die only (e.g. d20adv or 1d20dis).',
      );
    }
    const mode = keep[0] === 'a' ? 'high' : 'low';
    return { rollCount: 2, keepCount: 1, mode };
  }

  // kh / kl — the count after kh/kl is optional and defaults to 1.
  const mode = keep[1] === 'h' ? 'high' : 'low';
  const digits = keep.slice(2);
  const keepCount = digits === '' ? 1 : parseInt(digits, 10);
  if (keepCount < 1 || keepCount >= count) {
    return err(
      `Keep count for ${keep} must be between 1 and ${count - 1} for ${count} dice.`,
    );
  }
  return { rollCount: count, keepCount, mode };
}

export function parseDiceNotation(input: string): ParseResult {
  const s = input.replace(/\s/g, '').toLowerCase();
  if (!s) return err(INVALID);

  // Tokenise into signed terms and require they cover the whole string —
  // any leftover characters (e.g. "1d6x", "kh3") mean the notation is invalid.
  const terms = s.match(TERM_RE);
  if (!terms || terms.join('') !== s) return err(INVALID);

  const dice: DieResult[] = [];
  let modifier = 0;

  for (const term of terms) {
    const sign = term.startsWith('-') ? -1 : 1; // ',' and '+' are both positive
    const body = term.replace(/^[+,-]/, '');
    const group = body.match(DICE_TERM_RE);
    if (group) {
      // A dice group always adds to the pool; a leading '-' on it is invalid.
      if (sign === -1) return err(INVALID);
      const count = group[1] === '' ? 1 : parseInt(group[1], 10); // implicit 1
      const sides = parseInt(group[2], 10);
      const e = validateGroup(count, sides);
      if (e) return e;
      const resolved = resolveKeep(count, group[3]);
      if ('ok' in resolved) return resolved; // ParseResult error
      const color = colorFromKeyword(group[4]);
      const rolled = rollDice(sides as DieType, resolved.rollCount);
      if (resolved.mode) applyKeep(rolled, resolved.keepCount, resolved.mode);
      if (color) rolled.forEach(d => (d.color = color));
      dice.push(...rolled);
    } else {
      modifier += sign * parseInt(body, 10);
    }
  }

  // At least one dice group is required — a bare number (e.g. "6") is not a roll.
  if (dice.length === 0) return err(INVALID);

  const total =
    dice.reduce((sum, d) => sum + (d.kept ? d.value : 0), 0) + modifier;
  return { ok: true, result: { dice, modifier, total } };
}
