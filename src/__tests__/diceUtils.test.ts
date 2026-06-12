import { rollDice, parseDiceNotation, DieType } from '../diceUtils';

describe('rollDice', () => {
  it('returns the requested number of dice', () => {
    expect(rollDice(6, 4)).toHaveLength(4);
  });
  it('each result carries the correct sides value', () => {
    rollDice(20, 3).forEach(d => expect(d.sides).toBe(20));
  });
  it('each die value is within [1, sides]', () => {
    for (let i = 0; i < 50; i++) {
      rollDice(8, 5).forEach(d => {
        expect(d.value).toBeGreaterThanOrEqual(1);
        expect(d.value).toBeLessThanOrEqual(8);
      });
    }
  });
});

describe('parseDiceNotation — valid simple notation', () => {
  it('4d6 produces 4 d6 dice, modifier 0, total in [4, 24]', () => {
    for (let i = 0; i < 20; i++) {
      const r = parseDiceNotation('4d6');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.result.dice).toHaveLength(4);
      r.result.dice.forEach(d => expect(d.sides).toBe(6));
      expect(r.result.modifier).toBe(0);
      expect(r.result.total).toBeGreaterThanOrEqual(4);
      expect(r.result.total).toBeLessThanOrEqual(24);
    }
  });
  it('1d100 produces 1 d100 die, values in [1, 100]', () => {
    for (let i = 0; i < 20; i++) {
      const r = parseDiceNotation('1d100');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.result.dice[0].sides).toBe(100);
      expect(r.result.dice[0].value).toBeGreaterThanOrEqual(1);
      expect(r.result.dice[0].value).toBeLessThanOrEqual(100);
    }
  });
});

describe('parseDiceNotation — valid notation with flat modifier', () => {
  it('2d8+3 produces 2 d8 dice, modifier +3, total in [5, 19]', () => {
    for (let i = 0; i < 20; i++) {
      const r = parseDiceNotation('2d8+3');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.result.dice).toHaveLength(2);
      expect(r.result.modifier).toBe(3);
      expect(r.result.total).toBeGreaterThanOrEqual(5);
      expect(r.result.total).toBeLessThanOrEqual(19);
    }
  });
  it('1d20-1 produces 1 d20 die, modifier -1, total in [0, 19]', () => {
    for (let i = 0; i < 20; i++) {
      const r = parseDiceNotation('1d20-1');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.result.modifier).toBe(-1);
      expect(r.result.total).toBeGreaterThanOrEqual(0);
      expect(r.result.total).toBeLessThanOrEqual(19);
    }
  });
});

describe('parseDiceNotation — valid combined dice pool', () => {
  it('2d6+1d4 produces 3 dice (2×d6, 1×d4), modifier 0, total in [3, 16]', () => {
    for (let i = 0; i < 20; i++) {
      const r = parseDiceNotation('2d6+1d4');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.result.dice).toHaveLength(3);
      expect(r.result.dice[0].sides).toBe(6);
      expect(r.result.dice[1].sides).toBe(6);
      expect(r.result.dice[2].sides).toBe(4);
      expect(r.result.modifier).toBe(0);
      expect(r.result.total).toBeGreaterThanOrEqual(3);
      expect(r.result.total).toBeLessThanOrEqual(16);
    }
  });
});

describe('parseDiceNotation — case insensitivity', () => {
  it('4D6 is parsed identically to 4d6', () => {
    const r = parseDiceNotation('4D6');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.dice).toHaveLength(4);
  });
  it('2D8+3 is parsed identically to 2d8+3', () => {
    const r = parseDiceNotation('2D8+3');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.modifier).toBe(3);
  });
});

describe('parseDiceNotation — invalid die type', () => {
  it('1d99 returns error with helpful message', () => {
    const r = parseDiceNotation('1d99');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/d99/);
    expect(r.error.message).toMatch(/Supported/);
  });
  it('1d7 returns error', () => {
    const r = parseDiceNotation('1d7');
    expect(r.ok).toBe(false);
  });
});

describe('parseDiceNotation — invalid notation', () => {
  it('gibberish returns InvalidNotation error with hint', () => {
    const r = parseDiceNotation('hello');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/Invalid notation/);
  });
  it('empty string returns an error', () => {
    expect(parseDiceNotation('').ok).toBe(false);
  });
  it('missing count (d6) returns an error', () => {
    expect(parseDiceNotation('d6').ok).toBe(false);
  });
  it('plain number (6) returns an error', () => {
    expect(parseDiceNotation('6').ok).toBe(false);
  });
});

describe('parseDiceNotation — boundary conditions', () => {
  it('0d6 returns OutOfRange error', () => {
    const r = parseDiceNotation('0d6');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/between 1 and 100/);
  });
  it('101d6 returns OutOfRange error', () => {
    expect(parseDiceNotation('101d6').ok).toBe(false);
  });
  it('100d6 is valid (upper boundary)', () => {
    expect(parseDiceNotation('100d6').ok).toBe(true);
  });
  it('1d6+0 is valid — modifier of 0 is allowed', () => {
    const r = parseDiceNotation('1d6+0');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.modifier).toBe(0);
  });
});

describe('parseDiceNotation — total calculation correctness', () => {
  it('total always equals sum-of-dice-values plus modifier', () => {
    for (let i = 0; i < 30; i++) {
      const r = parseDiceNotation('4d6+3');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const sum = r.result.dice.reduce((s, d) => s + d.value, 0);
      expect(r.result.total).toBe(sum + r.result.modifier);
    }
  });
  it('total is consistent for a combined pool (2d10+1d6)', () => {
    for (let i = 0; i < 30; i++) {
      const r = parseDiceNotation('2d10+1d6');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const sum = r.result.dice.reduce((s, d) => s + d.value, 0);
      expect(r.result.total).toBe(sum + r.result.modifier);
    }
  });
  it('total is consistent for a negative modifier (4d4-2)', () => {
    for (let i = 0; i < 30; i++) {
      const r = parseDiceNotation('4d4-2');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const sum = r.result.dice.reduce((s, d) => s + d.value, 0);
      expect(r.result.total).toBe(sum + r.result.modifier);
    }
  });
});
