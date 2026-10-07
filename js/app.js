// Pathfinder app: routing, state, views, schedule generation, integrity tracking, rewards.
(function () {
  const D = window.PF_DATA;
  const P = window.PF_PRACTICE;
  const STORE_KEY = 'pathfinder.v1';
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---------- dates ----------
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const prettyDate = (s) => parse(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  // ---------- state ----------
  const blank = () => ({
    profile: null, personality: null, careerId: null, plan: null,
    skills: {}, xp: 0, coins: 0, badges: {}, reflections: [],
    integrity: { score: 100, log: [] },
    stats: { tasksDone: 0, reflectionsOk: 0 },
    rewards: [
      { id: uid(), name: 'Pick the movie for family night', cost: 50 },
      { id: uid(), name: 'Extra 30 minutes of free time', cost: 80 },
      { id: uid(), name: 'Favorite treat or snack', cost: 120 },
    ],
    version: 2, codeDone: {},
    tryouts: {}, activity: {}, rest: {},
    settings: { demo: false },
  });
  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.settings) delete saved.settings.pandaName;
        if (saved.version !== 2) { saved.plan = null; saved.version = 2; } // v2: lessons first, Python exercises
        return Object.assign(blank(), saved);
      }
    } catch (e) { /* fall through */ }
    return blank();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
  }

  const career = () => D.CAREERS.find((c) => c.id === S.careerId);
  const skill = (d) => (S.skills[d] = S.skills[d] || { level: 1, history: [] });
  const isPlaced = (d) => { const s = skill(d); return !!s.placed || s.history.length > 0; };
  const levelName = (n) => D.SKILL_LEVELS[Math.min(n, 5) - 1];
  const unplaced = () => (S.careerId ? career().domains.filter((d) => !isPlaced(d)) : []);
  const level = () => Math.floor(S.xp / 250) + 1;
  const levelTitle = (l) => D.LEVEL_TITLES[Math.min(l - 1, D.LEVEL_TITLES.length - 1)];

  // ---------- toasts & rewards ----------
  function toast(msg, kind) {
    const el = document.createElement('div');
    el.className = `toast ${kind || ''}`;
    el.innerHTML = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 3800);
    setTimeout(() => el.remove(), 4300);
  }

  function addXP(n, why) {
    n = Math.max(0, Math.round(n));
    if (!n) return;
    S.activity[today()] = true; // any earned XP counts as showing up today
    const before = level();
    S.xp += n;
    const coinsBefore = Math.floor((S.xp - n) / 10);
    S.coins += Math.floor(S.xp / 10) - coinsBefore;
    toast(`+${n} XP${why ? ' · ' + esc(why) : ''}`, 'xp');
    if (level() > before) {
      toast(`🎉 Level up! You are now Level ${level()} — <b>${levelTitle(level())}</b>`, 'big');
      confetti();
    }
  }

  function award(id) {
    if (S.badges[id]) return;
    const b = D.BADGES.find((x) => x.id === id);
    if (!b) return;
    S.badges[id] = today();
    toast(`${b.emoji} Badge unlocked: <b>${esc(b.name)}</b>`, 'big');
    confetti();
  }

  function integrity(delta, msg) {
    S.integrity.score = Math.max(0, Math.min(100, S.integrity.score + delta));
    if (msg) S.integrity.log.unshift({ date: today(), delta, msg });
    S.integrity.log = S.integrity.log.slice(0, 60);
    if (delta < 0) toast(`🛡️ Integrity ${delta}: ${esc(msg)}`, 'warn');
  }

  function checkBadges() {
    if (S.personality) award('explorer');
    if (S.careerId) award('pathfinder');
    if (S.stats.tasksDone >= 1) award('first-step');
    const st = streak();
    if (st >= 3) award('streak-3');
    if (st >= 7) award('streak-7');
    if (st >= 30) award('streak-30');
    // Levels only count toward badges once earned through practice, not from a placement result.
    const maxLv = Math.max(1, ...Object.values(S.skills).filter((s) => s.history.some((h) => !h.placement)).map((s) => s.level));
    if (maxLv >= 3) award('level-3');
    if (maxLv >= 5) award('level-5');
    if (S.stats.reflectionsOk >= 5) award('thinker');
    if (S.stats.tasksDone >= 15 && S.integrity.score >= 95) award('honest');
    if (Object.keys(S.tryouts).length >= 3) award('curious');
    if (S.xp >= 1000) award('xp-1000');
  }

  function confetti() {
    const colors = ['#7c5cff', '#22c1a6', '#ffb020', '#ff5c8a', '#3fa9ff'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.4 + 's';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 2600);
    }
  }

  // ---------- personality & matching ----------
  function traitScores(answers) {
    const sums = {}, counts = {};
    Object.keys(D.TRAITS).forEach((t) => { sums[t] = 0; counts[t] = 0; });
    D.QUESTIONS.forEach((q, i) => { if (answers[i]) { sums[q.t] += answers[i]; counts[q.t]++; } });
    const out = {};
    Object.keys(sums).forEach((t) => { out[t] = counts[t] ? Math.round(((sums[t] / counts[t]) - 1) / 4 * 100) : 0; });
    return out;
  }

  function matchCareers() {
    const tr = S.personality.traits;
    const p = S.profile;
    const text = [p.hobbies, p.interests, p.aspirations].join(' ').toLowerCase();
    return D.CAREERS.map((c) => {
      const wsum = Object.values(c.traits).reduce((a, b) => a + b, 0);
      const traitFit = Object.entries(c.traits).reduce((s, [t, w]) => s + (tr[t] || 0) * w, 0) / wsum; // 0-100
      const has = (phrase) => new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`).test(text);
      const kw = c.keywords.filter(has);
      // Interests the student tapped (as friendly labels) that connect to this career.
      const likedTiles = (p.picks || []).map((id) => D.INTEREST_TILES.find((t) => t.id === id)).filter((t) => t && t.kw.some((k) => c.keywords.includes(k)));
      const picked = (p.subjects || []).map(D.baseSubject);
      const subj = c.subjects.filter((s) => picked.includes(s));
      const named = c.title.toLowerCase().split(/\s*[/()]\s*/).filter(Boolean).some(has);
      // Activities the student tried and enjoyed nudge matching careers up (and ones they disliked nudge down).
      const tried = D.ACTIVITIES.filter((a) => a.careers.includes(c.id) && S.tryouts[a.id]);
      const tryBonus = Math.max(-6, Math.min(10, tried.reduce((n, a) => n + ({ 4: 5, 3: 3, 2: 0, 1: -2 }[S.tryouts[a.id].rating] || 0), 0)));
      const loved = tried.filter((a) => S.tryouts[a.id].rating >= 3);
      const score = Math.max(1, Math.min(99, Math.round(traitFit * 0.65 + Math.min(kw.length, 4) * 5 + Math.min(subj.length, 3) * 5 + (named ? 10 : 0) + tryBonus)));
      const reasons = [];
      const topTraits = Object.entries(c.traits).sort((a, b) => b[1] - a[1]).slice(0, 2).filter(([t]) => tr[t] >= 55);
      if (topTraits.length) reasons.push(`Your <b>${topTraits.map(([t]) => D.TRAITS[t].name).join(' + ')}</b> side fits this job`);
      if (likedTiles.length) reasons.push(`You love <b>${likedTiles.slice(0, 3).map((t) => esc(t.label.toLowerCase())).join(', ')}</b>`);
      else if (kw.length) reasons.push(`You mentioned <b>${kw.slice(0, 3).map(esc).join(', ')}</b>`);
      if (subj.length) reasons.push(`You enjoy <b>${subj.map(esc).join(', ')}</b>`);
      if (named) reasons.push('It matches a goal you wrote down');
      if (loved.length) reasons.push(`You enjoyed trying <b>${loved.slice(0, 2).map((a) => esc(a.name)).join(', ')}</b>`);
      return { c, score, reasons };
    }).sort((a, b) => b.score - a.score);
  }

  // ---------- schedule ----------
  function dayCompletion(day) {
    if (!day || !day.tasks.length) return 0;
    return day.tasks.filter((t) => t.status === 'done').length / day.tasks.length;
  }

  // Looks at recent days to decide how hard the next days should be.
  function stamina() {
    const t = today();
    const past = [];
    for (let i = 1; i <= 7; i++) {
      const d = S.plan && S.plan.days[addDays(t, -i)];
      if (d && addDays(t, -i) >= S.plan.start) past.push(dayCompletion(d));
    }
    const strongDays = S.plan ? Object.entries(S.plan.days).filter(([k, d]) => k < t && dayCompletion(d) >= 0.8).length : 0;
    let factor = Math.min(1.3, 0.7 + strongDays * 0.03);
    let note = strongDays ? `Your daily load has grown ${Math.round((factor / 0.7 - 1) * 100)}% since you started — that's stamina!` : 'Starting light so you can build the habit.';
    let stretch = false;
    const recent = past.slice(0, 3);
    const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 1;
    const accs = Object.values(S.skills).flatMap((s) => s.history.slice(-2).map((h) => h.acc));
    const accAvg = accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : 0;
    if (recent.length >= 2 && recentAvg < 0.5) {
      factor *= 0.8;
      note = 'You missed some tasks recently, so upcoming days are a bit lighter. Small wins first!';
    } else if (recent.length >= 2 && recentAvg >= 0.9 && accAvg >= 0.8) {
      stretch = true;
      note = 'You are crushing it — bonus stretch challenges have been added to upcoming days.';
    }
    return { factor, note, stretch };
  }

  function generateDay(date) {
    const c = career();
    const idx = daysBetween(S.plan.start, date);
    const st = stamina();
    const total = (S.profile.dailyMinutes || 45) * st.factor;
    const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);
    // Each day has one theme subject: learn it first, then practice it. Every other day the theme is the weakest subject.
    const weakest = c.domains.slice().sort((a, b) => skill(a).level - skill(b).level)[0];
    const dom = idx % 2 === 0 ? weakest : c.domains[idx % c.domains.length];
    const name = D.DOMAINS[dom].name;
    const tasks = [{ id: uid(), type: 'lesson', domain: dom, title: `Learn: ${name}`, minutes: round5(total * 0.35), status: 'todo' }];
    if (dom === 'coding') tasks.push({ id: uid(), type: 'code', domain: 'coding', title: 'Python exercise', minutes: round5(total * 0.45), status: 'todo' });
    else tasks.push({ id: uid(), type: 'practice', domain: dom, n: Math.max(4, Math.min(7, Math.round(5 * st.factor))), title: `${name} practice`, minutes: round5(total * 0.35), status: 'todo' });
    tasks.push({ id: uid(), type: 'reflect', title: 'Daily reflection', prompt: fillCareer(D.REFLECT_PROMPTS[idx % D.REFLECT_PROMPTS.length], c.title), minutes: 5, status: 'todo' });
    if (st.stretch) {
      const d2 = c.domains[(idx + 1) % c.domains.length];
      if (d2 !== 'coding') tasks.push({ id: uid(), type: 'practice', domain: d2, stretch: true, title: `Stretch challenge: ${D.DOMAINS[d2].name}`, minutes: 10, status: 'todo' });
    }
    if (idx % 7 === 6) {
      const ms = milestones(c);
      tasks.push({ id: uid(), type: 'milestone', title: ms[Math.floor(idx / 7) % ms.length], minutes: 15, status: 'todo' });
    }
    return { tasks, edited: false };
  }

  // Prompts say "a {career}"; swap in the right article ("an Actuary", "a Pilot").
  function fillCareer(text, title) {
    return text.replace(/\ba \{career\}/g, `${/^[aeio]/i.test(title) ? 'an' : 'a'} ${title}`).replace(/\{career\}/g, title);
  }

  function milestones(c) {
    const stage = gradeStage(S.profile.grade);
    const stageItems = c.path[stage] || [];
    return stageItems.map((s) => `Roadmap step: ${s}`).concat(c.competitions.map((x) => `Look up and plan for: ${x}`));
  }

  function gradeStage(g) {
    const n = Number(g);
    return n <= 8 ? 'ms' : String(Math.min(12, n));
  }

  // Creates past-through-upcoming days. Future days that are untouched get
  // regenerated so they adapt to the student's latest accuracy and completion.
  function ensureSchedule() {
    if (!S.careerId) return;
    if (!S.plan || S.plan.careerId !== S.careerId) S.plan = { start: today(), careerId: S.careerId, days: {} };
    const t = today();
    for (let d = S.plan.start; d <= addDays(t, 13); d = addDays(d, 1)) {
      const day = S.plan.days[d];
      if (!day) S.plan.days[d] = generateDay(d);
      else if (d > t && !day.edited && day.tasks.every((x) => x.status === 'todo')) {
        const fresh = generateDay(d);
        // Keep task ids stable when the shape matches, so links don't break.
        fresh.tasks.forEach((x, i) => { if (day.tasks[i] && day.tasks[i].type === x.type) x.id = day.tasks[i].id; });
        S.plan.days[d] = fresh;
      }
    }
    save();
  }

  function findTask(id) {
    for (const [date, day] of Object.entries(S.plan ? S.plan.days : {})) {
      const t = day.tasks.find((x) => x.id === id);
      if (t) return { date, day, task: t };
    }
    return null;
  }

  function streak() {
    if (!S.plan) return 0;
    let n = 0;
    let d = today();
    if (dayCompletion(S.plan.days[d]) < 0.5) d = addDays(d, -1); // today still in progress
    while (S.plan.days[d] && dayCompletion(S.plan.days[d]) >= 0.5) { n++; d = addDays(d, -1); }
    return n;
  }

  function completeTask(id, verified, result, xp, why) {
    const f = findTask(id);
    if (!f || f.task.status === 'done') return;
    Object.assign(f.task, { status: 'done', verified, result, doneAt: Date.now() });
    S.stats.tasksDone++;
    addXP(xp * (S.integrity.score >= 80 ? 1 : 0.6), why);
    if (verified !== 'self') integrity(+1);
    if (dayCompletion(f.day) === 1) { award('perfect-day'); addXP(25, 'Perfect day bonus'); }
    checkBadges();
    save();
  }

  // ---------- reflection checks (the honesty tracker for written work) ----------
  function words(s) { return (s.toLowerCase().match(/[a-z']+/g) || []); }
  function jaccard(a, b) {
    const A = new Set(a), B = new Set(b);
    const inter = [...A].filter((x) => B.has(x)).length;
    return inter / (A.size + B.size - inter || 1);
  }
  function checkReflection(text, meta) {
    const w = words(text);
    const issues = [];
    if (w.length < 30) issues.push(`Write at least 30 words (you have ${w.length}).`);
    const uniq = new Set(w).size / (w.length || 1);
    if (w.length >= 10 && uniq < 0.45) issues.push('Too many repeated words — explain your thinking in full sentences.');
    const noVowel = w.filter((x) => x.length > 3 && !/[aeiouy]/.test(x)).length;
    if (noVowel / (w.length || 1) > 0.15) issues.push('That looks like random keyboard letters.');
    const longJunk = w.filter((x) => x.length > 18).length;
    if (longJunk > 1) issues.push('Some words look like gibberish.');
    const similar = S.reflections.some((r) => jaccard(words(r), w) > 0.7);
    if (similar) issues.push('This is almost the same as an earlier reflection. Write something new about today.');
    if (meta.pasted > text.length * 0.5) issues.push('Pasted text is not accepted — write it in your own words.');
    const mins = (Date.now() - (meta.start || Date.now())) / 60000;
    const wpm = mins > 0 ? w.length / mins : 999;
    const flags = [];
    if (w.length >= 30 && wpm > 120 && !meta.pasted) flags.push('Typed unusually fast');
    return { ok: !issues.length, issues, flags };
  }

  // ---------- router ----------
  const routes = {};
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function currentRoute() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, query] = h.split('?');
    const params = Object.fromEntries(new URLSearchParams(query || ''));
    return { name: path.split('/')[0] || '', arg: path.split('/')[1], params };
  }
  const FOCUS = ['welcome', 'start', 'skillcheck', 'lesson', 'code', 'focus', 'tryout'];
  const ALIASES = { careers: 'reveal', test: 'start', me: 'rewards', home: 'today' };
  let timers = [];
  const clearTimers = () => { timers.forEach(clearInterval); timers = []; };
  const exitTarget = (n) => (n === 'tryout' ? '#/explore?tab=tryouts' : n === 'start' ? '#/' : S.careerId ? '#/today' : '#/reveal');

  function render() {
    stopFocusTimer();
    clearTimers();
    let { name, arg, params } = currentRoute();
    name = ALIASES[name] || name;
    const STUDY = ['today', 'schedule', 'practice', 'focus', 'lesson', 'code', 'skillcheck'];
    if (!S.personality) { if (name !== 'welcome' && name !== 'start') name = S.profile ? 'start' : 'welcome'; }
    else if (!S.careerId && STUDY.includes(name)) name = 'reveal';
    if (!name) name = S.careerId ? 'today' : S.personality ? 'reveal' : S.profile ? 'start' : 'welcome';
    // Before any task is assigned, the student's level is checked with a short placement.
    if (S.careerId && unplaced().length && ['today', 'schedule', 'practice', 'focus', 'lesson', 'code'].includes(name)) name = 'skillcheck';
    if (name === 'skillcheck' && S.careerId && !unplaced().length) name = 'today';
    if (currentRoute().name && currentRoute().name !== name) history.replaceState(null, '', `#/${name}`);
    pl = name === 'practice' ? pl : null;
    if (S.careerId && !unplaced().length) ensureSchedule();
    const view = routes[name] || routes.welcome;
    const focusMode = FOCUS.includes(name) || ((name === 'practice' || name === 'code') && !!arg);
    document.body.classList.toggle('focus', focusMode);
    document.body.dataset.route = name;
    const app = $('#app');
    app.className = name === 'explore' ? 'wide' : '';
    app.innerHTML = view.html(arg, params);
    $('#exit').setAttribute('href', exitTarget(name));
    renderNav(name);
    if (view.bind) view.bind(arg, params);
    window.scrollTo(0, 0);
  }

  function renderNav(active) {
    const act = { career: 'explore', tryout: 'explore', lesson: 'today', focus: 'today', code: 'practice', profile: 'rewards' }[active] || active;
    if (!S.personality) { $('#nav').innerHTML = ''; $('#hud').innerHTML = ''; return; }
    const items = S.careerId
      ? [['today', '🏠', 'Today'], ['schedule', '🗺️', 'Path'], ['practice', '🧠', 'Practice'], ['explore', '🔭', 'Explore']]
      : [['reveal', '✨', 'Matches'], ['explore', '🔭', 'Explore']];
    items.push(['rewards', '', 'Me']);
    $('#nav').innerHTML = items.map(([k, ico, label]) =>
      `<a href="#/${k}" class="${act === k ? 'active' : ''}">${ico ? `<span class="ico">${ico}</span>` : ''}${label}</a>`).join('');
    $('#hud').innerHTML = S.careerId ? `<a class="chip-stat" href="#/rewards" title="Day streak">🔥 ${streak()}</a><a class="chip-stat" href="#/rewards" title="Level">⭐ ${level()}</a>` : '';
  }

  // ---------- views ----------
  const money = (n) => (n == null ? 'Varies' : n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  const shortEdu = (e) => (/^Medical/.test(e) ? 'Medical school' : /^Law/.test(e) ? 'Law school' : /^Doctoral/.test(e) ? 'Doctorate' : /^Master/.test(e) ? "Master's" : /^Bachelor/.test(e) ? "Bachelor's" : /apprentice/i.test(e) ? 'Apprenticeship' : /^No set/.test(e) ? 'No set path' : e);
  function facts(c) {
    const g = c.growth;
    return `<div class="facts">
      <div class="fact"><b>${money(c.pay)}</b><small>median pay / year</small></div>
      <div class="fact"><b class="${g > 0 ? 'up' : g < 0 ? 'down' : ''}">${g == null ? '—' : (g > 0 ? '▲ ' : g < 0 ? '▼ ' : '') + Math.abs(g) + '%'}</b><small>job growth, 2025–35</small></div>
      <div class="fact"><b>${esc(shortEdu(c.edu || ''))}</b><small>typical education</small></div>
      ${c.usn ? `<div class="fact"><b>#${c.usn}</b><small>U.S. News 2026</small></div>` : ''}
    </div>`;
  }
  const article = (t) => (/^[aeio]/i.test(t) ? 'an' : 'a');

  // ---------- landing (the hook) ----------
  routes.welcome = {
    html: () => {
      const back = S.profile && S.personality;
      const c0 = P.shuffle(D.CAREERS)[0];
      return `
      <section class="landing">
        <p class="eyebrow">${back ? `Welcome back, ${esc(S.profile.name)}` : 'Career planning for students'}</p>
        <h1>I want to be<br><span class="rotator" id="rot">${article(c0.title)} ${esc(c0.title)} ${c0.emoji}</span></h1>
        <p class="sub">${back ? 'Pick up where you left off.' : 'Explore careers that fit your interests, then build a practical plan for classes, activities, and skills.'}</p>
        <a class="btn big" href="#/${back ? (S.careerId ? 'today' : 'reveal') : 'start'}">${back ? 'Continue →' : 'Find my career →'}</a>
        <p class="fine">${back ? '' : 'About 2 minutes · Free · No account required'}</p>
      </section>`;
    },
    bind: () => {
      const el = $('#rot');
      const order = P.shuffle(D.CAREERS);
      let i = 0;
      timers.push(setInterval(() => {
        el.classList.add('out');
        setTimeout(() => { const c = order[++i % order.length]; el.textContent = `${article(c.title)} ${c.title} ${c.emoji}`; el.classList.remove('out'); }, 260);
      }, 2000));
    },
  };

  // ---------- quick start: one question at a time ----------
  let ob = null;
  let revealFresh = false;
  const OB_STEPS = ['name', 'grade', 'interests', 'subjects', 'quiz'];
  const OB_QUIZ = 12;
  const FACES = [['1', 'Not me'], ['2', 'A little'], ['3', 'Sometimes'], ['4', 'Mostly'], ['5', 'Totally me']];

  function obInit(params) {
    const p = S.profile;
    const toQuiz = p && (!S.personality || params.step === 'quiz');
    ob = { step: toQuiz ? 'quiz' : 'name', qi: 0, answers: {}, name: p ? p.name : '', grade: p ? String(p.grade) : '', picks: p && p.picks ? p.picks.slice() : [], subjects: p ? p.subjects.slice() : [] };
  }

  function subjectChips(grade, selected) {
    return D.subjectsFor(grade).map(([label]) => `<label class="chip"><input type="checkbox" name="subjects" value="${esc(label)}" ${(selected || []).includes(label) ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('');
  }

  routes.start = {
    html: (arg, params) => { obInit(params); return `<section class="ob" id="ob"></section>`; },
    bind: () => drawStart(),
  };

  function obSaveProfile() {
    const picked = D.INTEREST_TILES.filter((t) => ob.picks.includes(t.id));
    S.profile = Object.assign({ aspirations: '', dailyMinutes: 45 }, S.profile || {}, {
      name: ob.name, grade: ob.grade, picks: ob.picks.slice(), subjects: ob.subjects.slice(),
      hobbies: picked.map((t) => t.label).join(', '),
      interests: [...new Set(picked.flatMap((t) => t.kw))].join(', '),
    });
    save();
  }

  function drawStart() {
    const box = $('#ob');
    if (!box || !ob) return;
    const si = OB_STEPS.indexOf(ob.step);
    const done = ob.step === 'quiz' ? 4 + ob.qi : si;
    const pct = Math.round((done / (4 + OB_QUIZ)) * 100);
    const back = () => { const k = OB_STEPS.indexOf(ob.step); if (ob.step === 'quiz' && ob.qi > 0) ob.qi--; else if (k > 0) { ob.step = OB_STEPS[k - 1]; } drawStart(); };
    const shell = (say, inner, foot) => `
      <div class="ob-top"><button class="ob-back" id="ob-back" ${ob.step === 'name' ? 'hidden' : ''} aria-label="Back">←</button><div class="progress"><div style="width:${pct}%"></div></div></div>
      <p class="ob-context">${esc(say.t)}</p>
      ${inner}${foot ? `<div class="ob-foot">${foot}</div>` : ''}`;
    const bindBack = () => { const b = $('#ob-back'); if (b && !b.hidden) b.addEventListener('click', back); };

    if (ob.step === 'name') {
      box.innerHTML = shell({ t: 'First, a few details to personalize your career matches.' },
        `<h1>What should I call you?</h1><input class="big-input" id="ob-name" maxlength="30" placeholder="Your first name" autocomplete="given-name" value="${esc(ob.name)}">`,
        `<span></span><button class="btn big" id="ob-next" ${ob.name.trim() ? '' : 'disabled'}>Continue →</button>`);
      const inp = $('#ob-name'), nx = $('#ob-next');
      inp.focus();
      const go1 = () => { if (!inp.value.trim()) return; ob.name = inp.value.trim(); ob.step = 'grade'; drawStart(); };
      inp.addEventListener('input', () => { nx.disabled = !inp.value.trim(); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go1(); });
      nx.addEventListener('click', go1);
    } else if (ob.step === 'grade') {
      box.innerHTML = shell({ t: `Thanks, ${ob.name}. Your grade helps us make useful course suggestions.` },
        `<h1>Which grade are you in?</h1><div class="grades">${[6, 7, 8, 9, 10, 11, 12].map((g) => `<button class="grade-btn ${String(g) === ob.grade ? 'sel' : ''}" data-g="${g}">${g}<small>${g <= 8 ? 'middle' : 'high'}</small></button>`).join('')}</div>`);
      $$('.grade-btn').forEach((b) => b.addEventListener('click', () => {
        if (ob.grade !== b.dataset.g) ob.subjects = []; // subject choices depend on grade
        ob.grade = b.dataset.g; b.classList.add('sel');
        setTimeout(() => { ob.step = 'interests'; drawStart(); }, 200);
      }));
    } else if (ob.step === 'interests') {
      box.innerHTML = shell({ t: 'Select the interests and activities that sound most like you.' },
        `<h1>What do you love doing?</h1><div class="picks">${D.INTEREST_TILES.map((t) => `<button class="pick ${ob.picks.includes(t.id) ? 'sel' : ''}" data-id="${t.id}"><span>${t.emoji}</span>${esc(t.label)}</button>`).join('')}</div>`,
        `<small class="muted" id="pick-count"></small><button class="btn big" id="ob-next">Continue →</button>`);
      const upd = () => { $('#pick-count').textContent = ob.picks.length ? `${ob.picks.length} picked` : 'Pick at least one'; $('#ob-next').disabled = !ob.picks.length; };
      upd();
      $$('.pick').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.id;
        ob.picks = ob.picks.includes(id) ? ob.picks.filter((x) => x !== id) : [...ob.picks, id];
        b.classList.toggle('sel'); upd();
      }));
      $('#ob-next').addEventListener('click', () => { ob.step = 'subjects'; drawStart(); });
    } else if (ob.step === 'subjects') {
      box.innerHTML = shell({ t: 'Choose any subjects you enjoy. This step is optional.' },
        `<h1>Favorite subjects</h1><div class="chips" id="subj">${subjectChips(ob.grade, ob.subjects)}</div>`,
        `<small class="muted">Optional</small><button class="btn big" id="ob-next">Continue →</button>`);
      $('#ob-next').addEventListener('click', () => {
        ob.subjects = $$('#subj input:checked').map((i) => i.value);
        obSaveProfile(); ob.step = 'quiz'; ob.qi = 0; drawStart();
      });
    } else {
      const q = D.QUESTIONS[ob.qi];
      const says = { 0: 'Answer based on what you usually enjoy, not what you think you should choose.', 5: 'You are halfway through the assessment.', 10: 'Three questions remaining.', 11: 'This is the final question.' };
      const say = says[ob.qi] || 'Choose the answer that best describes you.';
      box.innerHTML = shell({ t: say },
        `<p class="eyebrow">Question ${ob.qi + 1} of ${OB_QUIZ}</p><div class="statement">${esc(q.q)}</div>
         <div class="faces">${FACES.map(([e, l], i) => `<button class="face ${ob.answers[ob.qi] === i + 1 ? 'sel' : ''}" data-v="${i + 1}"><span>${e}</span>${l}</button>`).join('')}</div>`);
      $$('.face').forEach((b) => b.addEventListener('click', () => {
        ob.answers[ob.qi] = Number(b.dataset.v); b.classList.add('sel');
        setTimeout(() => { if (ob.qi + 1 < OB_QUIZ) { ob.qi++; drawStart(); } else obFinish(); }, 230);
      }));
    }
    bindBack();
  }

  function obFinish() {
    const box = $('#ob');
    box.innerHTML = `<div class="thinking"><h2>Building your career matches</h2><p class="muted">Comparing your answers, interests, and favorite subjects</p><div class="progress"><div id="think" style="width:0%;transition:width 1.6s ease-out"></div></div></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const t = $('#think'); if (t) t.style.width = '100%'; }));
    setTimeout(() => {
      const first = !S.personality;
      S.personality = { answers: ob.answers, traits: traitScores(ob.answers), date: today() };
      if (first) addXP(50, 'Quick start');
      revealFresh = true;
      checkBadges(); save();
      go('#/reveal');
    }, 1800);
  }

  // ---------- results: your top match ----------
  function chooseCareer(id) {
    if (id === S.careerId) return go('#/today');
    if (S.careerId && !confirm('Switch career path? Your upcoming schedule will be rebuilt (XP, badges, and skill levels are kept).')) return;
    S.careerId = id;
    S.plan = null;
    if (!S.badges.pathfinder) addXP(50, 'Chose a path');
    checkBadges();
    save();
    if (unplaced().length) { toast("Great choice! First, let's see where you're starting. 🧭"); go('#/skillcheck'); }
    else { ensureSchedule(); save(); toast(`Your ${esc(career().title)} path is ready! 🗺️`); go('#/today'); }
  }
  const bindPick = () => $$('[data-pick]').forEach((b) => b.addEventListener('click', () => chooseCareer(b.dataset.pick)));

  routes.reveal = {
    html: () => {
      const tr = S.personality.traits;
      const top = Object.entries(tr).sort((a, b) => b[1] - a[1]);
      const matches = matchCareers();
      const m = matches[0], c = m.c;
      const mine = S.careerId === c.id;
      const name = top.slice(0, 2).map(([t]) => D.TRAITS[t].name).join('–');
      return `
      <section class="revealpage">
        <p class="eyebrow">Your results</p>
        <h1>You're a <span class="grad">${esc(name)}</span></h1>
        <p class="muted">${esc(D.TRAITS[top[0][0]].desc)} ${esc(D.TRAITS[top[1][0]].desc)}</p>
        <div class="traits">${top.slice(0, 3).map(([t, v]) => `<div class="trait-row"><span>${D.TRAITS[t].name}</span><div class="bar"><div style="width:${v}%"></div></div><small>${v}%</small></div>`).join('')}</div>
        <div class="hero-card">
          <span class="match-badge">${m.score}% match</span>
          <span class="big-emoji">${c.emoji}</span>
          <p class="eyebrow">Your #1 match</p>
          <h2>${esc(c.title)}</h2>
          <p>${esc(c.summary)}</p>
          ${m.reasons.length ? `<ul class="reasons">${m.reasons.slice(0, 3).map((r) => `<li>${r}</li>`).join('')}</ul>` : ''}
          ${facts(c)}
          <div class="row start"><button class="btn big" data-pick="${c.id}">${mine ? 'Go to my plan →' : 'This is me. Build my path →'}</button><a class="btn ghost big" href="#/career/${c.id}">Learn more</a></div>
        </div>
        <h3>Also great for you</h3>
        <div class="mini-list">${matches.slice(1, 4).map((x) => `<a class="mini-career" href="#/career/${x.c.id}"><span class="emo">${x.c.emoji}</span><div class="grow"><b>${esc(x.c.title)}</b><small>${money(x.c.pay)} · ${x.c.growth == null ? 'Varies' : (x.c.growth > 0 ? '▲' : x.c.growth < 0 ? '▼' : '') + Math.abs(x.c.growth) + '% growth'}</small></div><span class="score">${x.score}%</span></a>`).join('')}</div>
        <div class="row center"><a class="btn ghost" href="#/explore">Browse all ${D.CAREERS.length} careers</a></div>
        <div class="row center"><a class="link small" href="#/start?step=quiz">Retake the quiz</a></div>
      </section>`;
    },
    bind: () => {
      bindPick();
      if (revealFresh) { revealFresh = false; setTimeout(confetti, 250); }
    },
  };

  // ---------- explore: all careers + try-outs ----------
  routes.explore = {
    html: (arg, params) => {
      const tab = params.tab === 'tryouts' ? 'tryouts' : 'careers';
      const tabs = `<div class="tabs"><a href="#/explore" class="${tab === 'careers' ? 'active' : ''}">Careers</a><a href="#/explore?tab=tryouts" class="${tab === 'tryouts' ? 'active' : ''}">Try-outs</a></div>`;
      if (tab === 'tryouts') {
        const { rec, other } = activityLists();
        const c = career();
        return `<h1>Explore</h1>${tabs}
          <p class="muted">Small taste-tests of clubs and activities, about 15–25 minutes each. No grades, no pressure. “Not for me” is a great answer too.</p>
          <h3>${c ? `Good fits for ${article(c.title)} ${esc(c.title)}` : 'Good fits for your top matches'}</h3><div class="acts">${rec.map(actCard).join('')}</div>
          <h3>Something different</h3><div class="acts">${other.map(actCard).join('')}</div>`;
      }
      const score = Object.fromEntries(matchCareers().map((m) => [m.c.id, m.score]));
      const list = D.CAREERS.slice().sort((a, b) => score[b.id] - score[a.id]);
      return `<h1>Explore careers</h1>${tabs}
        <input class="searchbox" id="cq" type="search" placeholder="Search ${D.CAREERS.length} careers…" aria-label="Search careers">
        <div class="filters" id="cf">${D.CATEGORIES.map((c, i) => `<button data-cat="${c.id}" class="${i === 0 ? 'on' : ''}">${c.label}</button>`).join('')}</div>
        <div class="career-list" id="clist">${list.map((c) => `
          <a class="career-tile ${c.id === S.careerId ? 'chosen' : ''}" data-cat="${c.cat}" data-q="${esc((c.title + ' ' + c.keywords.join(' ')).toLowerCase())}" href="#/career/${c.id}">
            <div class="top"><span class="emo">${c.emoji}</span><h3>${esc(c.title)}</h3><span class="score">${score[c.id]}%</span></div>
            <p>${esc(c.summary.split('. ')[0].replace(/\.$/, ''))}.</p>
            <div class="pill-row"><span class="tag">${money(c.pay)}${c.pay ? '/yr' : ''}</span>${c.growth != null ? `<span class="tag ${c.growth > 0 ? 'accent' : 'warn'}">${c.growth > 0 ? '▲' : c.growth < 0 ? '▼' : ''} ${Math.abs(c.growth)}% growth</span>` : ''}${c.usn ? `<span class="tag">🏅 U.S. News #${c.usn}</span>` : ''}${c.id === S.careerId ? '<span class="tag accent">Your path</span>' : ''}</div>
          </a>`).join('')}</div>
        <p class="source">Pay: median annual pay (May 2025). Growth: projected 2025–2035. Source: U.S. Bureau of Labor Statistics, Occupational Outlook Handbook. “U.S. News” = rank in U.S. News &amp; World Report's 2026 Best Jobs. Percent match is Pathfinder's own estimate from your quiz.</p>`;
    },
    bind: (arg, params) => {
      if (params.tab === 'tryouts') return;
      let cat = 'all', q = '';
      const apply = () => $$('#clist .career-tile').forEach((t) => { t.hidden = !((cat === 'all' || t.dataset.cat === cat) && (!q || t.dataset.q.includes(q))); });
      $('#cq').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); apply(); });
      $$('#cf button').forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; $$('#cf button').forEach((x) => x.classList.toggle('on', x === b)); apply(); }));
    },
  };

  routes.career = {
    html: (id) => {
      const c = D.CAREERS.find((x) => x.id === id);
      if (!c) return `<p>Career not found.</p><a class="btn" href="#/explore">Back</a>`;
      const m = matchCareers().find((x) => x.c.id === id);
      const mine = S.careerId === id;
      return `
      <a class="back" href="#/explore">← All careers</a>
      <div class="detail-hero"><span class="emo">${c.emoji}</span><div><h1>${esc(c.title)}</h1>
        <div class="pill-row">${m ? `<span class="tag accent">${m.score}% match for you</span>` : ''}${c.usn ? `<span class="tag">🏅 U.S. News #${c.usn} Best Job, 2026</span>` : ''}</div></div></div>
      <p>${esc(c.summary)}</p>
      ${facts(c)}
      ${c.growth != null && c.growth <= 0 ? `<div class="callout">Fewer new openings are projected in this field. Strong, creative people still get hired, so it's worth knowing before you choose.</div>` : ''}
      <h3>What you'd do</h3><ul class="bullets">${c.does.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h3>Skills to build</h3><div class="pill-row" style="margin-bottom:16px">${c.skills.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>
      ${m && m.reasons.length ? `<h3>Why it fits you</h3><ul class="bullets">${m.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>` : ''}
      <h3>Education</h3><p>${esc(c.edu || '')}</p>
      <h3>Competitions to aim for</h3><div class="pill-row">${c.competitions.map((x) => `<span class="tag">🏅 ${esc(x)}</span>`).join('')}</div>
      <div class="sticky-cta"><button class="btn big block" data-pick="${c.id}">${mine ? 'This is your path ✓' : 'Choose this path'}</button></div>
      <p class="source">Pay and growth: U.S. Bureau of Labor Statistics (median pay, May 2025; projected growth 2025–35). Ranking: U.S. News &amp; World Report 2026 Best Jobs.</p>`;
    },
    bind: bindPick,
  };

  // ---------- edit profile ----------
  routes.profile = {
    html: () => {
      const p = S.profile;
      return `
      <h1>About me</h1>
      <form id="profile-form" class="form card">
        <label>Name<input name="name" required maxlength="40" value="${esc(p.name)}"></label>
        <label>Grade<select name="grade">${[6, 7, 8, 9, 10, 11, 12].map((g) => `<option value="${g}" ${String(p.grade) === String(g) ? 'selected' : ''}>Grade ${g}</option>`).join('')}</select></label>
        <fieldset><legend>Favorite subjects</legend><div class="chips" id="subject-chips">${subjectChips(p.grade, p.subjects)}</div></fieldset>
        <label>Your dream (optional)<textarea name="aspirations" rows="3" placeholder="What do you want to do or become someday?">${esc(p.aspirations)}</textarea></label>
        <label>Time per day for Pathfinder
          <select name="dailyMinutes">${[30, 45, 60, 90].map((m) => `<option value="${m}" ${Number(p.dailyMinutes) === m ? 'selected' : ''}>${m} minutes</option>`).join('')}</select></label>
        <div class="row"><a class="link" href="#/rewards">Cancel</a><button class="btn" type="submit">Save</button></div>
      </form>`;
    },
    bind: () => {
      const form = $('#profile-form');
      form.grade.addEventListener('change', () => {
        const keep = $$('input[name=subjects]:checked', form).map((i) => i.value);
        $('#subject-chips').innerHTML = subjectChips(form.grade.value, keep);
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        Object.assign(S.profile, { name: fd.get('name').trim(), grade: fd.get('grade'), subjects: fd.getAll('subjects'), aspirations: fd.get('aspirations').trim(), dailyMinutes: Number(fd.get('dailyMinutes')) });
        save(); toast('Saved ✓'); go('#/rewards');
      });
    },
  };

  function taskIcon(t) { return { lesson: '📖', code: '🐍', practice: '📝', focus: '⏱️', reflect: '💭', milestone: '🎖️' }[t.type]; }
  function taskMeta(t) {
    const kind = {
      lesson: 'Short lesson + 3-question check',
      code: 'Python exercise · checked by running your code',
      practice: t.status !== 'done' && t.domain ? (isPlaced(t.domain) ? `Auto-graded practice · Level ${skill(t.domain).level}` : 'Placement quiz (sets your starting level)') : 'Auto-graded practice',
      focus: 'Tracked focus timer', reflect: 'Written reflection', milestone: 'Real-world milestone',
    }[t.type];
    return `${kind} · ${t.minutes} min${t.stretch ? ' · <span class="tag">stretch</span>' : ''}${t.custom ? ' · <span class="tag">added by you</span>' : ''}`;
  }
  function verifiedLabel(t) {
    if (t.status !== 'done') return '';
    const r = t.result || {};
    if (t.type === 'lesson') return `<span class="ok">✓ Understood (${r.correct}/${r.of} on the check)</span>`;
    if (t.type === 'code') return `<span class="ok">✓ Python: all ${r.tests} tests passed${r.solution ? ' (with the worked solution)' : ''}</span>`;
    if (t.type === 'practice') return `<span class="ok">✓ ${Math.round(r.acc * 100)}% correct (level ${r.level})</span>`;
    if (t.type === 'focus') return `<span class="ok">✓ ${r.minutes} focused min · ${r.switches} distraction${r.switches === 1 ? '' : 's'}</span>`;
    if (t.type === 'reflect') return `<span class="ok">✓ Reflection accepted</span>`;
    return `<span class="ok self">✓ Self-reported${r.verifier ? ` · confirmed by ${esc(r.verifier)}` : ''}</span>`;
  }
  // A practice set or Python exercise unlocks after the lesson on the same subject is finished.
  const lockedByLesson = (t, day) => (t.type === 'practice' || t.type === 'code') && !t.custom && !t.stretch &&
    day.tasks.some((x) => x.type === 'lesson' && x.domain === t.domain && x.status !== 'done');
  function startAction(t, day) {
    if (lockedByLesson(t, day)) return '<span class="muted small">🔒 Finish the lesson first</span>';
    if (t.type === 'lesson') return `<a class="btn small" href="#/lesson/${t.id}">Start lesson</a>`;
    if (t.type === 'code') return `<a class="btn small" href="#/code/${t.id}">Open editor</a>`;
    if (t.type === 'practice') return `<a class="btn small" href="#/practice/${t.domain}?task=${t.id}">Start</a>`;
    if (t.type === 'focus') return `<a class="btn small" href="#/focus/${t.id}">Start timer</a>`;
    if (t.type === 'reflect') return `<button class="btn small" data-reflect="${t.id}">Write</button>`;
    return `<button class="btn small" data-milestone="${t.id}">Report</button>`;
  }

  function taskRow(t, date) {
    const isToday = date === today();
    const canDo = date <= today() && t.status !== 'done';
    let action = '';
    if (canDo) action = startAction(t, S.plan.days[date]);
    else if (date > today()) action = `<span class="muted small">Unlocks ${isToday ? 'today' : prettyDate(date)}</span>`;
    return `
      <li class="task ${t.status}" data-id="${t.id}">
        <span class="task-icon">${taskIcon(t)}</span>
        <div class="task-body"><b>${esc(t.title)}</b><small>${taskMeta(t)}</small>${verifiedLabel(t)}
          ${t.type === 'reflect' && t.status !== 'done' ? `<div class="prompt">“${esc(t.prompt)}”</div>` : ''}
          <div class="inline-form" id="form-${t.id}"></div></div>
        <div class="task-action">${action}</div>
      </li>`;
  }

  function bindTaskActions() {
    $$('[data-reflect]').forEach((b) => b.addEventListener('click', () => openReflection(b.dataset.reflect)));
    $$('[data-milestone]').forEach((b) => b.addEventListener('click', () => openMilestone(b.dataset.milestone)));
  }

  function openReflection(id) {
    const box = $(`#form-${id}`);
    if (box.innerHTML) return;
    box.innerHTML = `
      <textarea rows="5" placeholder="Write at least 30 words in your own words…"></textarea>
      <div class="row"><small class="muted wc">0 words</small><button class="btn small">Submit reflection</button></div>
      <div class="feedback"></div>`;
    const ta = $('textarea', box);
    const meta = { start: 0, pasted: 0 };
    ta.addEventListener('input', () => { if (!meta.start) meta.start = Date.now(); $('.wc', box).textContent = `${words(ta.value).length} words`; });
    ta.addEventListener('paste', (e) => { meta.pasted += (e.clipboardData || window.clipboardData).getData('text').length; });
    ta.focus();
    $('button', box).addEventListener('click', () => {
      const res = checkReflection(ta.value, meta);
      if (!res.ok) {
        $('.feedback', box).innerHTML = `<ul class="issues">${res.issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
        if (meta.pasted > ta.value.length * 0.5) integrity(-3, 'Tried to submit pasted text as a reflection');
        save();
        return;
      }
      if (res.flags.length) integrity(-2, res.flags.join(', ') + ' on a reflection');
      S.reflections.push(ta.value.trim());
      S.stats.reflectionsOk++;
      completeTask(id, 'checked', { words: words(ta.value).length }, 15 + Math.min(10, Math.floor(words(ta.value).length / 15)), 'Reflection');
      render();
    });
  }

  function openMilestone(id) {
    const box = $(`#form-${id}`);
    if (box.innerHTML) return;
    box.innerHTML = `
      <textarea rows="3" placeholder="What did you do? Be specific (at least 15 words): what you signed up for, researched, or completed."></textarea>
      <input placeholder="Optional: name of a parent, teacher, or coach who can confirm">
      <div class="row"><small class="muted">Milestones are self-reported. Having an adult confirm earns +20 bonus XP.</small><button class="btn small">Submit</button></div>
      <div class="feedback"></div>`;
    $('button', box).addEventListener('click', () => {
      const note = $('textarea', box).value.trim();
      const verifier = $('input', box).value.trim();
      if (words(note).length < 15) { $('.feedback', box).innerHTML = '<ul class="issues"><li>Please describe what you did in at least 15 words.</li></ul>'; return; }
      completeTask(id, 'self', { note, verifier }, 30 + (verifier ? 20 : 0), 'Milestone');
      award('milestone');
      save();
      render();
    });
  }

  const wasActive = (d) => !!(S.activity[d] || S.rest[d]);
  function activitySummary() {
    const t = today();
    const start = S.plan ? S.plan.start : t;
    const daysTracked = Math.max(1, Math.min(7, daysBetween(start, t) + 1));
    let daysAccounted = 0;
    for (let i = 0; i < daysTracked; i++) if (wasActive(addDays(t, -i))) daysAccounted++;
    const activeToday = !!S.activity[t];
    const resting = !!S.rest[t] && !activeToday;
    let canRest = !activeToday && !S.rest[t];
    for (let i = 1; i <= 6; i++) if (S.rest[addDays(t, -i)]) canRest = false;
    return { daysTracked, daysAccounted, activeToday, resting, canRest };
  }
  function progressStrip() {
    const summary = activitySummary();
    const restControl = summary.resting
      ? '<span class="tag">Rest day scheduled</span>'
      : summary.canRest ? '<button class="link" id="rest-day">Schedule a rest day</button>' : '';
    return `<section class="weekly-summary">
      <div class="weekly-summary-copy"><b>Weekly progress</b><small>${summary.daysAccounted} of ${summary.daysTracked} days accounted for</small></div>
      <div class="bar"><div style="width:${Math.round(summary.daysAccounted / summary.daysTracked * 100)}%"></div></div>
      <div class="weekly-summary-meta"><span>${streak()} day streak</span>${restControl}</div>
    </section>`;
  }
  function stepSub(t) {
    const m = t.minutes;
    return { lesson: `📖 Short lesson + quick check · ~${m} min`, code: `🐍 Real Python, checked by tests · ~${m} min`,
      practice: `📝 ${t.n || 5} questions at Level ${skill(t.domain).level} · ~${m} min`, reflect: `💭 ${t.prompt || ''}`,
      milestone: `🎖️ A real-world step · ~${m} min`, focus: `⏱️ Focus session · ~${m} min` }[t.type];
  }
  function stepsHTML(day) {
    let found = false;
    return day.tasks.map((t, i) => {
      const locked = lockedByLesson(t, day);
      const done = t.status === 'done';
      const state = done ? 'done' : (!found && !locked) ? (found = true, 'now') : 'later';
      return `<li class="step ${state}"><span class="num">${done ? '✓' : i + 1}</span>
        <div class="info"><b>${esc(t.title)}</b><small>${esc(stepSub(t))}</small>${verifiedLabel(t)}</div>
        ${state === 'now' ? `<span class="go">${startAction(t, day).replace('btn small', 'btn')}</span>` : state === 'later' ? `<span class="muted small">${locked ? '🔒 After the lesson' : 'Up next'}</span>` : ''}
        <div class="inline-form" id="form-${t.id}"></div></li>`;
    }).join('');
  }

  routes.today = {
    html: () => {
      const c = career();
      const t = today();
      const day = S.plan.days[t];
      const left = day.tasks.filter((x) => x.status !== 'done').length;
      const hour = new Date().getHours();
      const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
      const lv = level(), into = S.xp % 250;
      return `
      <div class="today-head"><p class="eyebrow">Day ${daysBetween(S.plan.start, t) + 1} · becoming ${article(c.title)} ${esc(c.title)} ${c.emoji}</p><h1>${hello}, ${esc(S.profile.name)}</h1></div>
      ${progressStrip()}
      ${left ? `<h2>Today's steps <small class="muted">${day.tasks.length - left} of ${day.tasks.length} done</small></h2>` : ''}
      ${left ? `<ol class="steps">${stepsHTML(day)}</ol>` : `
        <div class="card done-card"><h2>Today's plan is complete</h2><p class="muted">Your work is recorded. Continue tomorrow, or use the options below to keep building your skills.</p>
          <div class="row center"><a class="btn ghost" href="#/practice">Do extra practice</a><a class="btn ghost" href="#/explore?tab=tryouts">Try a new activity</a></div></div>
        <ol class="steps">${stepsHTML(day)}</ol>`}
      <div class="xp-line"><span>Level ${lv}</span><div class="bar"><div style="width:${(into / 250) * 100}%"></div></div><span>${S.xp} XP</span></div>
      <p class="adapt">🧬 ${esc(stamina().note)} <a href="#/schedule?tab=schedule">Edit my schedule</a></p>
      ${suggestTry()}`;
    },
    bind: () => {
      bindTaskActions();
      const rb = $('#rest-day');
      if (rb) rb.addEventListener('click', () => { S.rest[today()] = true; save(); toast('Rest day scheduled. Your progress is saved.'); render(); });
    },
  };

  routes.schedule = {
    html: (arg, params) => {
      const c = career();
      const t = today();
      const stage = gradeStage(S.profile.grade);
      const tab = ['schedule', 'daily'].includes(params.tab) ? 'schedule' : 'roadmap';
      const more = params.more === '1';
      const days = [];
      for (let i = more ? -3 : -1; i <= (more ? 13 : 6); i++) { const d = addDays(t, i); if (S.plan.days[d]) days.push(d); }
      return `
      <div class="path-head"><span class="emo">${c.emoji}</span><div><p class="eyebrow">My path</p><h1>${esc(c.title)}</h1></div><a class="btn ghost small" href="#/explore">Change career</a></div>
      ${facts(c)}
      <div class="tabs"><a href="#/schedule" class="${tab === 'roadmap' ? 'active' : ''}">Roadmap</a><a href="#/schedule?tab=schedule" class="${tab === 'schedule' ? 'active' : ''}">Schedule</a></div>
      ${tab === 'roadmap' ? `
        <h2>From now to ${article(c.title)} ${esc(c.title)}</h2>
        <ol class="timeline">${D.STAGES.map((s) => `
          <li class="${s.key === stage ? 'now' : ''}"><div class="dot"></div><div>
            <h3>${s.label}${s.key === stage ? ' <span class="tag accent">You are here</span>' : ''}</h3>
            <ul>${c.path[s.key].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></li>`).join('')}
        </ol>
        <h2>Competitions to aim for</h2>
        <ul class="comp">${c.competitions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="muted small" style="margin-top:12px">Ask your school counselor which of these your school offers. Many are free or low cost.</p>`
      : `
        <p class="muted">Your plan adapts: do well and days get a bit longer; fall behind and they get lighter. Edit anything, and edited days stay exactly as you set them.</p>
        <div class="days">${days.map((d) => dayCard(d)).join('')}</div>
        <div class="row center"><a class="link" href="#/schedule?tab=schedule${more ? '' : '&more=1'}">${more ? 'Show fewer days' : 'Show more days'}</a></div>`}`;
    },
    bind: () => {
      bindTaskActions();
      $$('[data-edit]').forEach((b) => b.addEventListener('click', () => editTask(b.dataset.edit)));
      $$('[data-del]').forEach((b) => b.addEventListener('click', () => {
        const f = findTask(b.dataset.del);
        if (!confirm(`Remove "${f.task.title}"?`)) return;
        f.day.tasks = f.day.tasks.filter((x) => x.id !== f.task.id);
        f.day.edited = true; save(); render();
      }));
      $$('[data-add]').forEach((b) => b.addEventListener('click', () => addTask(b.dataset.add)));
      $$('[data-reset]').forEach((b) => b.addEventListener('click', () => {
        S.plan.days[b.dataset.reset] = generateDay(b.dataset.reset); save(); render();
      }));
    },
  };

  function dayCard(d) {
    const day = S.plan.days[d];
    const t = today();
    const pct = Math.round(dayCompletion(day) * 100);
    const past = d < t;
    const total = day.tasks.reduce((s, x) => s + Number(x.minutes || 0), 0);
    return `
      <div class="day ${d === t ? 'is-today' : ''} ${past ? 'past' : ''}">
        <div class="day-head"><b>${d === t ? 'Today' : prettyDate(d)}</b>
          <small class="muted">${total} min · ${pct}% done${day.edited ? ' · edited' : ''}</small></div>
        <ul class="tasks compact">${day.tasks.map((x) => `
          <li class="task ${x.status}"><span class="task-icon">${taskIcon(x)}</span>
            <div class="task-body"><b>${esc(x.title)}</b><small>${taskMeta(x)}</small>${verifiedLabel(x)}<div class="inline-form" id="form-${x.id}"></div></div>
            <div class="task-action">
              ${x.status !== 'done' && d >= t ? `<button class="icon" title="Edit" data-edit="${x.id}">✏️</button><button class="icon" title="Remove" data-del="${x.id}">🗑️</button>` : ''}
              ${x.status !== 'done' && d === t ? startAction(x, day) : ''}
            </div></li>`).join('') || '<li class="muted small">Rest day — no tasks.</li>'}
        </ul>
        ${d >= t ? `<div class="day-foot"><button class="link" data-add="${d}">+ Add task</button>${day.edited ? `<button class="link" data-reset="${d}">↺ Reset day</button>` : ''}</div>` : ''}
      </div>`;
  }

  function taskForm(t) {
    const c = career();
    return `
      <form class="form mini">
        <label class="full">Task<input name="title" required maxlength="90" value="${esc(t.title || '')}"></label>
        <label>Type<select name="type">${[['lesson', '📖 Lesson + check'], ['code', '🐍 Python exercise'], ['practice', '📝 Practice quiz'], ['focus', '⏱️ Focus session (timer)'], ['reflect', '💭 Reflection'], ['milestone', '🎖️ Milestone']].map(([v, l]) => `<option value="${v}" ${t.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Minutes<input name="minutes" type="number" min="5" max="180" step="5" value="${t.minutes || 20}"></label>
        <label class="full domain-pick">Subject<select name="domain">${Object.keys(D.DOMAINS).map((d) => `<option value="${d}" ${(t.domain || c.domains[0]) === d ? 'selected' : ''}>${D.DOMAINS[d].name}</option>`).join('')}</select></label>
        <div class="full row"><button type="button" class="link cancel">Cancel</button><button class="btn small">Save</button></div>
      </form>`;
  }

  function bindTaskForm(box, onSave) {
    const form = $('form', box);
    const sync = () => { $('.domain-pick', form).style.display = ['practice', 'lesson'].includes(form.type.value) ? '' : 'none'; };
    form.type.addEventListener('change', sync); sync();
    $('.cancel', form).addEventListener('click', () => { box.innerHTML = ''; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      onSave({ title: form.title.value.trim(), type: form.type.value, minutes: Math.max(5, Number(form.minutes.value) || 10), domain: form.type.value === 'code' ? 'coding' : form.domain.value });
    });
  }

  function editTask(id) {
    const f = findTask(id);
    const box = $(`#form-${id}`);
    box.innerHTML = taskForm(f.task);
    bindTaskForm(box, (v) => {
      Object.assign(f.task, v);
      if (v.type === 'reflect' && !f.task.prompt) f.task.prompt = fillCareer(D.REFLECT_PROMPTS[0], career().title);
      f.day.edited = true; save(); render();
    });
  }

  function addTask(date) {
    const day = S.plan.days[date];
    const holder = document.createElement('div');
    holder.className = 'inline-form';
    $(`[data-add="${date}"]`).closest('.day').appendChild(holder);
    holder.innerHTML = taskForm({ type: 'focus', minutes: 20 });
    bindTaskForm(holder, (v) => {
      const t = Object.assign({ id: uid(), status: 'todo', custom: true }, v);
      if (v.type === 'reflect') t.prompt = 'What did you work on, and what did you learn from it?';
      day.tasks.push(t);
      day.edited = true; save(); render();
    });
  }

  // ---------- practice ----------
  let quiz = null;
  routes.practice = {
    html: (domain, params) => {
      const c = career();
      if (!domain || !D.DOMAINS[domain]) {
        const others = Object.keys(D.DOMAINS).filter((d) => !c.domains.includes(d));
        const tile = (d) => { const s = skill(d); return `<a class="tile" href="#/practice/${d}"><span>${D.DOMAINS[d].emoji}</span><b>${D.DOMAINS[d].name}</b><small>${isPlaced(d) ? `Level ${s.level} · ${levelName(s.level)}` : 'Take placement quiz'}</small></a>`; };
        return `
        <h1>Practice</h1>
        <p class="muted">Short sets at your level. Score 80%+ to level up. Free practice earns XP too.</p>
        <h3>For ${article(c.title)} ${esc(c.title)}</h3><div class="tiles">${c.domains.filter((d) => d !== 'coding').map(tile).join('')}</div>
        ${c.domains.includes('coding') ? `<h3>🐍 Python</h3><div class="tiles">${tile('coding')}<a class="tile" href="#/code"><span>⌨️</span><b>Code Lab</b><small>Real Python, checked by tests</small></a></div>` : ''}
        <details class="fold"><summary>Other subjects</summary><div class="tiles">${others.map(tile).join('')}</div></details>`;
      }
      const s = skill(domain);
      if (!isPlaced(domain)) { quiz = null; pl = newPlacement([domain], 'single', params.task); }
      else { pl = null; quiz = { domain, taskId: params.task, level: s.level, qs: P.makeSet(domain, s.level, (params.task && findTask(params.task) && findTask(params.task).task.n) || 5), i: 0, correct: 0, times: [], shownAt: Date.now() }; }
      return `<section class="card narrow quiz" id="quiz"></section>`;
    },
    bind: (domain) => { if (!domain || !D.DOMAINS[domain]) return; if (pl) drawPlacement(); else drawQuestion(); },
  };

  function drawQuestion() {
    const box = $('#quiz');
    if (!box) return;
    const q = quiz.qs[quiz.i];
    if (!q) return finishQuiz(box);
    quiz.shownAt = Date.now();
    box.innerHTML = `
      <div class="quiz-head"><span>${D.DOMAINS[quiz.domain].emoji} ${D.DOMAINS[quiz.domain].name} · Level ${quiz.level}</span><span>${quiz.i + 1} / ${quiz.qs.length}</span></div>
      <div class="progress"><div style="width:${(quiz.i / quiz.qs.length) * 100}%"></div></div>
      <h2 class="question">${esc(q.q)}</h2>
      <div class="choices">${q.choices.map((ch, i) => `<button class="choice" data-c="${i}">${esc(ch)}</button>`).join('')}</div>
      <div class="feedback"></div>`;
    $$('.choice', box).forEach((b) => b.addEventListener('click', () => {
      const picked = Number(b.dataset.c);
      quiz.times.push((Date.now() - quiz.shownAt) / 1000);
      const right = picked === q.answer;
      if (right) quiz.correct++;
      $$('.choice', box).forEach((x, i) => { x.disabled = true; if (i === q.answer) x.classList.add('right'); else if (i === picked) x.classList.add('wrong'); });
      $('.feedback', box).innerHTML = `<p class="${right ? 'ok' : 'bad'}">${right ? '✓ Correct!' : `✗ The answer is <b>${esc(q.choices[q.answer])}</b>`}</p><button class="btn">${quiz.i + 1 < quiz.qs.length ? 'Next →' : 'See results'}</button>`;
      $('.feedback .btn', box).addEventListener('click', () => { quiz.i++; drawQuestion(); });
    }));
  }

  function finishQuiz(box) {
    const acc = quiz.correct / quiz.qs.length;
    const s = skill(quiz.domain);
    const avgTime = quiz.times.reduce((a, b) => a + b, 0) / quiz.times.length;
    const rushed = avgTime < 2.5;
    let msg = '';
    s.history.push({ date: today(), acc, level: quiz.level });
    if (rushed) {
      integrity(-4, `Answered a ${D.DOMAINS[quiz.domain].name} quiz in ${avgTime.toFixed(1)}s per question (too fast to be real work)`);
      msg = 'That was really fast, so your level stays the same this time. Take your time and work each problem out!';
    } else if (acc >= 0.8 && s.level < 5) { s.level++; msg = `🚀 Level up! ${D.DOMAINS[quiz.domain].name} is now Level ${s.level} (${levelName(s.level)}). Questions will get harder.`; }
    else if (acc < 0.4 && s.level > 1) { s.level--; msg = `We eased ${D.DOMAINS[quiz.domain].name} back to Level ${s.level} so you can master the basics first.`; }
    else msg = acc >= 0.8 ? 'Perfect mastery: you are at the top level!' : 'Keep practicing at this level. Score 80% to level up.';
    if (acc === 1 && !rushed) award('quiz-whiz');
    const xp = (10 + quiz.correct * 4 + quiz.level * 2) * (rushed ? 0.3 : 1);
    if (quiz.taskId && findTask(quiz.taskId)) completeTask(quiz.taskId, 'auto', { acc, level: quiz.level }, xp, 'Practice set');
    else { addXP(xp * 0.6, 'Free practice'); checkBadges(); }
    save();
    renderNav('practice');
    box.innerHTML = `
      <div class="result">
        <div class="ring big" style="--p:${Math.round(acc * 100)}"><span>${quiz.correct}/${quiz.qs.length}</span></div>
        <h2>${acc === 1 ? 'Flawless! 🎯' : acc >= 0.8 ? 'Great job! 🌟' : acc >= 0.5 ? 'Nice effort! 💪' : 'Keep going! 🌱'}</h2>
        <p>${esc(msg)}</p>
        <div class="row center"><a class="btn" href="#/today">Back to today</a><a class="btn ghost" href="#/practice/${quiz.domain}">Another set</a></div>
      </div>`;
  }

  // ---------- focus timer (honesty tracker for study time) ----------
  let focus = null;
  function stopFocusTimer() {
    if (!focus) return;
    clearInterval(focus.iv);
    document.removeEventListener('visibilitychange', focus.onVis);
    window.removeEventListener('blur', focus.onBlur);
    window.removeEventListener('focus', focus.onFocus);
    focus = null;
  }

  routes.focus = {
    html: (id) => {
      const f = findTask(id);
      if (!f) return `<section class="card narrow"><p>Task not found.</p><a href="#/today" class="btn">Back</a></section>`;
      return `
      <section class="card narrow focus">
        <p class="muted">${taskIcon(f.task)} Focus session</p>
        <h2>${esc(f.task.title)}</h2>
        <div class="ring huge" id="focus-ring" style="--p:0"><span id="focus-time">${f.task.minutes}:00</span><small id="focus-state">ready</small></div>
        <p class="muted small">The timer only counts while this tab is open and in front. Switching tabs or apps pauses it and counts as a distraction.
        Work on your task (notebook, textbook, or another device), and keep Pathfinder open.</p>
        ${S.settings.demo ? '<p class="tag warn">Demo mode: 1 minute passes in 1 second</p>' : ''}
        <div class="row center"><button class="btn big" id="focus-go">Start</button><a class="btn ghost" href="#/today">Cancel</a></div>
        <p id="focus-switches" class="small"></p>
      </section>`;
    },
    bind: (id) => {
      const f = findTask(id);
      if (!f) return;
      const need = f.task.minutes * 60;
      const speed = S.settings.demo ? 60 : 1;
      const state = { elapsed: 0, switches: 0, running: false, last: 0 };
      const active = () => document.visibilityState === 'visible' && document.hasFocus();
      const draw = () => {
        const left = Math.max(0, need - state.elapsed);
        $('#focus-time').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
        $('#focus-ring').style.setProperty('--p', Math.round((state.elapsed / need) * 100));
        $('#focus-state').textContent = !state.running ? 'ready' : active() ? 'focusing' : 'paused';
        $('#focus-switches').textContent = state.switches ? `⚠️ Distractions: ${state.switches}` : '';
      };
      // Tab switches fire both blur and visibilitychange; count each time away once.
      const away = () => { if (state.running && !state.away) { state.away = true; state.switches++; draw(); } };
      const back = () => { if (active()) { state.away = false; state.last = Date.now(); } };
      focus = {
        onVis: () => (document.visibilityState === 'hidden' ? away() : back()),
        onBlur: away,
        onFocus: back,
      };
      document.addEventListener('visibilitychange', focus.onVis);
      window.addEventListener('blur', focus.onBlur);
      window.addEventListener('focus', focus.onFocus);
      $('#focus-go').addEventListener('click', (e) => {
        if (state.running) return;
        state.running = true; state.last = Date.now();
        e.target.textContent = 'Focusing…'; e.target.disabled = true;
        focus.iv = setInterval(() => {
          const now = Date.now();
          if (active()) state.elapsed += ((now - state.last) / 1000) * speed;
          state.last = now;
          draw();
          if (state.elapsed >= need) {
            const sw = state.switches;
            stopFocusTimer();
            if (sw > 2) integrity(-Math.min(10, (sw - 2) * 2), `${sw} distractions during a focus session`);
            if (sw === 0 && f.task.minutes >= 25) award('deep-focus');
            completeTask(f.task.id, 'timer', { minutes: f.task.minutes, switches: sw }, f.task.minutes * 1.2 + (sw === 0 ? 10 : 0), sw === 0 ? 'Distraction-free focus' : 'Focus session');
            confetti();
            go('#/today');
          }
        }, 250);
        draw();
      });
      draw();
    },
  };

  // ---------- me (progress, badges, prizes, settings) ----------
  routes.rewards = {
    html: () => {
      const lv = level(), into = S.xp % 250;
      const c = S.careerId ? career() : null;
      return `
      <div class="me-head"><div><h1>${esc(S.profile.name)}</h1><p class="muted" style="margin:0">Level ${lv} · ${levelTitle(lv)}${c ? ` · future ${esc(c.title)}` : ''}</p></div></div>
      <div class="bar"><div style="width:${(into / 250) * 100}%"></div></div><small class="muted">${250 - into} XP to Level ${lv + 1}</small>
      <div class="statgrid"><div><b>${streak()}</b><small>day streak</small></div><div><b>${S.xp}</b><small>total XP</small></div><div><b>${S.coins}</b><small>coins</small></div></div>
      ${c ? `<div class="card"><h3>Your skills</h3>${c.domains.map((d) => { const s = skill(d); return `<div class="skill"><span>${D.DOMAINS[d].emoji} ${D.DOMAINS[d].name}<small class="muted"> ${isPlaced(d) ? levelName(s.level) : ''}</small></span><span class="pips">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= s.level ? 'on' : ''}"></i>`).join('')}</span></div>`; }).join('')}</div>` : ''}
      <h2>Badges <small class="muted">${Object.keys(S.badges).length} of ${D.BADGES.length}</small></h2>
      <div class="badges" style="margin-bottom:28px">${D.BADGES.map((b) => `
        <div class="badge ${S.badges[b.id] ? 'got' : ''}" title="${esc(b.desc)}"><span>${b.emoji}</span><b>${esc(b.name)}</b><small>${S.badges[b.id] ? 'Earned ' + prettyDate(S.badges[b.id]) : esc(b.desc)}</small></div>`).join('')}</div>
      <div class="card">
        <h2>🎁 Prize shop <small class="muted">🪙 ${S.coins}</small></h2>
        <p class="muted small">Earn 1 coin for every 10 XP. A parent or teacher can add real prizes here.</p>
        <ul class="shop">${S.rewards.map((r) => `
          <li class="${r.redeemed ? 'done' : ''}"><span>${esc(r.name)}</span><b>🪙 ${r.cost}</b>
            ${r.redeemed ? `<small class="ok">Redeemed ${prettyDate(r.redeemed)}</small>` : `<button class="btn small" data-redeem="${r.id}" ${S.coins < r.cost ? 'disabled' : ''}>Redeem</button>`}
            <button class="icon" data-rmreward="${r.id}" title="Remove">✕</button></li>`).join('')}</ul>
        <form id="reward-form" class="row"><input name="name" placeholder="New prize, e.g. New book" required maxlength="60"><input name="cost" type="number" min="10" step="10" value="100" style="width:90px"><button class="btn small">Add</button></form>
      </div>
      <details class="fold"><summary>🛡️ Integrity score · ${S.integrity.score}/100</summary><div>
        <div class="bar ${S.integrity.score < 80 ? 'low' : ''}"><div style="width:${S.integrity.score}%"></div></div>
        <p class="muted small" style="margin-top:10px">Pathfinder checks that progress is real: quizzes are timed, focus timers pause when you leave the tab, reflections are checked for copy-paste and gibberish, and pasted code is flagged. Honest work raises your score. Below 80, XP is reduced.</p>
        <ul class="log">${S.integrity.log.slice(0, 8).map((l) => `<li><span class="${l.delta < 0 ? 'bad' : 'ok'}">${l.delta > 0 ? '+' : ''}${l.delta}</span> ${esc(l.msg)} <small class="muted">${prettyDate(l.date)}</small></li>`).join('') || '<li class="muted small">No events yet. Keep it clean! ✨</li>'}</ul></div></details>
      <details class="fold"><summary>⚙️ Settings</summary><div>
        <label class="toggle"><input type="checkbox" id="demo" ${S.settings.demo ? 'checked' : ''}> Demo mode (focus timers run 60× faster, for trying the app)</label>
        <div class="row start" style="gap:18px"><a href="#/profile" class="link">Edit my profile</a><a href="#/start?step=quiz" class="link">Retake the quiz</a><button class="link danger" id="reset">Reset all data</button></div></div></details>`;
    },
    bind: () => {
      $$('[data-redeem]').forEach((b) => b.addEventListener('click', () => {
        const r = S.rewards.find((x) => x.id === b.dataset.redeem);
        if (S.coins < r.cost || !confirm(`Redeem "${r.name}" for ${r.cost} coins?`)) return;
        S.coins -= r.cost; r.redeemed = today(); save(); confetti(); toast(`🎁 Enjoy: ${esc(r.name)}!`, 'big'); render();
      }));
      $$('[data-rmreward]').forEach((b) => b.addEventListener('click', () => { S.rewards = S.rewards.filter((x) => x.id !== b.dataset.rmreward); save(); render(); }));
      $('#reward-form').addEventListener('submit', (e) => {
        e.preventDefault();
        S.rewards.push({ id: uid(), name: e.target.name.value.trim(), cost: Math.max(10, Number(e.target.cost.value) || 100) });
        save(); render();
      });
      $('#demo').addEventListener('change', (e) => { S.settings.demo = e.target.checked; save(); });
      $('#reset').addEventListener('click', () => {
        if (!confirm('Erase all Pathfinder data on this device? This cannot be undone.')) return;
        S = blank(); save(); location.hash = '#/welcome'; render();
      });
    },
  };

  // ---------- skill check (adaptive placement before any tasks) ----------
  let pl = null;
  const PL_QUESTIONS = 4;
  const defaultLevel = () => { const n = Number(S.profile.grade); return n <= 8 ? 1 : n <= 10 ? 2 : 3; };

  function plStartDomain(p) {
    const d = p.domains[p.di];
    Object.assign(p, { qi: 0, level: P.placementStart(d), used: [], correct: 0, answers: [] });
    plNext(p);
  }
  function plNext(p) {
    p.q = P.placementQuestion(p.domains[p.di], p.level, p.used);
    p.used.push(p.q.q);
    p.shownAt = Date.now();
  }
  function newPlacement(domains, mode, taskId) {
    const p = { domains, mode, taskId, di: 0, results: {} };
    plStartDomain(p);
    return p;
  }

  function drawPlacement() {
    const box = $('#quiz');
    if (!box || !pl) return;
    const d = pl.domains[pl.di], q = pl.q;
    const done = pl.di * PL_QUESTIONS + pl.qi;
    box.innerHTML = `
      <div class="quiz-head"><span>${D.DOMAINS[d].emoji} ${D.DOMAINS[d].name} · Skill check</span><span>Section ${pl.di + 1} of ${pl.domains.length} · Question ${pl.qi + 1} of ${PL_QUESTIONS}</span></div>
      <div class="progress"><div style="width:${(done / (pl.domains.length * PL_QUESTIONS)) * 100}%"></div></div>
      <p class="muted small">Not graded. Questions adjust to you, so some will feel easy and some hard.</p>
      <h2 class="question">${esc(q.q)}</h2>
      <div class="choices">${q.choices.map((ch, i) => `<button class="choice" data-c="${i}">${esc(ch)}</button>`).join('')}
        <button class="choice unsure" data-c="-1">🤔 I'm not sure</button></div>`;
    $$('.choice', box).forEach((b) => b.addEventListener('click', () => {
      const pick = Number(b.dataset.c);
      const right = pick === q.answer;
      pl.answers.push({ unsure: pick < 0, t: (Date.now() - pl.shownAt) / 1000 });
      if (right) pl.correct++;
      pl.level = Math.max(1, Math.min(P.placementMax(d), pl.level + (right ? 1 : -1)));
      pl.qi++;
      if (pl.qi < PL_QUESTIONS) { plNext(pl); drawPlacement(); } else plFinishDomain(box);
    }));
  }

  function plFinishDomain(box) {
    const d = pl.domains[pl.di];
    const answered = pl.answers.filter((a) => !a.unsure);
    const avg = answered.length ? answered.reduce((n, a) => n + a.t, 0) / answered.length : 99;
    if (answered.length >= 3 && avg < 2.5) {
      box.innerHTML = `<div class="result"><div class="center-art"><span class="art">🧭</span></div><h2>That went fast!</h2>
        <p>Answers that quick don't show us your real level. Take your time, and if you don't know one, choose “I'm not sure”. That's totally fine.</p>
        <button class="btn" id="pl-redo">Redo this section</button></div>`;
      $('#pl-redo').addEventListener('click', () => { plStartDomain(pl); drawPlacement(); });
      return;
    }
    const s = skill(d);
    s.level = pl.level; s.placed = true;
    s.history.push({ date: today(), acc: pl.correct / PL_QUESTIONS, level: pl.level, placement: true });
    pl.results[d] = pl.level;
    pl.lastCorrect = pl.correct;
    pl.di++;
    if (pl.di < pl.domains.length) { plStartDomain(pl); drawPlacement(); } else plDone(box);
  }

  function plDone(box) {
    const p = pl;
    if (p.mode === 'skillcheck') addXP(30, 'Skill check');
    else if (p.taskId && findTask(p.taskId)) completeTask(p.taskId, 'auto', { acc: p.lastCorrect / PL_QUESTIONS, level: p.results[p.domains[0]] }, 20, 'Placement quiz');
    else addXP(10, 'Placement quiz');
    checkBadges(); save(); renderNav('practice');
    box.innerHTML = `
      <div class="result">
        <div class="center-art"><span class="art">🎉</span></div>
        <h2>Here's where you're starting</h2>
        <div class="levels-list">${p.domains.map((d) => `<div class="skill"><span>${D.DOMAINS[d].emoji} ${D.DOMAINS[d].name}<small class="muted"> ${levelName(p.results[d])}</small></span><span class="pips">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= p.results[d] ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}</div>
        <p class="muted">This isn't a grade. It just means practice starts in the right spot, and moves up as you grow. You can edit your schedule any time.</p>
        <div class="row center">${p.mode === 'skillcheck'
          ? `<button class="btn big" id="pl-go">Show me my path →</button>`
          : `<a class="btn" href="#/today">Back to today</a><a class="btn ghost" href="#/practice/${p.domains[0]}">Start practicing</a>`}</div>
      </div>`;
    const go1 = $('#pl-go');
    if (go1) go1.addEventListener('click', () => { pl = null; ensureSchedule(); save(); toast(`Your ${esc(career().title)} path is ready! 🗺️`); go('#/today'); });
  }

  routes.skillcheck = {
    html: () => {
      const doms = unplaced();
      return `
      <section class="card narrow quiz" id="quiz">
        <div class="center-art"><span class="art">🧭</span></div>
        <h2 class="center">Let's see where you're starting, ${esc(S.profile.name)}</h2>
        <p>Before we plan anything, a quick skill check helps us start you in the right place. It's <b>${doms.length} short section${doms.length === 1 ? '' : 's'}</b> (${doms.map((d) => D.DOMAINS[d].name).join(', ')}), about ${doms.length * 2} minutes.</p>
        <ul class="checklist"><li>It's <b>not a grade</b>. There's no pass or fail.</li><li>Questions get easier or harder based on your answers.</li><li>Not sure? Choose “I'm not sure”. That's better than guessing.</li></ul>
        <div class="row center"><button class="btn big" id="sc-start">Start skill check</button></div>
        <p class="center small"><button class="link" id="sc-skip">Skip for now (we'll start you at a typical level for grade ${esc(S.profile.grade)})</button></p>
      </section>`;
    },
    bind: () => {
      $('#sc-start').addEventListener('click', () => { pl = newPlacement(unplaced(), 'skillcheck'); drawPlacement(); });
      $('#sc-skip').addEventListener('click', () => {
        unplaced().forEach((d) => { const s = skill(d); s.level = defaultLevel(); s.placed = true; });
        ensureSchedule(); save(); go('#/today');
      });
    },
  };

  // ---------- try-outs (extracurricular tasters; optional, never affect streaks or integrity) ----------
  function activityLists() {
    const c = career();
    const ids = c ? [c.id] : matchCareers().slice(0, 3).map((m) => m.c.id);
    const rec = D.ACTIVITIES.filter((a) => a.careers.some((id) => ids.includes(id)));
    return { rec, other: D.ACTIVITIES.filter((a) => !rec.includes(a)), ids };
  }
  function suggestTry() {
    const untried = activityLists().rec.filter((a) => !S.tryouts[a.id]);
    if (!untried.length) return '';
    const a = untried[daysBetween('2026-01-01', today()) % untried.length];
    return `<div class="card try-card"><span class="act-emoji">${a.emoji}</span><div><small class="muted">Curious? No pressure.</small><b>${esc(a.name)}</b><small>${a.minutes}-minute taster</small><a class="link" href="#/tryout/${a.id}">Give it a try →</a></div></div>`;
  }
  function actCard(a) {
    const t = S.tryouts[a.id];
    const r = t && D.RATINGS.find((x) => x.v === t.rating);
    return `<article class="act">
      <div class="act-top"><span class="act-emoji">${a.emoji}</span><div><h3>${esc(a.name)}</h3><p class="muted">${esc(a.blurb)}</p></div></div>
      <p class="small muted">⏱️ ${a.minutes}-min taster · ${esc(a.commit)}</p>
      <div class="row">${r ? `<span class="tag">${r.emoji} ${r.label}</span>` : '<span></span>'}<a class="btn small ${t ? 'ghost' : ''}" href="#/tryout/${a.id}">${t ? 'Try again' : 'Try it'}</a></div>
    </article>`;
  }

  routes.tryout = {
    html: (id) => {
      const a = D.ACTIVITIES.find((x) => x.id === id);
      if (!a) return `<section class="card narrow"><p>Activity not found.</p><a class="btn" href="#/explore">Back to try-outs</a></section>`;
      return `
      <section class="card narrow">
        <a class="back" href="#/explore?tab=tryouts">← All try-outs</a>
        <div class="act-top big"><span class="act-emoji">${a.emoji}</span><div><h2>${esc(a.name)} taster</h2><p class="muted">${esc(a.blurb)}</p></div></div>
        <p class="small muted">⏱️ About ${a.minutes} minutes · Real clubs: ${esc(a.commit)}</p>
        <ol class="trysteps">${a.steps.map((st, i) => `
          <li class="trystep" data-i="${i}"><b>Step ${i + 1}</b><p>${esc(st.t)}</p>
            ${st.w ? `<textarea rows="3" placeholder="Write a few words…"></textarea><div class="row"><small class="muted">A few words is plenty.</small><button class="btn small" data-done>Done</button></div>`
                   : `<label class="toggle"><input type="checkbox" data-done> I did this</label>`}
            <div class="reveal" hidden></div></li>`).join('')}</ol>
        <div id="rate" hidden>
          <h3>How was it?</h3>
          <div class="rating">${D.RATINGS.map((r) => `<button data-r="${r.v}"><span>${r.emoji}</span>${r.label}</button>`).join('')}</div>
          <textarea id="try-note" rows="2" placeholder="Anything you noticed? (optional)"></textarea>
        </div>
        <div id="try-out" hidden></div>
      </section>`;
    },
    bind: (id) => {
      const a = D.ACTIVITIES.find((x) => x.id === id);
      if (!a) return;
      const marked = new Set();
      $$('.trystep').forEach((li) => {
        const i = Number(li.dataset.i), st = a.steps[i];
        const finish = () => {
          marked.add(i);
          li.classList.add('done');
          $$('textarea,input,button', li).forEach((e) => { e.disabled = true; });
          if (st.reveal) { const r = $('.reveal', li); r.textContent = '💡 ' + st.reveal; r.hidden = false; }
          if (marked.size === a.steps.length) { $('#rate').hidden = false; $('#rate').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        };
        const el = $('[data-done]', li);
        if (st.w) el.addEventListener('click', () => {
          if (words($('textarea', li).value).length < 3) { toast('Write a few words first', 'warn'); return; }
          finish();
        });
        else el.addEventListener('change', () => { if (el.checked) finish(); });
      });
      $$('[data-r]').forEach((b) => b.addEventListener('click', () => {
        const rating = Number(b.dataset.r);
        const first = !S.tryouts[a.id];
        S.tryouts[a.id] = Object.assign(S.tryouts[a.id] || {}, { rating, note: $('#try-note').value.trim(), date: today() });
        if (first) addXP(20, `Tried ${a.name}`); else S.activity[today()] = true;
        checkBadges(); save(); renderNav('tryout');
        const c = career();
        const onPath = c && a.careers.includes(c.id);
        const msg = rating >= 3
          ? `Sounds like it could be a fit! ${esc(a.join)}`
          : rating === 2 ? "That's okay, it's fine to be unsure. Try it again another day, or try something different."
          : "Totally fine! Knowing what's <i>not</i> for you is just as useful. Try something different.";
        const out = $('#try-out');
        $('#rate').hidden = true;
        out.hidden = false;
        out.innerHTML = `<div class="center-art"><span class="art">${rating >= 3 ? '🎉' : '🙂'}</span></div>
          <h3 class="center">${D.RATINGS.find((r) => r.v === rating).emoji} Thanks for trying it!</h3>
          <p>${msg}</p>
          ${rating >= 3 && !onPath ? `<p class="adapt">This one isn't on your ${c ? esc(c.title) : 'current'} path, but pay attention to what you enjoy. Interests can point to new careers. <a href="#/reveal">See if your matches changed →</a></p>` : ''}
          <div class="row center">
            ${rating >= 3 && S.plan && !S.tryouts[a.id].reminded ? `<button class="btn ghost" id="remind">📌 Add a reminder to my schedule</button>` : ''}
            <a class="btn" href="#/explore?tab=tryouts">Try something else</a></div>`;
        const rb = $('#remind');
        if (rb) rb.addEventListener('click', () => {
          const d = addDays(today(), 1);
          if (!S.plan.days[d]) S.plan.days[d] = { tasks: [], edited: true };
          S.plan.days[d].tasks.push({ id: uid(), type: 'milestone', custom: true, title: `Ask about joining: ${a.name}`, minutes: 10, status: 'todo' });
          S.plan.days[d].edited = true;
          S.tryouts[a.id].reminded = true; save();
          rb.disabled = true; rb.textContent = '✓ Added for tomorrow';
        });
      }));
    },
  };


  // ---------- lessons (learn first, then a 3-question understanding check) ----------
  let lq = null;
  const tierFor = (lv) => (lv <= 2 ? 1 : lv === 3 ? 2 : 3);
  const TIER_NAMES = ['Foundations', 'Core ideas', 'Going further'];

  routes.lesson = {
    html: (id) => {
      const f = findTask(id);
      if (!f || f.task.type !== 'lesson') return `<section class="card narrow"><p>Lesson not found.</p><a class="btn" href="#/today">Back</a></section>`;
      const t = f.task, s = skill(t.domain);
      const tier = t.tier || tierFor(s.level);
      const lesson = window.PF_LESSONS[t.domain][tier - 1];
      lq = { id, domain: t.domain, tier, level: Math.min(s.level, [2, 3, 5][tier - 1]), opened: Date.now(), i: 0, correct: 0 };
      return `
      <section class="card narrow lesson" id="lesson">
        <p class="muted small">📖 ${D.DOMAINS[t.domain].emoji} ${D.DOMAINS[t.domain].name} · ${TIER_NAMES[tier - 1]}</p>
        <h2>${esc(lesson.title)}</h2>
        ${lesson.body.map((p) => `<p>${esc(p)}</p>`).join('')}
        <pre class="example">${esc(lesson.example)}</pre>
        <h3>Remember</h3>
        <ul class="checklist">${lesson.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="row"><span class="muted small">Next: 3 quick questions to check it clicked. Take your time. Re-reading is fine.</span><button class="btn" id="lesson-go">I'm ready → check me</button></div>
        ${t.fails >= 2 && tier > 1 ? `<p class="adapt">Still feeling stuck? <button class="link" id="lesson-easier">Show me an easier lesson</button></p>` : ''}
      </section>`;
    },
    bind: (id) => {
      const go1 = $('#lesson-go');
      if (!go1) return;
      go1.addEventListener('click', () => { lq.qs = P.makeSet(lq.domain, lq.level, 3); lq.i = 0; lq.correct = 0; lq.times = []; drawLessonQ(); });
      const easier = $('#lesson-easier');
      if (easier) easier.addEventListener('click', () => { const t = findTask(id).task; t.tier = Math.max(1, (t.tier || lq.tier) - 1); t.fails = 0; save(); render(); });
    },
  };

  function drawLessonQ() {
    const box = $('#lesson');
    const q = lq.qs[lq.i];
    if (!q) return finishLessonCheck(box);
    lq.shownAt = Date.now();
    box.innerHTML = `
      <div class="quiz-head"><span>Check your understanding</span><span>${lq.i + 1} / ${lq.qs.length}</span></div>
      <div class="progress"><div style="width:${(lq.i / lq.qs.length) * 100}%"></div></div>
      <h2 class="question">${esc(q.q)}</h2>
      <div class="choices">${q.choices.map((ch, i) => `<button class="choice" data-c="${i}">${esc(ch)}</button>`).join('')}</div>
      <div class="feedback"></div>`;
    $$('.choice', box).forEach((b) => b.addEventListener('click', () => {
      const picked = Number(b.dataset.c), right = picked === q.answer;
      if (right) lq.correct++;
      $$('.choice', box).forEach((x, i) => { x.disabled = true; if (i === q.answer) x.classList.add('right'); else if (i === picked) x.classList.add('wrong'); });
      $('.feedback', box).innerHTML = `<p class="${right ? 'ok' : 'bad'}">${right ? '✓ Correct!' : `✗ The answer is <b>${esc(q.choices[q.answer])}</b>`}</p><button class="btn">${lq.i + 1 < lq.qs.length ? 'Next →' : 'See results'}</button>`;
      $('.feedback .btn', box).addEventListener('click', () => { lq.i++; drawLessonQ(); });
    }));
  }

  function finishLessonCheck(box) {
    const f = findTask(lq.id), t = f.task;
    const passed = lq.correct >= 2;
    if (passed) {
      const readSecs = (lq.shownAt - lq.opened) / 1000 - 8; // rough time before the check began
      const skimmed = (Date.now() - lq.opened) / 1000 < 25;
      completeTask(lq.id, 'auto', { correct: lq.correct, of: lq.qs.length }, (12 + lq.correct * 4) * (skimmed ? 0.4 : 1), 'Lesson');
      box.innerHTML = `<div class="result"><div class="center-art"><span class="art">🎉</span></div>
        <h2>${lq.correct === 3 ? 'You got it! 🌟' : 'Nice, that clicked! 👍'}</h2>
        <p>${lq.correct}/${lq.qs.length} on the check.${skimmed ? ' (That was quick. If it felt too easy, your next lessons will move up as you practice.)' : ''} Now the practice will make sense.</p>
        <div class="row center"><a class="btn big" href="#/today">Continue →</a></div></div>`;
    } else {
      t.fails = (t.fails || 0) + 1; save();
      box.innerHTML = `<div class="result"><div class="center-art"><span class="art">🙂</span></div>
        <h2>Let's read it once more</h2>
        <p>${lq.correct}/${lq.qs.length}. That's okay! The check is just to make sure it clicked before practice. Read the lesson again and try fresh questions.</p>
        <div class="row center"><button class="btn" id="reread">Read the lesson again</button>
        ${t.fails >= 2 && lq.tier > 1 ? `<button class="btn ghost" id="easier">Try an easier lesson</button>` : ''}</div></div>`;
      $('#reread').addEventListener('click', () => render());
      const e = $('#easier');
      if (e) e.addEventListener('click', () => { t.tier = Math.max(1, lq.tier - 1); t.fails = 0; save(); render(); });
    }
  }

  // ---------- Python runner (Pyodide in a Web Worker) ----------
  let py = null;
  function pyStart() {
    if (py) return py;
    const p = { w: new Worker('js/pyworker.js?v=' + (window.PF_V || 0)), pending: new Map(), seq: 0 };
    p.ready = new Promise((resolve, reject) => { p.ok = resolve; p.fail = reject; });
    p.ready.catch(() => {});
    p.w.onmessage = (e) => {
      const m = e.data;
      if (m.ready) return p.ok();
      const h = p.pending.get(m.id);
      if (h) { p.pending.delete(m.id); m.ok ? h.resolve(m.result) : h.reject(new Error(m.error)); }
    };
    p.w.onerror = () => { p.fail(new Error('load')); p.pending.forEach((h) => h.reject(new Error('load'))); if (py === p) py = null; };
    py = p;
    return p;
  }
  function pyRun(code, fn, tests) {
    const p = pyStart();
    return p.ready.then(() => new Promise((resolve, reject) => {
      const id = ++p.seq;
      const timer = setTimeout(() => { p.pending.delete(id); p.w.terminate(); if (py === p) py = null; reject(new Error('timeout')); }, 6000);
      p.pending.set(id, { resolve: (r) => { clearTimeout(timer); resolve(r); }, reject: (e) => { clearTimeout(timer); reject(e); } });
      p.w.postMessage({ id, code, fn, tests });
    }));
  }
  const pyRepr = (v) => (v === null ? 'None' : v === true ? 'True' : v === false ? 'False' : typeof v === 'string' ? JSON.stringify(v)
    : Array.isArray(v) ? '[' + v.map(pyRepr).join(', ') + ']'
    : typeof v === 'object' ? '{' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + pyRepr(x)).join(', ') + '}' : String(v));

  // ---------- Code Lab: Python exercises for your job ----------
  const EXS = () => window.PF_EXERCISES;
  const relevantExercises = () => EXS().filter((e) => e.careers.includes('*') || (S.careerId && e.careers.includes(S.careerId)));
  function pickExercise() {
    const lv = skill('coding').level;
    const all = relevantExercises();
    let cands = all.filter((e) => !S.codeDone[e.id] && e.level <= lv + 1);
    if (!cands.length) cands = all.filter((e) => !S.codeDone[e.id]);
    if (!cands.length) cands = all.slice().sort((a, b) => S.codeDone[a.id].date.localeCompare(S.codeDone[b.id].date)).slice(0, 4);
    cands.sort((a, b) => (Math.abs(a.level - lv) + (a.careers.includes('*') ? 0.5 : 0)) - (Math.abs(b.level - lv) + (b.careers.includes('*') ? 0.5 : 0)));
    return cands[0];
  }
  function jobName(ex) { const c = D.CAREERS.find((x) => ex.careers.includes(x.id)); return c ? `${c.emoji} ${c.title}` : '🐍 Python skills'; }

  let cs = null;
  routes.code = {
    html: (id) => {
      let ex, task = null;
      const f = id && findTask(id);
      if (f && f.task.type === 'code') { task = f.task; if (!task.ex) { task.ex = pickExercise().id; save(); } ex = EXS().find((e) => e.id === task.ex); }
      else if (id) ex = EXS().find((e) => e.id === id);
      if (!ex) {
        const row = (e) => `<a class="exrow" href="#/code/${e.id}"><span>${S.codeDone[e.id] ? '✅' : '⬜'}</span><b>${esc(e.title)}</b><small class="muted">${jobName(e)} · Level ${e.level}</small></a>`;
        const mine = relevantExercises().filter((e) => !e.careers.includes('*')), core = relevantExercises().filter((e) => e.careers.includes('*'));
        return `<section class="card narrow"><h2>🐍 Code Lab</h2>
          <p class="muted">Write real Python. Your code runs on tests (including hidden ones), so you'll know it truly works. Your Python level: <b>${levelName(skill('coding').level)}</b>.</p>
          ${mine.length ? `<h3>For your job</h3><div class="exlist">${mine.map(row).join('')}</div>` : ''}
          <h3>Python skills</h3><div class="exlist">${core.map(row).join('')}</div></section>`;
      }
      cs = { ex, taskId: task && task.id, runs: 0, fails: 0, hints: 0, sol: false, start: Date.now(), pasted: 0, done: false };
      const lock = task && S.plan && lockedByLesson(task, findTask(task.id).day);
      return `
      <section class="card code-card">
        <a class="link small" href="${task ? '#/today' : '#/code'}">← ${task ? 'Back to today' : 'Code Lab'}</a>
        <div class="code-head"><span class="tag">🐍 Python · Level ${ex.level}</span><span class="tag">${esc(jobName(ex))}</span></div>
        <h2>${esc(ex.title)}</h2>
        <p class="story">${esc(ex.story)}</p>
        <p><b>Your task:</b> ${esc(ex.task)}</p>
        <details class="learn" open><summary>💡 Ideas you'll use</summary><pre class="example">${esc(ex.learn)}</pre></details>
        <textarea id="code" class="code" spellcheck="false" autocapitalize="off" autocomplete="off" rows="${Math.max(8, ex.starter.split('\n').length + 3)}">${esc(ex.starter)}</textarea>
        <div class="row"><div class="btns"><button class="btn" id="run">▶ Run tests</button><button class="btn ghost" id="hint">💡 Hint</button><button class="link" id="reset-code">Reset code</button></div><span id="py-status" class="muted small">Loading Python…</span></div>
        ${lock ? '<p class="adapt">Tip: do the lesson for this subject first. It teaches the ideas you need here.</p>' : ''}
        <div id="hint-box"></div>
        <div id="results"></div>
      </section>`;
    },
    bind: (id) => {
      if (!cs || !$('#code')) return;
      const ta = $('#code'), status = $('#py-status');
      const st = pyStart();
      st.ready.then(() => { status.textContent = 'Python ready ✓'; }).catch(() => { status.textContent = '⚠️ Python could not load (it needs internet the first time).'; });
      ta.addEventListener('paste', (e) => { cs.pasted += (e.clipboardData || window.clipboardData).getData('text').length; });
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') { e.preventDefault(); const a = ta.selectionStart; ta.setRangeText('    ', a, ta.selectionEnd, 'end'); }
      });
      $('#reset-code').addEventListener('click', () => { if (confirm('Reset your code to the starting template?')) ta.value = cs.ex.starter; });
      $('#hint').addEventListener('click', () => {
        const h = cs.ex.hints;
        if (cs.hints >= h.length) { toast('No more hints. You can do this! 💪'); return; }
        cs.hints++;
        $('#hint-box').insertAdjacentHTML('beforeend', `<div class="hint"><b>Hint ${cs.hints}:</b><pre class="example">${esc(h[cs.hints - 1])}</pre></div>`);
      });
      $('#run').addEventListener('click', () => runCode());
    },
  };

  async function runCode() {
    if (cs.done) return;
    const ta = $('#code'), status = $('#py-status'), res = $('#results'), btn = $('#run');
    btn.disabled = true; status.textContent = 'Running your code…';
    let out;
    try { out = await pyRun(ta.value, cs.ex.fn, cs.ex.tests); }
    catch (e) {
      btn.disabled = false;
      status.textContent = '';
      res.innerHTML = e.message === 'timeout'
        ? `<div class="result-box bad">⏱️ Your code ran for too long and was stopped. Check your loop: does it ever end? (Python is restarting, which takes a few seconds.)</div>`
        : `<div class="result-box bad">⚠️ Python couldn't start. It loads from the internet the first time, so check your connection and refresh the page.</div>`;
      return;
    }
    btn.disabled = false; status.textContent = 'Python ready ✓';
    cs.runs++;
    if (out.fatal) { cs.fails++; res.innerHTML = `<div class="result-box bad"><b>Your code has a problem:</b><br>${esc(out.fatal)}</div>${solutionOffer()}`; bindSolution(); return; }
    const total = out.results.length, passed = out.results.filter((r) => r.ok).length;
    const vis = out.results.slice(0, 2), hidden = out.results.slice(2);
    const hiddenPass = hidden.filter((r) => r.ok).length;
    const call = (t) => `${cs.ex.fn}(${t.a.map(pyRepr).join(', ')})`;
    const rows = vis.map((r, i) => {
      const t = cs.ex.tests[i];
      return `<li class="${r.ok ? 'pass' : 'fail'}"><b>${r.ok ? '✓' : '✗'}</b> <code>${esc(call(t))}</code><br>
        ${r.ok ? `<small>gave ${esc(pyRepr(r.got))}</small>` : `<small>expected <code>${esc(pyRepr(t.e))}</code>, ${r.err ? `but got an error: ${esc(r.err)}` : `but got <code>${esc(pyRepr(r.got))}</code>`}${r.got === null && !r.err ? ' — did you forget <code>return</code>?' : ''}</small>`}</li>`;
    }).join('');
    const hiddenRow = hidden.length ? `<li class="${hiddenPass === hidden.length ? 'pass' : 'fail'}"><b>${hiddenPass === hidden.length ? '✓' : '✗'}</b> 🔒 ${hiddenPass} of ${hidden.length} hidden tests passed${hiddenPass < hidden.length ? '. Think about unusual inputs (empty, zero, negative, repeated values).' : ''}</li>` : '';
    const printed = out.stdout ? `<div class="stdout"><b>Your print() output:</b><pre>${esc(out.stdout)}</pre></div>` : '';
    if (passed === total) return codePassed(res, rows + hiddenRow, printed);
    cs.fails++;
    res.innerHTML = `<div class="result-box"><b>${passed} of ${total} tests passed.</b> Keep going, you're closer than you think.</div><ul class="tests">${rows}${hiddenRow}</ul>${printed}${solutionOffer()}`;
    bindSolution();
  }

  function solutionOffer() {
    return cs.fails >= 3 && !cs.sol ? `<p class="adapt">Stuck for a while? <button class="link" id="show-sol">Show me a worked solution</button> (you'll earn less XP, and we'll give you easier practice next).</p>` : '';
  }
  function bindSolution() {
    const b = $('#show-sol');
    if (!b) return;
    b.addEventListener('click', () => {
      if (!confirm('Show the worked solution? You can still type it in yourself to finish, but it earns less XP.')) return;
      cs.sol = true;
      $('#hint-box').insertAdjacentHTML('beforeend', `<div class="hint"><b>Worked solution:</b><pre class="example">${esc(cs.ex.solution)}</pre><small class="muted">Read it, understand each line, then type it yourself and run the tests.</small></div>`);
      b.closest('p').remove();
    });
  }

  function codePassed(res, rows, printed) {
    cs.done = true;
    const ex = cs.ex, ta = $('#code');
    const code = ta.value;
    ta.readOnly = true;
    const elapsed = (Date.now() - cs.start) / 1000;
    let xp = 20 + ex.level * 6;
    xp *= 1 - Math.min(0.4, cs.hints * 0.1);
    if (cs.sol) xp *= 0.3;
    const pastedMost = cs.pasted > 0.6 * code.length && code.length > 40;
    const tooFast = !cs.sol && elapsed < 25 && code.length > 60 && cs.runs <= 1;
    if (pastedMost) { integrity(-3, 'Pasted most of a Python solution instead of writing it'); xp *= 0.5; }
    else if (tooFast) { integrity(-2, `Solved "${ex.title}" suspiciously fast`); xp *= 0.5; }
    // Python level follows how cleanly the student solves things.
    const s = skill('coding');
    const clean = !cs.sol && cs.hints <= 1 && cs.fails <= 3 && !pastedMost;
    let note = '';
    // Only exercises at (or above) the student's level count as progress; easier ones are just review.
    if (clean && ex.level >= s.level) { s.clean = (s.clean || 0) + 1; s.struggle = 0; if (s.clean >= 2 && s.level < 5) { s.level++; s.clean = 0; note = `🚀 Python is now Level ${s.level} (${levelName(s.level)})!`; } }
    else if (cs.sol) { s.struggle = (s.struggle || 0) + 1; s.clean = 0; if (s.struggle >= 2 && s.level > 1) { s.level--; s.struggle = 0; note = `We eased Python back to Level ${s.level} so you can build confidence first.`; } }
    s.history.push({ date: today(), acc: clean ? 1 : 0.5, level: s.level, code: true });
    S.codeDone[ex.id] = { date: today(), clean };
    if (cs.taskId && findTask(cs.taskId)) completeTask(cs.taskId, 'code', { tests: ex.tests.length, attempts: cs.runs, hints: cs.hints, solution: cs.sol }, xp, 'Python exercise');
    else { addXP(xp * 0.6, 'Python practice'); checkBadges(); }
    save(); renderNav('code');
    const next = cs.taskId ? '<a class="btn big" href="#/today">Back to today →</a>' : '<a class="btn big" href="#/code">Next exercise →</a>';
    res.innerHTML = `<div class="result-box ok-box"><div class="center-art"><span class="art">🎉</span></div>
      <h3 class="center">All tests passed! 🎉</h3>
      <p class="center">${cs.sol ? 'Nice work typing it out. Next time you will write it yourself.' : cs.runs === 1 ? 'First try!' : `Solved in ${cs.runs} runs. Debugging is the real skill.`}${note ? '<br><b>' + esc(note) + '</b>' : ''}</p>
      <ul class="tests">${rows}</ul>${printed}
      <details><summary>See a reference solution</summary><pre class="example">${esc(ex.solution)}</pre></details>
      <div class="row center">${next}</div></div>`;
    confetti();
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('DOMContentLoaded', render);

  // Exposed for automated tests.
  window.PF_APP = { checkReflection: (t, m) => checkReflection(t, m || {}), traitScores, state: () => S };
})();
