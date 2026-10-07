# Pathfinder

Pathfinder helps middle and high school students (grades 6–12) discover careers that fit them, then turns that into a real, level-appropriate plan they can follow a little each day.

## The flow

1. **Quick start (about 2 minutes, no account).** One question per screen: name → grade → tap what you love → favorite subjects → 12 one-tap personality questions.
2. **Results.** A personality result (e.g. *Thinker–Organizer*) and your #1 career match with real pay, job growth, and education, plus two runners-up.
3. **Explore.** Search and filter **34 careers** (health, tech, business, engineering & trades, creative, science, people) with a detail page for each. A second tab offers **try-outs**: short, optional tasters of 17 extracurriculars (robotics, debate, coding club, HOSA, DECA…).
4. **Skill check.** Before any task exists, a short, ungraded, adaptive check sets the student's starting level in each subject ("I'm not sure" is allowed).
5. **Today.** One highlighted next step at a time. Each day is a theme subject: a short **lesson** at the student's level + 3-question check → the **practice set** (unlocked after the lesson) → a short reflection.
6. **Path.** A grade-by-grade roadmap (classes, clubs, competitions and olympiads) and an editable daily schedule that adapts to how the student is doing.
7. **Practice and Code Lab.** Auto-graded practice in 10 subjects at 5 levels. For tech, finance, engineering, and environmental careers, **real Python exercises** run in the browser (Pyodide in a Web Worker) against visible and hidden tests, with hints, a worked solution after 3 failed tries, a 6-second loop timeout, and paste detection.
8. **Me.** XP, levels, streaks, 16 badges, a prize shop parents or teachers can stock, and an integrity score that keeps progress honest (timed quizzes, focus timers that pause off-tab, reflection checks).

## Career data

Pay, job growth, and education come from the U.S. Bureau of Labor Statistics Occupational Outlook Handbook (median annual pay, May 2025; projected employment growth 2025–2035). Rankings shown as "U.S. News #N" are from U.S. News & World Report's 2026 Best Jobs, for the ranks that could be confirmed. "% match" is Pathfinder's own estimate from the student's answers.

## Run it on your laptop

No install needed. It's plain HTML, CSS, and JavaScript.

**Option A:** double-click `start.command` in Finder. It starts a local server and opens http://localhost:8000.

**Option B:** in Terminal

```bash
cd ~/Documents/GitHub/Pathfinder
python3 -m http.server 8000
```

Then open http://localhost:8000.

Tip: in *Me → Settings*, turn on **Demo mode** to make focus timers run 60× faster while trying things out.

## Notes

- Progress is saved in the browser on this device (`localStorage`); there are no accounts yet. *Me → Settings → Reset all data* starts over.
- Python in the Code Lab loads from a CDN the first time (about 10 MB), so it needs internet once.
- The page loads fresh scripts on every visit for easy development (see `index.html`); remove that loader when hosting for production.
- Hosting later: it is a static site, so GitHub Pages, Netlify, or Vercel work as-is. Accounts, syncing across devices, and parent/teacher dashboards would need a backend.

## Project structure

```
index.html           page shell
css/styles.css       design system (light + dark, phone tab bar)
js/data.js           original careers, personality questions, subjects, badges, question banks
js/careers_extra.js  20 more careers + BLS pay/growth/education for all, interest tiles
js/practice.js       adaptive question generator + placement helpers
js/lessons.js        mini-lessons (10 subjects × 3 levels)
js/exercises.js      30 Python exercises with visible + hidden tests
js/pyworker.js       runs student Python in a Web Worker (Pyodide)
js/app.js            app logic and screens
start.command        double-click launcher for macOS
```
