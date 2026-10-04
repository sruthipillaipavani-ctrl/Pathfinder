// Practice question generation. Math, stats, and logic are generated fresh at
// five difficulty levels; other subjects draw from the static banks in data.js.
window.PF_PRACTICE = (function () {
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const frac = (n, d) => {
    const g = gcd(n, d);
    return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`;
  };
  const choose = (n, k) => {
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return Math.round(r);
  };

  // Build a multiple-choice question from a numeric answer.
  function numeric(q, answer, spread) {
    const opts = new Set([String(answer)]);
    const s = spread || Math.max(2, Math.ceil(Math.abs(answer) * 0.2));
    let guard = 0;
    while (opts.size < 4 && guard++ < 50) {
      const delta = rnd(1, s) * (Math.random() < 0.5 ? -1 : 1);
      const v = Number.isInteger(answer) ? answer + delta : +(answer + delta).toFixed(2);
      opts.add(String(v));
    }
    while (opts.size < 4) opts.add(String(answer + opts.size * 7));
    return mc(q, String(answer), [...opts]);
  }

  // First entry is the correct answer; pad with distinct fractions to four options.
  function opts4(list) {
    const out = [...new Set(list)];
    for (const f of ['1/2', '1/3', '1/4', '2/3', '3/4', '2/5', '1/6']) if (out.length < 4 && !out.includes(f)) out.push(f);
    return out.slice(0, 4);
  }

  function mc(q, answer, options) {
    const choices = shuffle(options);
    return { q, choices, answer: choices.indexOf(answer) };
  }

  const GEN = {
    math: [
      () => { const a = rnd(12, 99), b = rnd(12, 99); return numeric(`What is ${a} + ${b}?`, a + b, 10); },
      () => { const p = pick([10, 15, 20, 25, 40, 50, 75]), n = pick([40, 60, 80, 120, 200, 360]); return numeric(`What is ${p}% of ${n}?`, (p * n) / 100); },
      () => { const x = rnd(2, 12), a = rnd(2, 9), b = rnd(1, 20); return numeric(`Solve for x: ${a}x + ${b} = ${a * x + b}`, x, 4); },
      () => {
        const r1 = rnd(-6, 6), r2 = rnd(1, 8), s = r1 + r2, p = r1 * r2;
        const fmt = (n) => (n < 0 ? `− ${-n}` : `+ ${n}`);
        return numeric(`x² ${fmt(-s)}x ${fmt(p)} = 0 has two solutions. What is the larger one?`, Math.max(r1, r2), 4);
      },
      () => pick([
        () => { const n = pick([10, 20, 50, 100]); return numeric(`What is 1 + 2 + 3 + … + ${n}?`, (n * (n + 1)) / 2, 25); },
        () => { const n = pick([12, 18, 24, 36, 48, 60, 72]); let c = 0; for (let i = 1; i <= n; i++) if (n % i === 0) c++; return numeric(`How many positive divisors does ${n} have?`, c, 3); },
        () => { const a = pick([12, 18, 24, 30]), b = pick([16, 20, 27, 45]); return numeric(`What is the least common multiple of ${a} and ${b}?`, (a * b) / gcd(a, b), 30); },
        () => { const k = rnd(3, 7); return numeric(`What is the remainder when 2^${k + 4} is divided by 7?`, Math.pow(2, k + 4) % 7, 3); },
      ])(),
    ],
    stats: [
      () => { const base = rnd(2, 9); const xs = Array.from({ length: 5 }, () => base + rnd(0, 10)); const sum = xs.reduce((s, v) => s + v, 0); const adj = sum % 5; xs[0] -= adj; return numeric(`What is the mean (average) of ${xs.join(', ')}?`, (sum - adj) / 5, 3); },
      () => { const xs = Array.from({ length: 7 }, () => rnd(1, 40)); const sorted = xs.slice().sort((a, b) => a - b); return pick([
        () => numeric(`What is the median of ${xs.join(', ')}?`, sorted[3], 4),
        () => numeric(`What is the range of ${xs.join(', ')}?`, sorted[6] - sorted[0], 5),
      ])(); },
      () => pick([
        () => { const k = rnd(1, 5); return mc(`You roll a fair 6-sided die. What is the probability of rolling a number greater than ${k}?`, frac(6 - k, 6), opts4([frac(6 - k, 6), frac(k, 6), '1/6', frac(6 - k + 1, 6)])); },
        () => { const r = rnd(2, 6), b = rnd(2, 6); return mc(`A bag has ${r} red and ${b} blue marbles. Probability of picking red?`, frac(r, r + b), opts4([frac(r, r + b), frac(b, r + b), frac(1, r + b), frac(r, b)])); },
      ])(),
      () => pick([
        () => { const n = rnd(5, 10), k = rnd(2, 3); return numeric(`How many ways can you choose ${k} students from ${n} for a team?`, choose(n, k), 10); },
        () => { const p = pick([2, 3, 4, 5]); return numeric(`A game pays $${p * 10} if you win and the chance of winning is 1/${p}. What is the expected payout in dollars?`, 10, 4); },
      ])(),
      () => pick([
        () => { const r = rnd(3, 5), b = rnd(2, 4), t = r + b; return mc(`A bag has ${r} red and ${b} blue marbles. You draw 2 without replacement. Probability both are red?`, frac(r * (r - 1), t * (t - 1)), opts4([frac(r * (r - 1), t * (t - 1)), frac(r * r, t * t), frac(r, t), frac(r - 1, t)])); },
        () => { return numeric('Three fair coins are flipped. Out of 8 equally likely outcomes, how many have exactly 2 heads?', 3, 2); },
      ])(),
    ],
    logic: [
      () => { const a = rnd(1, 20), d = rnd(2, 9); const s = [0, 1, 2, 3].map((i) => a + i * d); return numeric(`What comes next? ${s.join(', ')}, ?`, a + 4 * d, 5); },
      () => { const a = rnd(1, 4), r = rnd(2, 3); const s = [0, 1, 2, 3].map((i) => a * Math.pow(r, i)); return numeric(`What comes next? ${s.join(', ')}, ?`, a * Math.pow(r, 4), 10); },
      () => { const a = rnd(1, 5), b = rnd(1, 5); const s = [a, b]; for (let i = 0; i < 4; i++) s.push(s[s.length - 1] + s[s.length - 2]); return numeric(`Each number is the sum of the two before it. What comes next? ${s.join(', ')}, ?`, s[4] + s[5], 6); },
      () => pick([
        () => { const o = rnd(1, 4); const s = [1, 2, 3, 4].map((i) => (i + o) * (i + o)); return numeric(`What comes next? ${s.join(', ')}, ?`, (5 + o) * (5 + o), 8); },
        () => numeric('What comes next? 2, 3, 5, 7, 11, 13, ?', 17, 3),
      ])(),
      () => { const a = rnd(1, 5), d = rnd(1, 3); const s = [a]; for (let i = 1; i < 5; i++) s.push(s[i - 1] + d * i); return numeric(`The gaps grow by ${d} each time. What comes next? ${s.join(', ')}, ?`, s[4] + d * 5, 5); },
    ],
  };

  // Returns `count` questions for a domain at a level (1–5).
  function makeSet(domain, level, count) {
    count = count || 5;
    if (GEN[domain]) {
      const gens = GEN[domain];
      return Array.from({ length: count }, (_, i) => {
        // Mostly current level, with an occasional review question one level below.
        const lv = i === 0 && level > 1 ? level - 1 : level;
        return Object.assign(gens[Math.min(lv, gens.length) - 1](), { level: lv });
      });
    }
    const bank = (window.PF_DATA.BANK[domain] || []).map(([q, choices, a, lv]) => ({ q, choices, a, lv }));
    const target = Math.min(level, 3);
    let pool = bank.filter((b) => b.lv === target);
    // Levels 4–5 mix in the hardest questions plus the level below for a longer set.
    if (pool.length < count) pool = pool.concat(shuffle(bank.filter((b) => b.lv === target - 1 || b.lv === target + 1)));
    return shuffle(pool).slice(0, count).map((b) => Object.assign(mc(b.q, b.choices[b.a], b.choices), { level: b.lv }));
  }

  return { makeSet, shuffle };
})();
