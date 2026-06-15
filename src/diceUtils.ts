export type DieType = 2 | 4 | 6 | 8 | 10 | 12 | 20 | 100;

export interface DieResult {
  sides: DieType;
  value: number;
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

const VALID_DICE: DieType[] = [2, 4, 6, 8, 10, 12, 20, 100];

// A single signed term: either a dice group (NdX) or a flat numeric modifier.
const TERM_RE = /[+-]?(?:\d+d\d+|\d+)/g;
const DICE_TERM_RE = /^(\d+)d(\d+)$/;

export function rollDice(sides: DieType, count: number): DieResult[] {
  const results: DieResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push({ sides, value: Math.floor(Math.random() * sides) + 1 });
  }
  return results;
}

function isDieType(n: number): n is DieType {
  return (VALID_DICE as number[]).includes(n);
}

function err(message: string): ParseResult {
  return { ok: false, error: { message } };
}

function validateGroup(count: number, sides: number): ParseResult | null {
  if (!isDieType(sides)) {
    return err(
      `Unknown die type: d${sides}. Supported: d2, d4, d6, d8, d10, d12, d20, d100`,
    );
  }
  if (count < 1 || count > 100) {
    return err('Number of dice must be between 1 and 100');
  }
  return null;
}

const INVALID = 'Invalid notation. Try: 4d6, 2d20+3, 1d8+1d6';

export function parseDiceNotation(input: string): ParseResult {
  const s = input.replace(/\s/g, '').toLowerCase();
  if (!s) return err(INVALID);

  // Tokenise into signed terms and require they cover the whole string —
  // any leftover characters (e.g. "d6", "1d6x") mean the notation is invalid.
  const terms = s.match(TERM_RE);
  if (!terms || terms.join('') !== s) return err(INVALID);

  const dice: DieResult[] = [];
  let modifier = 0;

  for (const term of terms) {
    const sign = term.startsWith('-') ? -1 : 1;
    const body = term.replace(/^[+-]/, '');
    const group = body.match(DICE_TERM_RE);
    if (group) {
      // A dice group always adds to the pool; a leading '-' on it is invalid.
      if (sign === -1) return err(INVALID);
      const count = parseInt(group[1], 10);
      const sides = parseInt(group[2], 10);
      const e = validateGroup(count, sides);
      if (e) return e;
      dice.push(...rollDice(sides as DieType, count));
    } else {
      modifier += sign * parseInt(body, 10);
    }
  }

  // At least one dice group is required — a bare number (e.g. "6") is not a roll.
  if (dice.length === 0) return err(INVALID);

  const total = dice.reduce((sum, d) => sum + d.value, 0) + modifier;
  return { ok: true, result: { dice, modifier, total } };
}
