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

// NdX+NdY
const TWO_DICE_RE = /^(\d+)d(\d+)\+(\d+)d(\d+)$/i;
// NdX+/-N
const MODIFIER_RE = /^(\d+)d(\d+)([-+]\d+)$/i;
// NdX
const SIMPLE_RE = /^(\d+)d(\d+)$/i;

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

export function parseDiceNotation(input: string): ParseResult {
  const s = input.replace(/\s/g, '').toLowerCase();

  const two = s.match(TWO_DICE_RE);
  if (two) {
    const [, c1, d1, c2, d2] = two.map(Number);
    const e1 = validateGroup(c1, d1);
    if (e1) return e1;
    const e2 = validateGroup(c2, d2);
    if (e2) return e2;
    const dice = [
      ...rollDice(d1 as DieType, c1),
      ...rollDice(d2 as DieType, c2),
    ];
    const total = dice.reduce((s, d) => s + d.value, 0);
    return { ok: true, result: { dice, modifier: 0, total } };
  }

  const mod = s.match(MODIFIER_RE);
  if (mod) {
    const count = parseInt(mod[1], 10);
    const sides = parseInt(mod[2], 10);
    const modifier = parseInt(mod[3], 10);
    const e = validateGroup(count, sides);
    if (e) return e;
    const dice = rollDice(sides as DieType, count);
    const total = dice.reduce((s, d) => s + d.value, 0) + modifier;
    return { ok: true, result: { dice, modifier, total } };
  }

  const simple = s.match(SIMPLE_RE);
  if (simple) {
    const count = parseInt(simple[1], 10);
    const sides = parseInt(simple[2], 10);
    const e = validateGroup(count, sides);
    if (e) return e;
    const dice = rollDice(sides as DieType, count);
    const total = dice.reduce((s, d) => s + d.value, 0);
    return { ok: true, result: { dice, modifier: 0, total } };
  }

  return err('Invalid notation. Try: 4d6, 2d20+3, 1d8+1d6');
}
