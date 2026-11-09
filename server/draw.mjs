import { randomInt, randomBytes } from 'node:crypto';

// Augmenting-path matching terminates even when exclusions make a draw impossible.
export function createDraw(exclusions) {
  const names = Object.keys(exclusions);
  if (names.length < 2 || names.some(n => !Array.isArray(exclusions[n]) || exclusions[n].some(x => !names.includes(x)))) {
    throw new Error('Provide at least two participants and valid exclusion names.');
  }
  const shuffle = list => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const choices = Object.fromEntries(names.map(n => [n, shuffle(names.filter(x => x !== n && !exclusions[n].includes(x)))]));
  const owner = new Map();
  function match(giver, seen) {
    for (const receiver of choices[giver]) {
      if (seen.has(receiver)) continue;
      seen.add(receiver);
      if (!owner.has(receiver) || match(owner.get(receiver), seen)) {
        owner.set(receiver, giver);
        return true;
      }
    }
    return false;
  }
  for (const name of shuffle(names)) {
    if (!match(name, new Set())) throw new Error('No valid draw exists. Review the exclusions.');
  }
  return [...owner].map(([recipient, giver]) => ({ giver, recipient, code: randomBytes(16).toString('hex') }));
}

export function validateDraw(draw, exclusions) {
  const names = Object.keys(exclusions);
  return Array.isArray(draw) && draw.length === names.length &&
    new Set(draw.map(x => x.giver)).size === names.length &&
    new Set(draw.map(x => x.recipient)).size === names.length &&
    new Set(draw.map(x => x.code)).size === names.length &&
    draw.every(x => names.includes(x.giver) && names.includes(x.recipient) && x.giver !== x.recipient &&
      !exclusions[x.giver].includes(x.recipient) && /^[a-f0-9]{32}$/.test(x.code));
}
