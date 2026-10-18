// Headless smoke test: renders every screen in several states. Run from the project folder:  jsc tests/screens.js
load('tests/stubs.js');
var D = window.PF_DATA, results = [], fails = 0;
function tryRoute(label, hash) {
  location.hash = hash;
  try { listeners.hashchange(); results.push('ok   ' + label); }
  catch (e) { fails++; results.push('FAIL ' + label + '  ->  ' + e.name + ': ' + e.message); }
}
function iso(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

var S = window.PF_APP.state();
// A. brand-new user
['', 'welcome', 'start', 'founders', 'today', 'reveal', 'explore', 'career/pilot', 'rewards', 'portfolio', 'skillcheck', 'practice', 'code', 'profile'].forEach(function (r) { tryRoute('new user  #/' + r, '#/' + r); });
// B. finished the quiz, no career yet
S.profile = { name: 'Maya', grade: '9', subjects: ['Intro to Computer Science'], picks: ['coding', 'gaming'], hobbies: 'Video games', interests: 'gaming, coding', aspirations: 'build games', dailyMinutes: 45 };
S.personality = { dimensions: { analytical: 80, creative: 40, people: 50, leader: 40, investigator: 70, builder: 50 }, date: iso(0) };
['reveal', 'explore', 'explore?tab=tryouts', 'rewards', 'profile', 'portfolio', 'founders', 'today', 'schedule', 'practice', 'start'].forEach(function (r) { tryRoute('onboarded #/' + r, '#/' + r); });
D.CAREERS.forEach(function (c) { tryRoute('career page ' + c.id, '#/career/' + c.id); });
D.ACTIVITIES.forEach(function (a) { tryRoute('demo page ' + a.id, '#/tryout/' + a.id); });
// C. chose a career, not yet placed
D.CAREERS.forEach(function (c) {
  S.careerId = c.id; S.plan = null; S.skills = {};
  tryRoute('skill check for ' + c.id, '#/skillcheck');
  tryRoute('gate: today for ' + c.id, '#/today');
});
// D. placed + plan: every study screen for every career
var domainsSeen = {};
D.CAREERS.forEach(function (c) {
  S.careerId = c.id; S.plan = null; S.skills = {};
  c.domains.forEach(function (d) { S.skills[d] = { level: 2, placed: true, history: [{ date: iso(-2), acc: 0.8, level: 2 }, { date: iso(-1), acc: 0.6, level: 2 }] }; });
  ['today', 'schedule', 'schedule?tab=schedule', 'schedule?tab=schedule&more=1', 'practice', 'code', 'explore', 'rewards', 'portfolio'].forEach(function (r) { tryRoute(c.id + ' #/' + r, '#/' + r); });
  c.domains.forEach(function (d) { if (!domainsSeen[d]) { domainsSeen[d] = 1; tryRoute('practice/' + d, '#/practice/' + d); } });
  var ids = {};
  Object.keys(S.plan ? S.plan.days : {}).forEach(function (k) { S.plan.days[k].tasks.forEach(function (t) { if (t.type === 'lesson' || t.type === 'code') ids[t.type + ':' + t.id] = 1; }); });
  Object.keys(ids).slice(0, 6).forEach(function (k) { var t = k.split(':'); tryRoute(c.id + ' ' + t[0] + ' task', '#/' + t[0] + '/' + t[1]); });
});
// E. every exercise, and difficulty by pace and level
S.careerId = 'data-scientist'; S.plan = null; S.skills = {};
D.CAREERS.filter(function (c) { return c.id === 'data-scientist'; })[0].domains.forEach(function (d) { S.skills[d] = { level: 3, placed: true, history: [] }; });
tryRoute('prime plan', '#/today');
window.PF_EXERCISES.forEach(function (e) { tryRoute('exercise ' + e.id, '#/code/' + e.id); });
['slower', 'faster'].forEach(function (p) {
  S.settings.pace = p;
  [1, 2, 3, 4, 5].forEach(function (lv) {
    Object.keys(D.DOMAINS).forEach(function (d) { S.skills[d] = { level: lv, placed: true, history: [] }; });
    tryRoute('practice math L' + lv + ' ' + p, '#/practice/math');
    tryRoute('practice science L' + lv + ' ' + p, '#/practice/science');
  });
});
print(results.filter(function (r) { return r.indexOf('FAIL') === 0; }).slice(0, 40).join('\n') || '(no failures)');
print(results.length + ' screens rendered, ' + fails + ' failures');
