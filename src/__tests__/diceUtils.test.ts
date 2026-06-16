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

describe('parseDiceNotation — arbitrary number of dice groups', () => {
  it('1d2+1d4+1d6+1d8+1d10+1d12+1d20+1d100 produces 8 dice across every type', () => {
    const r = parseDiceNotation('1d2+1d4+1d6+1d8+1d10+1d12+1d20+1d100');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.dice).toHaveLength(8);
    expect(r.result.dice.map(d => d.sides)).toEqual([2, 4, 6, 8, 10, 12, 20, 100]);
    expect(r.result.modifier).toBe(0);
  });
  it('3d6+2d8+5 sums dice groups and the flat modifier', () => {
    const r = parseDiceNotation('3d6+2d8+5');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.dice).toHaveLength(5);
    expect(r.result.modifier).toBe(5);
    const sum = r.result.dice.reduce((s, d) => s + d.value, 0);
    expect(r.result.total).toBe(sum + 5);
  });
  it('2d6+3-1 combines multiple flat modifiers', () => {
    const r = parseDiceNotation('2d6+3-1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.modifier).toBe(2);
  });
  it('a leading minus on a dice group is invalid (-1d6)', () => {
    expect(parseDiceNotation('-1d6').ok).toBe(false);
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

describe('parseDiceNotation — arbitrary die type d2..d100', () => {
  it('1d7 is valid (no dedicated art, within range)', () => {
    const r = parseDiceNotation('1d7');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.dice[0].sides).toBe(7);
    expect(r.result.dice[0].value).toBeGreaterThanOrEqual(1);
    expect(r.result.dice[0].value).toBeLessThanOrEqual(7);
  });
  it('1d99 is valid', () => {
    expect(parseDiceNotation('1d99').ok).toBe(true);
  });
  it('1d2 is valid (lower bound)', () => {
    expect(parseDiceNotation('1d2').ok).toBe(true);
  });
  it('1d1 returns an error (below 2) with helpful message', () => {
    const r = parseDiceNotation('1d1');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/d2 to d100/);
  });
  it('1d101 returns an error (over 100)', () => {
    const r = parseDiceNotation('1d101');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/d2 to d100/);
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
  it('d6 (implicit count) is valid — one d6', () => {
    const r = parseDiceNotation('d6');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.dice).toHaveLength(1);
    expect(r.result.dice[0].sides).toBe(6);
  });
  it('plain number (6) returns an error', () => {
    expect(parseDiceNotation('6').ok).toBe(false);
  });
});

describe('parseDiceNotation — keep highest/lowest and advantage', () => {
  it('4d6kh3 rolls 4 dice, keeps 3, total counts only kept', () => {
    for (let i = 0; i < 20; i++) {
      const r = parseDiceNotation('4d6kh3');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.result.dice).toHaveLength(4);
      const kept = r.result.dice.filter(d => d.kept);
      const dropped = r.result.dice.filter(d => !d.kept);
      expect(kept).toHaveLength(3);
      expect(dropped).toHaveLength(1);
      // the dropped die is the lowest; no kept die is below it
      const minKept = Math.min(...kept.map(d => d.value));
      expect(dropped[0].value).toBeLessThanOrEqual(minKept);
      expect(r.result.total).toBe(kept.reduce((s, d) => s + d.value, 0));
    }
  });
  it('2d20kl1 keeps the single lowest die', () => {
    for (let i = 0; i < 20; i++) {
      const r = parseDiceNotation('2d20kl1');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const kept = r.result.dice.filter(d => d.kept);
      expect(kept).toHaveLength(1);
      expect(kept[0].value).toBe(Math.min(...r.result.dice.map(d => d.value)));
    }
  });
  it('d20adv rolls 2d20 and keeps the highest', () => {
    for (let i = 0; i < 20; i++) {
      const r = parseDiceNotation('d20adv');
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.result.dice).toHaveLength(2);
      const kept = r.result.dice.filter(d => d.kept);
      expect(kept).toHaveLength(1);
      expect(kept[0].value).toBe(Math.max(...r.result.dice.map(d => d.value)));
    }
  });
  it('1d20disadvantage keeps the lowest of two', () => {
    const r = parseDiceNotation('1d20disadvantage');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.dice).toHaveLength(2);
    expect(r.result.dice.filter(d => d.kept)[0].value).toBe(
      Math.min(...r.result.dice.map(d => d.value)),
    );
  });
  it('combines keep with modifiers: total = kept dice + net modifier', () => {
    const r = parseDiceNotation('4d6kh3-7+5');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.modifier).toBe(-2);
    const keptSum = r.result.dice
      .filter(d => d.kept)
      .reduce((s, d) => s + d.value, 0);
    expect(r.result.total).toBe(keptSum - 2);
  });
  it('adv on a multi-die count is an error (2d6adv)', () => {
    const r = parseDiceNotation('2d6adv');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/single die/i);
  });
  it('keeping as many or more than rolled is an error (2d6kh3, 2d6kh2)', () => {
    expect(parseDiceNotation('2d6kh3').ok).toBe(false);
    expect(parseDiceNotation('2d6kh2').ok).toBe(false);
  });
  it('keep count is optional and defaults to 1 (2d20kl, 2d20kh)', () => {
    const lo = parseDiceNotation('2d20kl');
    expect(lo.ok).toBe(true);
    if (!lo.ok) return;
    expect(lo.result.dice.filter(d => d.kept)).toHaveLength(1);
    expect(lo.result.dice.filter(d => d.kept)[0].value).toBe(
      Math.min(...lo.result.dice.map(d => d.value)),
    );
    const hi = parseDiceNotation('2d20kh');
    expect(hi.ok).toBe(true);
    if (!hi.ok) return;
    expect(hi.result.dice.filter(d => d.kept)).toHaveLength(1);
  });
  it('space between die and keyword is allowed (4d6 kh3)', () => {
    const r = parseDiceNotation('4d6 kh3');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.dice.filter(d => d.kept)).toHaveLength(3);
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
