// Simulates many random students and reports how career match scores are distributed.
// Run from the project folder:  jsc tests/matching.js
load('tests/stubs.js');
var D = window.PF_DATA, S = window.PF_APP.state();
var seed = 12345; function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
var N = 2000, tops = [], gaps = [], topIds = {}, spread = [];
for (var n = 0; n < N; n++) {
  var answers = {};
  D.QUESTIONS.forEach(function (q, i) { answers[i] = Math.floor(rnd() * q.options.length); });
  var picks = []; var k = 1 + Math.floor(rnd() * 4);
  for (var j = 0; j < k; j++) picks.push(pick(D.INTEREST_TILES).id);
  var tiles = picks.map(function (id) { return D.INTEREST_TILES.filter(function (t) { return t.id === id; })[0]; });
  S.profile = { name: 'T', grade: '9', subjects: [], picks: picks, hobbies: tiles.map(function (t) { return t.label; }).join(', '), interests: tiles.map(function (t) { return t.kw.join(' '); }).join(' '), aspirations: '', dailyMinutes: 45 };
  S.personality = { answers: answers, dimensions: window.PF_APP.dimensionScores(answers), date: '2026-10-18' };
  var m = window.PF_APP.matchCareers();
  tops.push(m[0].score); gaps.push(m[0].score - m[1].score); spread.push(m[0].score - m[m.length - 1].score);
  topIds[m[0].c.id] = (topIds[m[0].c.id] || 0) + 1;
}
function pct(a, p) { var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.floor((b.length - 1) * p)]; }
print('top-match score   p10/p50/p90/max: ' + [pct(tops, 0.1), pct(tops, 0.5), pct(tops, 0.9), pct(tops, 1)].join(' / '));
print('gap #1 vs #2      p50: ' + pct(gaps, 0.5) + '   spread #1 vs last p50: ' + pct(spread, 0.5));
var ids = Object.keys(topIds).sort(function (a, b) { return topIds[b] - topIds[a]; });
print('distinct #1 careers: ' + ids.length + ' of ' + D.CAREERS.length + '; most common: ' + ids.slice(0, 4).map(function (i) { return i + ' ' + Math.round(100 * topIds[i] / N) + '%'; }).join(', '));
