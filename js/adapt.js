// Adaptive difficulty and pace. Pure functions: no screens, no storage, so they are easy to test.
//
// What adapts, and how:
//  - LEVEL (per subject): two strong sets in a row (or one perfect set) moves up; two weak sets in a
//    row (or one very low set) moves down. One lucky or unlucky set never swings it by itself.
//  - PACE (from the last few sets): "slower" when recent accuracy is low, "faster" when it is high.
//    Slower = easier warm-ups, shorter sets, an easier lesson. Faster = harder questions mixed in,
//    longer sets, and a bonus stretch.
//  - Rushed sets (answered too fast to be real work) are never counted as evidence.
window.PF_ADAPT = (function () {
  const scored = (history) => (history || []).filter((h) => !h.placement && !h.rushed && typeof h.acc === 'number');
  const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

  // Sets taken at the student's current level, newest last. A level change starts a fresh run.
  function trailingAtLevel(skill) {
    const h = scored(skill.history);
    const run = [];
    for (let i = h.length - 1; i >= 0 && h[i].level === skill.level; i--) run.unshift(h[i]);
    return run;
  }

  // Call after the newest result is in skill.history. Returns what should happen to the level.
  function evaluate(skill) {
    const run = trailingAtLevel(skill);
    const last = run[run.length - 1];
    if (!last) return { change: 'same' };
    const two = run.slice(-2);
    const twoStrong = two.length === 2 && two.every((x) => x.acc >= 0.8);
    const twoWeak = two.length === 2 && two.every((x) => x.acc < 0.5);
    if (skill.level < 5 && (last.acc === 1 || twoStrong)) return { change: 'up', why: last.acc === 1 && !twoStrong ? 'perfect' : 'two-strong' };
    if (skill.level > 1 && (twoWeak || last.acc <= 0.2)) return { change: 'down', why: twoWeak ? 'two-weak' : 'very-low' };
    return { change: 'same', lastStrong: last.acc >= 0.8, lastWeak: last.acc < 0.5 };
  }

  // Plain-language progress toward the next level, for the student.
  function progressText(skill) {
    if (skill.level >= 5) return 'Top level: keep it sharp.';
    const run = trailingAtLevel(skill);
    const last = run[run.length - 1];
    if (last && last.acc >= 0.8) return 'One more strong set (or a perfect score) to level up.';
    return 'Score 80% or more on two sets in a row (or 100% once) to level up.';
  }

  // Pace from a list of recent scored accuracies (newest last).
  function paceFromAccs(accs, minSets) {
    if (accs.length < (minSets || 2)) return 'steady';
    const a = avg(accs.slice(-3));
    return a < 0.5 ? 'slower' : a >= 0.85 ? 'faster' : 'steady';
  }
  function paceFor(skill) { return paceFromAccs(scored(skill.history).map((h) => h.acc), 2); }

  // Pace across all subjects, from the most recent sets. `pref` is the student's own setting.
  function overallPace(skills, pref) {
    if (pref === 'slower' || pref === 'faster') return pref;
    const all = [];
    Object.values(skills || {}).forEach((s) => scored(s.history).forEach((h) => all.push(h)));
    all.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return paceFromAccs(all.map((h) => h.acc), 3);
  }
  function recentAverage(skills) {
    const all = [];
    Object.values(skills || {}).forEach((s) => scored(s.history).forEach((h) => all.push(h)));
    all.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return avg(all.slice(-3).map((h) => h.acc));
  }

  function describePace(pace, accAvg, chosen) {
    const pct = accAvg == null ? null : Math.round(accAvg * 100);
    if (chosen && pace === 'faster') return { label: 'Stepping it up', text: 'You chose a faster pace: longer sets with harder questions mixed in.' };
    if (chosen && pace === 'slower') return { label: 'Taking it slower', text: 'You chose a slower pace: shorter sets with easier warm-ups.' };
    if (pace === 'faster') return { label: 'Stepping it up', text: pct == null ? 'Questions are getting a little harder.' : `Your recent sets averaged ${pct}%, so we're mixing in harder questions.` };
    if (pace === 'slower') return { label: 'Taking it slower', text: pct == null ? 'Shorter sets and easier warm-ups.' : `Your recent sets averaged ${pct}%, so we're using easier warm-ups and shorter sets. This is how mastery works.` };
    return { label: 'Steady pace', text: 'Right where you should be.' };
  }

  // Which level each question in a set should be, newest design: a warm-up, then the real work,
  // and (when pace is "faster") a few above-level questions at the end.
  function mixLevels(count, level, pace) {
    const lv = [];
    const lo = Math.max(1, level - 1), hi = Math.min(5, level + 1);
    for (let i = 0; i < count; i++) {
      let q = level;
      if (pace === 'slower') q = i < Math.ceil(count / 2) ? lo : level;
      else if (pace === 'faster') q = i >= count - Math.max(1, Math.floor(count / 3)) ? hi : level;
      else q = i === 0 ? lo : level;
      lv.push(q);
    }
    return lv;
  }

  function setSize(base, pace) {
    return pace === 'slower' ? Math.max(3, base - 1) : pace === 'faster' ? Math.min(8, base + 1) : base;
  }

  // Lesson content: tier 1 (levels 1-2), tier 2 (level 3), tier 3 (levels 4-5), shifted by pace.
  function lessonTier(level, pace) {
    let tier = level <= 2 ? 1 : level === 3 ? 2 : 3;
    if (pace === 'slower' && tier > 1) tier -= 1;
    else if (pace === 'faster' && level === 2) tier = 2;
    return tier;
  }

  // Which Python exercise level to aim for.
  function codeTarget(level, skill, pace) {
    let t = level;
    if ((skill.clean || 0) >= 1) t += 1;
    if ((skill.struggle || 0) >= 1 || pace === 'slower') t -= 1;
    return Math.max(1, Math.min(5, t));
  }

  return { evaluate, progressText, paceFor, overallPace, recentAverage, describePace, mixLevels, setSize, lessonTier, codeTarget, scored };
})();
