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
    tryouts: {}, activity: {}, rest: {},
    settings: { demo: false, pandaName: 'Bao' },
  });
  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(blank(), JSON.parse(raw));
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
  const pandaName = () => (S.settings && S.settings.pandaName) || 'Bao';
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
      if (kw.length) reasons.push(`You mentioned <b>${kw.slice(0, 3).map(esc).join(', ')}</b>`);
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
    // Every other day, practice goes to the student's weakest subject so levels stay balanced.
    const weakest = c.domains.slice().sort((a, b) => skill(a).level - skill(b).level)[0];
    const dom = idx % 2 === 0 ? weakest : c.domains[idx % c.domains.length];
    const ft = c.tasks[idx % c.tasks.length];
    const tasks = [
      { id: uid(), type: 'practice', domain: dom, title: `${D.DOMAINS[dom].name} practice set`, minutes: 10, status: 'todo' },
      { id: uid(), type: 'focus', title: ft.title, skill: ft.skill, minutes: round5(total - 15), status: 'todo' },
      { id: uid(), type: 'reflect', title: 'Daily reflection', prompt: D.REFLECT_PROMPTS[idx % D.REFLECT_PROMPTS.length].replace(/\{career\}/g, c.title), minutes: 5, status: 'todo' },
    ];
    if (st.stretch) {
      const d2 = c.domains[(idx + 1) % c.domains.length];
      tasks.push({ id: uid(), type: 'practice', domain: d2, stretch: true, title: `Stretch challenge: ${D.DOMAINS[d2].name}`, minutes: 10, status: 'todo' });
    }
    if (idx % 7 === 6) {
      const ms = milestones(c);
      tasks.push({ id: uid(), type: 'milestone', title: ms[Math.floor(idx / 7) % ms.length], minutes: 15, status: 'todo' });
    }
    return { tasks, edited: false };
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
  function render() {
    stopFocusTimer();
    let { name, arg, params } = currentRoute();
    if (!S.profile && name !== 'profile' && name !== 'welcome') name = 'welcome';
    else if (S.profile && !S.personality && ['today', 'schedule', 'careers', 'practice', 'focus', 'explore', 'tryout', 'skillcheck'].includes(name)) name = 'test';
    else if (S.personality && !S.careerId && ['today', 'schedule', 'practice', 'focus', 'skillcheck'].includes(name)) name = 'careers';
    if (!name) name = S.careerId ? 'today' : S.personality ? 'careers' : S.profile ? 'test' : 'welcome';
    // Before any task is assigned, the student's level is checked with a short placement.
    if (S.careerId && unplaced().length && ['today', 'schedule', 'practice', 'focus'].includes(name)) name = 'skillcheck';
    if (name === 'skillcheck' && S.careerId && !unplaced().length) name = 'today';
    if (currentRoute().name && currentRoute().name !== name) history.replaceState(null, '', `#/${name}`);
    pl = name === 'practice' ? pl : null;
    if (S.careerId && !unplaced().length) ensureSchedule();
    const view = routes[name] || routes.welcome;
    $('#app').innerHTML = view.html(arg, params);
    renderNav(name);
    if (view.bind) view.bind(arg, params);
    window.scrollTo(0, 0);
  }

  function renderNav(active) {
    const steps = [
      ['profile', 'About me', true],
      ['test', 'Personality', !!S.profile],
      ['careers', 'Careers', !!S.personality],
      ['today', 'Today', !!S.careerId],
      ['schedule', 'My Path', !!S.careerId],
      ['practice', 'Practice', !!S.careerId],
      ['explore', 'Try-outs', !!S.personality],
      ['rewards', 'Rewards', !!S.profile],
    ];
    $('#nav').innerHTML = steps.map(([k, label, on]) =>
      `<a href="#/${k}" class="${active === k ? 'active' : ''} ${on ? '' : 'locked'}" ${on ? '' : 'aria-disabled="true" tabindex="-1"'}>${label}</a>`).join('');
    $('#hud').innerHTML = S.profile ? `
      <a href="#/today" class="hud-panda" title="${esc(pandaName())} the panda">${pandaSVG(pandaState().mood, 34)}</a>
      <span title="Level">⭐ Lv ${level()}</span>
      <span title="XP">${S.xp} XP</span>
      <span title="Coins">🪙 ${S.coins}</span>
      <span title="Streak">🔥 ${streak()}</span>` : '';
  }

  // ---------- views ----------
  routes.welcome = {
    html: () => `
      <section class="hero">
        <div class="hero-text">
          <h1>Find your path. <span class="grad">Build it day by day.</span></h1>
          <p class="lead">Pathfinder helps middle and high school students discover careers that fit who they are,
          then turns that dream into a real plan: the right classes, competitions, olympiads, and daily practice
          that adapts to you, with badges and rewards along the way.</p>
          <a class="btn big" href="#/profile">Get started →</a>
          <div class="hero-panda">${pandaSVG('happy', 150)}<div class="bubble">Hi, I'm ${esc(pandaName())}! Let's find your path together. 🎋</div></div>
        </div>
        <div class="hero-steps">
          ${[['🙋', 'Tell us about you', 'Hobbies, interests, favorite subjects, and goals.'],
             ['🧠', 'Take the personality test', '18 quick questions, about 3 minutes.'],
             ['💼', 'Get job matches', 'See careers that fit you, and why.'],
             ['🗺️', 'Check your level, get your path', 'A quick skill check, then a grade-by-grade roadmap and a daily plan you can edit.'],
             ['🐼', 'Keep your panda happy', 'Show up each day, try new activities, and earn badges and prizes.']]
             .map(([e, t, d], i) => `<div class="step"><span class="step-n">${i + 1}</span><span class="step-e">${e}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('')}
        </div>
      </section>`,
  };

  function subjectChips(grade, selected) {
    return D.subjectsFor(grade).map(([label]) => `<label class="chip"><input type="checkbox" name="subjects" value="${esc(label)}" ${(selected || []).includes(label) ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('');
  }

  routes.profile = {
    html: () => {
      const p = S.profile || { subjects: [], dailyMinutes: 45, grade: '9' };
      return `
      <section class="card narrow">
        <h2>🙋 About me</h2>
        <p class="muted">This helps Pathfinder recommend careers and build a plan that fits your grade.</p>
        <form id="profile-form" class="form">
          <label>First name<input name="name" required maxlength="40" value="${esc(p.name)}" placeholder="e.g. Maya"></label>
          <label>Grade
            <select name="grade">${[6, 7, 8, 9, 10, 11, 12].map((g) => `<option value="${g}" ${String(p.grade) === String(g) ? 'selected' : ''}>Grade ${g}</option>`).join('')}</select>
          </label>
          <label class="full">Hobbies <small>(comma separated)</small><input name="hobbies" value="${esc(p.hobbies)}" placeholder="e.g. chess, drawing, soccer, video games"></label>
          <label class="full">Interests <small>(topics you love learning about)</small><input name="interests" value="${esc(p.interests)}" placeholder="e.g. space, animals, AI, business"></label>
          <fieldset class="full"><legend>Favorite subjects</legend>
            <div class="chips" id="subject-chips">${subjectChips(p.grade, p.subjects)}</div>
            <small class="muted">These change with your grade.</small>
          </fieldset>
          <label class="full">Future goals & dreams<textarea name="aspirations" rows="3" placeholder="What do you want to do or become someday? Anything goes!">${esc(p.aspirations)}</textarea></label>
          <label class="full">How much time can you spend on your path each day?
            <select name="dailyMinutes">${[30, 45, 60, 90].map((m) => `<option value="${m}" ${Number(p.dailyMinutes) === m ? 'selected' : ''}>${m} minutes</option>`).join('')}</select>
          </label>
          <div class="full actions"><button class="btn big" type="submit">${S.profile ? 'Save changes' : 'Next: Personality test →'}</button></div>
        </form>
      </section>`;
    },
    bind: () => {
      const form = $('#profile-form');
      form.grade.addEventListener('change', () => {
        const keep = $$('input[name=subjects]:checked', form).map((i) => i.value);
        $('#subject-chips').innerHTML = subjectChips(form.grade.value, keep);
      });
      $('#profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const first = !S.profile;
        S.profile = {
          name: fd.get('name').trim(), grade: fd.get('grade'), hobbies: fd.get('hobbies').trim(),
          interests: fd.get('interests').trim(), subjects: fd.getAll('subjects'),
          aspirations: fd.get('aspirations').trim(), dailyMinutes: Number(fd.get('dailyMinutes')),
        };
        save();
        toast(first ? `Nice to meet you, ${esc(S.profile.name)}! 👋` : 'Profile saved');
        go(first || !S.personality ? '#/test' : '#/careers');
      });
    },
  };

  routes.test = {
    html: () => {
      const ans = (S.personality && S.personality.answers) || {};
      const scale = ['Not me', 'A little', 'Sometimes', 'Mostly', 'Totally me'];
      return `
      <section class="card narrow">
        <h2>🧠 Personality test</h2>
        <p class="muted">There are no right or wrong answers. Go with your first instinct.</p>
        <div class="progress"><div id="test-bar" style="width:0%"></div></div>
        <form id="test-form">
          ${D.QUESTIONS.map((q, i) => `
            <div class="likert" data-i="${i}">
              <p><span class="qn">${i + 1}.</span> ${esc(q.q)}</p>
              <div class="scale">${scale.map((l, v) => `<label><input type="radio" name="q${i}" value="${v + 1}" ${ans[i] === v + 1 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
            </div>`).join('')}
          <div class="actions"><button class="btn big" type="submit">See my results →</button></div>
        </form>
      </section>`;
    },
    bind: () => {
      const form = $('#test-form');
      const update = () => {
        const n = D.QUESTIONS.filter((_, i) => form[`q${i}`].value).length;
        $('#test-bar').style.width = (n / D.QUESTIONS.length) * 100 + '%';
      };
      form.addEventListener('change', update);
      update();
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const answers = {};
        const missing = [];
        D.QUESTIONS.forEach((_, i) => { const v = form[`q${i}`].value; if (v) answers[i] = Number(v); else missing.push(i); });
        if (missing.length) {
          toast(`Please answer all questions (${missing.length} left)`, 'warn');
          $(`.likert[data-i="${missing[0]}"]`).scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        S.personality = { answers, traits: traitScores(answers), date: today() };
        if (!S.badges.explorer) addXP(50, 'Personality test');
        checkBadges();
        save();
        go('#/careers');
      });
    },
  };

  function traitBars(traits) {
    return Object.entries(traits).sort((a, b) => b[1] - a[1]).map(([t, v]) => `
      <div class="trait"><div class="trait-head"><b>${D.TRAITS[t].name}</b><span>${v}%</span></div>
      <div class="bar"><div style="width:${v}%"></div></div><small class="muted">${D.TRAITS[t].desc}</small></div>`).join('');
  }

  routes.careers = {
    html: () => {
      const tr = S.personality.traits;
      const top = Object.entries(tr).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => D.TRAITS[t].name);
      const matches = matchCareers();
      const card = (m, i) => `
        <article class="career ${m.c.id === S.careerId ? 'selected' : ''}">
          <div class="career-top"><span class="career-emoji">${m.c.emoji}</span>
            <div><h3>${esc(m.c.title)}</h3><p class="muted">${esc(m.c.summary)}</p></div>
            <span class="match ${i < 3 ? 'hot' : ''}">${m.score}%</span></div>
          ${m.reasons.length ? `<ul class="reasons">${m.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>` : ''}
          <p class="skills"><b>Key skills:</b> ${m.c.skills.map(esc).join(' · ')}</p>
          <button class="btn ${m.c.id === S.careerId ? 'ghost' : ''}" data-pick="${m.c.id}">${m.c.id === S.careerId ? '✓ Your path' : 'Choose this path'}</button>
        </article>`;
      return `
      <section class="grid-2">
        <div class="card">
          <h2>Your personality: <span class="grad">The ${top.join('-')}</span></h2>
          ${traitBars(tr)}
          <a href="#/test" class="link">Retake test</a>
        </div>
        <div class="card">
          <h2>💼 Your top career matches</h2>
          <p class="muted">Based on your personality, hobbies, interests, favorite subjects, and goals. Pick one to build your path (you can switch later).</p>
          <div class="careers">${matches.slice(0, 5).map(card).join('')}</div>
          <details><summary>See all ${matches.length} careers</summary><div class="careers">${matches.slice(5).map((m, i) => card(m, i + 5)).join('')}</div></details>
        </div>
      </section>`;
    },
    bind: () => {
      $$('[data-pick]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.pick;
        if (id === S.careerId) return go('#/schedule');
        if (S.careerId && !confirm('Switch career path? Your upcoming schedule will be rebuilt (XP, badges, and skill levels are kept).')) return;
        S.careerId = id;
        S.plan = null;
        if (!S.badges.pathfinder) addXP(50, 'Chose a path');
        checkBadges();
        save();
        if (unplaced().length) { toast("Great choice! First, let's see where you're starting. 🧭"); go('#/skillcheck'); }
        else { ensureSchedule(); save(); toast(`Your ${esc(career().title)} path is ready! 🗺️`); go('#/schedule'); }
      }));
    },
  };

  function taskIcon(t) { return { practice: '📝', focus: '⏱️', reflect: '💭', milestone: '🎖️' }[t.type]; }
  function taskMeta(t) {
    const kind = { practice: t.status !== 'done' && t.domain ? (isPlaced(t.domain) ? `Auto-graded quiz · Level ${skill(t.domain).level}` : 'Placement quiz (sets your starting level)') : 'Auto-graded quiz', focus: 'Tracked focus timer', reflect: 'Written reflection', milestone: 'Real-world milestone' }[t.type];
    return `${kind} · ${t.minutes} min${t.stretch ? ' · <span class="tag">stretch</span>' : ''}${t.custom ? ' · <span class="tag">added by you</span>' : ''}`;
  }
  function verifiedLabel(t) {
    if (t.status !== 'done') return '';
    const r = t.result || {};
    if (t.type === 'practice') return `<span class="ok">✓ ${Math.round(r.acc * 100)}% correct (level ${r.level})</span>`;
    if (t.type === 'focus') return `<span class="ok">✓ ${r.minutes} focused min · ${r.switches} distraction${r.switches === 1 ? '' : 's'}</span>`;
    if (t.type === 'reflect') return `<span class="ok">✓ Reflection accepted</span>`;
    return `<span class="ok self">✓ Self-reported${r.verifier ? ` · confirmed by ${esc(r.verifier)}` : ''}</span>`;
  }

  function taskRow(t, date) {
    const isToday = date === today();
    const canDo = date <= today() && t.status !== 'done';
    let action = '';
    if (canDo) {
      if (t.type === 'practice') action = `<a class="btn small" href="#/practice/${t.domain}?task=${t.id}">Start quiz</a>`;
      if (t.type === 'focus') action = `<a class="btn small" href="#/focus/${t.id}">Start timer</a>`;
      if (t.type === 'reflect') action = `<button class="btn small" data-reflect="${t.id}">Write</button>`;
      if (t.type === 'milestone') action = `<button class="btn small" data-milestone="${t.id}">Report</button>`;
    } else if (date > today()) action = `<span class="muted small">Unlocks ${isToday ? 'today' : prettyDate(date)}</span>`;
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

  routes.today = {
    html: () => {
      const c = career();
      const t = today();
      const day = S.plan.days[t];
      const pct = Math.round(dayCompletion(day) * 100);
      const st = stamina();
      const nextBadge = D.BADGES.find((b) => !S.badges[b.id]);
      const lv = level(), into = S.xp % 250;
      const hour = new Date().getHours();
      const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
      return `
      <section class="today-head">
        <div><h1>${hello}, ${esc(S.profile.name)}! ${c.emoji}</h1>
        <p class="muted">Day ${daysBetween(S.plan.start, t) + 1} on your path to becoming a <b>${esc(c.title)}</b>.</p></div>
        <div class="ring" style="--p:${pct}"><span>${pct}%</span><small>today</small></div>
      </section>
      ${pandaCard(day)}
      <section class="grid-2 wide-left">
        <div class="card">
          <h2>Today's plan · ${prettyDate(t)}</h2>
          <p class="adapt">🧬 ${esc(st.note)}</p>
          <ul class="tasks">${day.tasks.map((x) => taskRow(x, t)).join('')}</ul>
          <a href="#/schedule" class="link">Edit my schedule →</a>
        </div>
        <div class="stack">
          <div class="card stat-card">
            <div class="stat"><b>Lv ${lv}</b><small>${levelTitle(lv)}</small></div>
            <div class="bar xp"><div style="width:${(into / 250) * 100}%"></div></div>
            <small class="muted">${250 - into} XP to Level ${lv + 1}</small>
            <div class="stats-row">
              <div><b>🔥 ${streak()}</b><small>day streak</small></div>
              <div><b>🛡️ ${S.integrity.score}</b><small>integrity</small></div>
              <div><b>🪙 ${S.coins}</b><small>coins</small></div>
            </div>
          </div>
          <div class="card">
            <h3>Skill levels</h3>
            ${c.domains.map((d) => { const s = skill(d); return `<div class="skill"><span>${D.DOMAINS[d].emoji} ${D.DOMAINS[d].name}<small class="muted"> ${isPlaced(d) ? levelName(s.level) : '· placement quiz first'}</small></span><span class="pips">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= s.level ? 'on' : ''}"></i>`).join('')}</span></div>`; }).join('')}
            <small class="muted">Your first quiz in each subject sets your starting level. Score 80%+ to level up. Level 5 = competition level.</small>
          </div>
          ${suggestTry()}
          ${nextBadge ? `<div class="card next-badge"><span>${nextBadge.emoji}</span><div><small class="muted">Next badge</small><b>${esc(nextBadge.name)}</b><small>${esc(nextBadge.desc)}</small></div></div>` : ''}
        </div>
      </section>`;
    },
    bind: () => {
      bindTaskActions();
      const rb = $('#rest-day');
      if (rb) rb.addEventListener('click', () => { S.rest[today()] = true; save(); toast(`😴 ${esc(pandaName())} is taking a nap with you. Rest well!`); render(); });
    },
  };

  routes.schedule = {
    html: (arg, params) => {
      const c = career();
      const t = today();
      const stage = gradeStage(S.profile.grade);
      const tab = params.tab || 'daily';
      const days = [];
      for (let i = -3; i <= 13; i++) { const d = addDays(t, i); if (S.plan.days[d]) days.push(d); }
      return `
      <section class="card">
        <div class="path-head">
          <span class="career-emoji big">${c.emoji}</span>
          <div><h1>My path: ${esc(c.title)}</h1><p class="muted">${esc(c.summary)}</p></div>
          <a class="btn ghost small" href="#/careers">Change career</a>
        </div>
        <div class="tabs">
          <a href="#/schedule?tab=daily" class="${tab === 'daily' ? 'active' : ''}">📅 Daily schedule</a>
          <a href="#/schedule?tab=roadmap" class="${tab === 'roadmap' ? 'active' : ''}">🗺️ Grade-by-grade roadmap</a>
        </div>
      </section>
      ${tab === 'roadmap' ? `
      <section class="card">
        <h2>What a future ${esc(c.title)} needs</h2>
        <div class="chips static">${c.skills.map((s) => `<span class="chip on">${esc(s)}</span>`).join('')}</div>
        <ol class="timeline">${D.STAGES.map((s) => `
          <li class="${s.key === stage ? 'now' : ''}"><div class="dot"></div><div>
            <h3>${s.label}${s.key === stage ? ' <span class="tag">You are here</span>' : ''}</h3>
            <ul>${c.path[s.key].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></li>`).join('')}
        </ol>
        <h2>🏅 Competitions & olympiads to aim for</h2>
        <ul class="comp">${c.competitions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="muted small">Ask your school counselor which of these your school offers. Many are free or low cost.</p>
      </section>` : `
      <section class="card">
        <p class="muted">Your plan adapts as you go: if you keep completing tasks and scoring well, days get longer and harder. If you fall behind, they get lighter. Edit anything you like. Edited days stay exactly as you set them.</p>
        <div class="days">${days.map((d) => dayCard(d)).join('')}</div>
      </section>`}`;
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
              ${x.status !== 'done' && d === t ? (x.type === 'practice' ? `<a class="btn small" href="#/practice/${x.domain}?task=${x.id}">Start</a>` : x.type === 'focus' ? `<a class="btn small" href="#/focus/${x.id}">Start</a>` : x.type === 'reflect' ? `<button class="btn small" data-reflect="${x.id}">Write</button>` : `<button class="btn small" data-milestone="${x.id}">Report</button>`) : ''}
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
        <label>Type<select name="type">${[['focus', '⏱️ Focus session (timer)'], ['practice', '📝 Practice quiz'], ['reflect', '💭 Reflection'], ['milestone', '🎖️ Milestone']].map(([v, l]) => `<option value="${v}" ${t.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Minutes<input name="minutes" type="number" min="5" max="180" step="5" value="${t.minutes || 20}"></label>
        <label class="full domain-pick">Quiz subject<select name="domain">${Object.keys(D.DOMAINS).map((d) => `<option value="${d}" ${(t.domain || c.domains[0]) === d ? 'selected' : ''}>${D.DOMAINS[d].name}</option>`).join('')}</select></label>
        <div class="full row"><button type="button" class="link cancel">Cancel</button><button class="btn small">Save</button></div>
      </form>`;
  }

  function bindTaskForm(box, onSave) {
    const form = $('form', box);
    const sync = () => { $('.domain-pick', form).style.display = form.type.value === 'practice' ? '' : 'none'; };
    form.type.addEventListener('change', sync); sync();
    $('.cancel', form).addEventListener('click', () => { box.innerHTML = ''; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      onSave({ title: form.title.value.trim(), type: form.type.value, minutes: Math.max(5, Number(form.minutes.value) || 10), domain: form.domain.value });
    });
  }

  function editTask(id) {
    const f = findTask(id);
    const box = $(`#form-${id}`);
    box.innerHTML = taskForm(f.task);
    bindTaskForm(box, (v) => {
      Object.assign(f.task, v);
      if (v.type === 'reflect' && !f.task.prompt) f.task.prompt = D.REFLECT_PROMPTS[0].replace(/\{career\}/g, career().title);
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
        <section class="card">
          <h2>📝 Practice</h2>
          <p class="muted">Your first set in each subject is a short placement quiz that finds your starting level. After that, every set is 5 questions at your level: score 80%+ to level up; under 40% and we'll ease back. Free practice earns XP too.</p>
          <h3>For your ${esc(c.title)} path</h3><div class="tiles">${c.domains.map(tile).join('')}</div>
          <h3>Explore other subjects</h3><div class="tiles">${others.map(tile).join('')}</div>
        </section>`;
      }
      const s = skill(domain);
      if (!isPlaced(domain)) { quiz = null; pl = newPlacement([domain], 'single', params.task); }
      else { pl = null; quiz = { domain, taskId: params.task, level: s.level, qs: P.makeSet(domain, s.level, 5), i: 0, correct: 0, times: [], shownAt: Date.now() }; }
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

  // ---------- rewards ----------
  routes.rewards = {
    html: () => {
      const lv = level();
      return `
      <section class="grid-2">
        <div class="card">
          <h2>🏆 Badges <small class="muted">${Object.keys(S.badges).length} / ${D.BADGES.length}</small></h2>
          <div class="badges">${D.BADGES.map((b) => `
            <div class="badge ${S.badges[b.id] ? 'got' : ''}" title="${esc(b.desc)}"><span>${b.emoji}</span><b>${esc(b.name)}</b><small>${S.badges[b.id] ? 'Earned ' + prettyDate(S.badges[b.id]) : esc(b.desc)}</small></div>`).join('')}
          </div>
          <h2>⭐ Level ${lv}: ${levelTitle(lv)}</h2>
          <div class="levels">${D.LEVEL_TITLES.map((t, i) => `<span class="${i + 1 <= lv ? 'on' : ''}">${i + 1}. ${t}</span>`).join('')}</div>
        </div>
        <div class="stack">
          <div class="card">
            <h2>🎁 Prize shop <small class="muted">🪙 ${S.coins} coins</small></h2>
            <p class="muted small">Earn 1 coin for every 10 XP. Ask a parent or teacher to set up real prizes here, then redeem them with your coins.</p>
            <ul class="shop">${S.rewards.map((r) => `
              <li class="${r.redeemed ? 'done' : ''}"><span>${esc(r.name)}</span><b>🪙 ${r.cost}</b>
                ${r.redeemed ? `<small class="ok">Redeemed ${prettyDate(r.redeemed)}</small>` : `<button class="btn small" data-redeem="${r.id}" ${S.coins < r.cost ? 'disabled' : ''}>Redeem</button>`}
                <button class="icon" data-rmreward="${r.id}" title="Remove">✕</button></li>`).join('')}</ul>
            <form id="reward-form" class="row"><input name="name" placeholder="New prize, e.g. New book" required maxlength="60"><input name="cost" type="number" min="10" step="10" value="100" style="width:90px"><button class="btn small">Add</button></form>
          </div>
          <div class="card">
            <h2>🛡️ Integrity tracker <small class="muted">${S.integrity.score}/100</small></h2>
            <div class="bar ${S.integrity.score < 80 ? 'low' : ''}"><div style="width:${S.integrity.score}%"></div></div>
            <p class="muted small">Pathfinder checks your work so progress is real: quizzes are auto-graded and timed, focus timers pause when you leave the tab,
            and reflections are checked for copy-paste, gibberish, and repeats. Honest work raises your score. Below 80, XP is reduced.</p>
            <ul class="log">${S.integrity.log.slice(0, 8).map((l) => `<li><span class="${l.delta < 0 ? 'bad' : 'ok'}">${l.delta > 0 ? '+' : ''}${l.delta}</span> ${esc(l.msg)} <small class="muted">${prettyDate(l.date)}</small></li>`).join('') || '<li class="muted small">No events yet. Keep it clean! ✨</li>'}</ul>
          </div>
          <div class="card">
            <h3>⚙️ Settings</h3>
            <label class="field-inline">Your panda's name <input id="panda-name" maxlength="14" value="${esc(pandaName())}"></label>
            <label class="toggle"><input type="checkbox" id="demo" ${S.settings.demo ? 'checked' : ''}> Demo mode (focus timers run 60× faster, for trying the app)</label>
            <div class="row"><a href="#/profile" class="link">Edit profile</a><button class="link danger" id="reset">Reset all data</button></div>
          </div>
        </div>
      </section>`;
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
      $('#panda-name').addEventListener('change', (e) => { S.settings.pandaName = e.target.value.trim() || 'Bao'; save(); renderNav('rewards'); });
      $('#demo').addEventListener('change', (e) => { S.settings.demo = e.target.checked; save(); });
      $('#reset').addEventListener('click', () => {
        if (!confirm('Erase all Pathfinder data on this device? This cannot be undone.')) return;
        S = blank(); save(); go('#/welcome'); render();
      });
    },
  };


  // ---------- the panda (study buddy) ----------
  const wasActive = (d) => !!(S.activity[d] || S.rest[d]);
  function pandaState() {
    const t = today();
    const start = S.plan ? S.plan.start : t;
    let missed = 0;
    for (let d = addDays(t, -1); d >= start && !wasActive(d); d = addDays(d, -1)) missed++;
    const activeToday = !!S.activity[t];
    const resting = !!S.rest[t] && !activeToday;
    const day = S.plan && S.plan.days[t];
    const comp = day ? dayCompletion(day) : 0;
    let mood;
    if (resting) mood = 'sleepy';
    else if (activeToday) mood = comp >= 0.5 || !day ? 'happy' : 'content';
    else mood = missed === 0 ? 'waiting' : missed === 1 ? 'sleepy' : 'sad';
    const denom = Math.max(1, Math.min(7, daysBetween(start, t) + 1));
    let act = 0;
    for (let i = 0; i < denom; i++) if (wasActive(addDays(t, -i))) act++;
    const value = denom === 1 && !wasActive(t) ? 60 : Math.round((act / denom) * 100);
    let canRest = !activeToday && !S.rest[t];
    for (let i = 1; i <= 6; i++) if (S.rest[addDays(t, -i)]) canRest = false;
    return { mood, missed, resting, value, canRest };
  }

  function pandaSVG(mood, size) {
    const ink = '#1d1b2e';
    const open = (x, dy) => `<circle cx="${x}" cy="${57 + dy}" r="5" fill="#fff"/><circle cx="${x + 1}" cy="${58 + dy}" r="2.6" fill="${ink}"/>`;
    const arcs = (up) => `<path d="${up ? 'M36 58q6-8 12 0M72 58q6-8 12 0' : 'M36 56q6 7 12 0M72 56q6 7 12 0'}" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    const eyes = { happy: arcs(true), sleepy: arcs(false), sad: open(43, 3) + open(77, 3), content: open(43, 0) + open(77, 0), waiting: open(43, 0) + open(77, 0) }[mood];
    const mouth = {
      happy: `<path d="M47 79q13 17 26 0z" fill="#ff6b8e" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`,
      content: `<path d="M50 80q10 8 20 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      waiting: `<path d="M51 81q9 4 18 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      sleepy: `<ellipse cx="60" cy="83" rx="4" ry="3" fill="none" stroke="${ink}" stroke-width="2.5"/>`,
      sad: `<path d="M50 87q10-9 20 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    }[mood];
    const extra = {
      happy: `<circle cx="30" cy="76" r="5.5" fill="#ff8fab" opacity=".5"/><circle cx="90" cy="76" r="5.5" fill="#ff8fab" opacity=".5"/><path d="M106 70l2.2 5.5 5.5 2.2-5.5 2.2-2.2 5.5-2.2-5.5-5.5-2.2 5.5-2.2z" fill="#ffb020"/>`,
      sleepy: `<text x="98" y="30" font-size="17" font-weight="800" fill="#8a7cff" font-family="Nunito,sans-serif">z</text><text x="106" y="16" font-size="12" font-weight="800" fill="#8a7cff" font-family="Nunito,sans-serif">z</text>`,
      sad: `<path d="M33 48l16-6M87 48l-16-6" stroke="${ink}" stroke-width="3" stroke-linecap="round"/><path d="M50 69q-4.5 6 0 9.5q4.5-3.5 0-9.5z" fill="#5bbcff"/>`,
      content: '', waiting: '',
    }[mood];
    const label = { happy: 'happy', content: 'munching bamboo', waiting: 'ready to study', sleepy: 'sleepy', sad: 'missing you' }[mood];
    return `<svg class="panda panda-${mood}" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${esc(pandaName())} the panda is ${label}">
      <circle cx="29" cy="31" r="14" fill="${ink}"/><circle cx="91" cy="31" r="14" fill="${ink}"/>
      <circle cx="60" cy="64" r="42" fill="#fff" stroke="${ink}" stroke-width="3"/>
      <ellipse cx="42" cy="58" rx="10.5" ry="13.5" transform="rotate(-18 42 58)" fill="${ink}"/>
      <ellipse cx="78" cy="58" rx="10.5" ry="13.5" transform="rotate(18 78 58)" fill="${ink}"/>
      ${eyes}<ellipse cx="60" cy="72" rx="6.5" ry="4.5" fill="${ink}"/>${mouth}${extra}</svg>`;
  }

  function pandaMessage(st) {
    const n = pandaName();
    const pick = (arr) => arr[new Date().getDate() % arr.length];
    if (st.mood === 'happy') return pick([`${n} is dancing with joy! Great work today. 🎋`, `${n} loves that you showed up today.`, `Bamboo party! ${n} is so proud of you.`]);
    if (st.mood === 'content') return `${n} is happily munching bamboo. Do a bit more whenever you're ready!`;
    if (st.mood === 'waiting') return S.plan && daysBetween(S.plan.start, today()) === 0 ? `${n} is excited to meet you! Try one small task to say hi.` : `${n} is ready to study with you. Even 10 minutes makes ${n} happy!`;
    if (st.mood === 'sleepy') return st.resting ? `${n} is napping with you today. Rest is part of learning. See you tomorrow! 💤` : `${n} got a little sleepy yesterday. One small task will wake them right up. 💤`;
    return `${n} misses you! No worries, everyone has busy days. One small task and ${n} perks right up. 🎋`;
  }

  function pandaCard(day) {
    const st = pandaState();
    const n = esc(pandaName());
    return `
      <section class="card panda-card mood-${st.mood}">
        <div class="panda-art">${pandaSVG(st.mood, 116)}</div>
        <div class="panda-talk">
          <div class="bubble">${esc(pandaMessage(st))}</div>
          <div class="panda-meta">
            <div class="grow"><small class="muted">${n}'s happiness · ${st.value}%</small><div class="bar ${st.value < 40 ? 'low' : ''}"><div style="width:${st.value}%"></div></div></div>
            <div class="bamboo" title="Bamboo eaten today: one for each task you finish">${day.tasks.map((x) => `<span class="${x.status === 'done' ? 'on' : ''}">🎋</span>`).join('')}</div>
          </div>
          ${st.canRest ? `<button class="link small" id="rest-day">😴 Let ${n} nap today (a rest day, once a week, no worries)</button>` : ''}
        </div>
      </section>`;
  }

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
      box.innerHTML = `<div class="result"><div class="center-art">${pandaSVG('waiting', 90)}</div><h2>That went fast!</h2>
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
        <div class="center-art">${pandaSVG('happy', 100)}</div>
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
        <div class="center-art">${pandaSVG('waiting', 110)}</div>
        <h2 class="center">Let's see where you're starting, ${esc(S.profile.name)}</h2>
        <p>Before ${esc(pandaName())} plans anything, a quick skill check helps us start you in the right place. It's <b>${doms.length} short section${doms.length === 1 ? '' : 's'}</b> (${doms.map((d) => D.DOMAINS[d].name).join(', ')}), about ${doms.length * 2} minutes.</p>
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

  routes.explore = {
    html: () => {
      const { rec, other } = activityLists();
      const c = career();
      return `
      <section class="card">
        <h2>🔭 Try-outs</h2>
        <p class="muted">Small taste-tests of clubs and activities. Each one takes about 15–25 minutes and you can do it right here. There are no grades, they never affect your streak, and “not for me” is a perfectly good answer. Finding out what you <i>don't</i> like is just as useful.</p>
        <h3>${c ? `Good fits for a ${esc(c.title)}` : 'Good fits for your top career matches'}</h3>
        <div class="acts">${rec.map(actCard).join('')}</div>
        <h3>Explore something different</h3>
        <div class="acts">${other.map(actCard).join('')}</div>
      </section>`;
    },
  };

  routes.tryout = {
    html: (id) => {
      const a = D.ACTIVITIES.find((x) => x.id === id);
      if (!a) return `<section class="card narrow"><p>Activity not found.</p><a class="btn" href="#/explore">Back to try-outs</a></section>`;
      return `
      <section class="card narrow">
        <a class="link small" href="#/explore">← All try-outs</a>
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
        out.innerHTML = `<div class="center-art">${pandaSVG(rating >= 3 ? 'happy' : 'content', 90)}</div>
          <h3 class="center">${D.RATINGS.find((r) => r.v === rating).emoji} Thanks for trying it!</h3>
          <p>${msg}</p>
          ${rating >= 3 && !onPath ? `<p class="adapt">This one isn't on your ${c ? esc(c.title) : 'current'} path, but pay attention to what you enjoy. Interests can point to new careers. <a href="#/careers">See if your matches changed →</a></p>` : ''}
          <div class="row center">
            ${rating >= 3 && S.plan && !S.tryouts[a.id].reminded ? `<button class="btn ghost" id="remind">📌 Add a reminder to my schedule</button>` : ''}
            <a class="btn" href="#/explore">Try something else</a></div>`;
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

  window.addEventListener('hashchange', render);
  window.addEventListener('DOMContentLoaded', render);

  // Exposed for automated tests.
  window.PF_APP = { checkReflection: (t, m) => checkReflection(t, m || {}), traitScores, state: () => S };
})();
