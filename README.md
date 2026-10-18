# Pathfinder

Pathfinder helps middle and high school students (grades 6–12) explore what they enjoy, try meaningful after-school activities, and build experience they can document for future applications and resumes.

## The flow

1. **Quick start (about 3 minutes, no account).** Starts at *What should I call you?*, then grade, interests, and favorite subjects, then the 15 scenario questions (each with six choices mapped privately to one of six thinking dimensions; choices are shuffled once per attempt and stay in the same order while navigating). Back/Next saves answers, Next requires a choice, and refreshing resumes where the student left off. This is an exploratory tool, not a psychological diagnosis. Returning students can retake the quiz without losing their portfolio or progress.
2. **Results.** Scores normalize each of the six thinking dimensions across 15 questions (15 opportunities per dimension). The highest-scoring career is recommended using those dimension scores plus interests, subjects, goals, and tried activities. The ranking is deterministic; students can compare other matches before choosing.
3. **Explore.** Search and filter **34 careers** (health, tech, business, engineering & trades, creative, science, people) with a detail page for each. A second tab offers short tasters of 17 after-school activities (robotics, debate, coding club, HOSA, DECA…) to help students discover what they want to pursue.
4. **Skill check.** Before any task exists, a short, ungraded, adaptive check sets the student's starting level in each subject ("I'm not sure" is allowed).
5. **Today.** One highlighted next step at a time. Each day is a theme subject: a short **lesson** at the student's level + 3-question check → the **practice set** (unlocked after the lesson) → a short reflection.
6. **Path.** A grade-by-grade roadmap (classes, clubs, competitions and olympiads) and an editable daily schedule that adapts to how the student is doing.
7. **Practice and Code Lab.** Auto-graded practice in 10 subjects at 5 levels. For tech, finance, engineering, and environmental careers, **real Python exercises** run in the browser (Pyodide in a Web Worker) against visible and hidden tests, with hints, a worked solution after 3 failed tries, a 6-second loop timeout, and paste detection.
8. **Portfolio.** Students record projects, clubs, competitions, volunteering, work, courses, skills, and what they learned. Completed roadmap milestones appear automatically. A downloadable resume draft summarizes their interests and documented experience; explored tasters are kept separate from resume credentials.
9. **Me.** XP, levels, streaks, 16 badges, a prize shop parents or teachers can stock, and an integrity score that keeps progress honest (timed quizzes, focus timers that pause off-tab, reflection checks). Personality assessments can be retaken from the results or Me page without erasing progress.
10. **Daily encouragement.** The welcome page and student dashboard show a short original quote that changes daily.
11. **Meet the founders.** Read why co-founders Sruthi and Pahal started Pathfinder; the page is available before taking the assessment.

## How difficulty adapts

Everything a student does feeds a small, tested engine (`js/adapt.js`) so the app gets harder as they improve and gentler when they struggle:

- **Level (per subject)** moves up after two strong sets (80%+) in a row, or one perfect set, and moves down after two weak sets (under 50%) or one very low set (20% or less). One lucky or unlucky set never swings it. Sets answered too fast to be real work are ignored.
- **Pace** comes from the last few sets. *Stepping it up*: longer sets with harder questions mixed in, a bonus stretch task, and a more advanced lesson. *Taking it slower*: shorter sets, easier warm-ups, shorter days, and an easier lesson. Students can also choose Automatic, A bit slower, or A bit faster in *Me → Settings*.
- **Python exercises** aim a level higher after clean solves and a level lower after a struggle (worked solution viewed).
- **Activity demos** end with an optional challenge round, matched to the student's level in the related subject (for example the math team demo uses math). It counts toward the same level and pace.
- The app always says why: results screens, the Today page, lessons, and Practice explain what changed and what is needed to level up.

## Career data

Pay, job growth, and education come from the U.S. Bureau of Labor Statistics Occupational Outlook Handbook (median annual pay, May 2025; projected employment growth 2025–2035). Rankings shown as "U.S. News #N" are from U.S. News & World Report's 2026 Best Jobs, for the ranks that could be confirmed. "% match" is Pathfinder's own estimate from the student's answers.

Every career detail page also lists the **extracurriculars** that fit it (24 activities in `js/activities_extra.js` and `js/data.js`, each with a 15–25 minute do-it-now demo and how to join a real one), then **example programs** grouped as reach, target, and safety/likely starting points. Those are not applicant-specific admission predictions; grades, course rigor, residency, cost, and application year all matter. Trades and apprenticeships are shown where a four-year degree is not required.

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

## Hosting (Vercel)

It is a static site with no build step. In Vercel: **Add New → Project → Import** the GitHub repo, keep **Framework Preset: Other**, leave Build Command and Output Directory empty, and deploy. Every push to `main` then redeploys automatically. `vercel.json` adds basic security headers.

## Notes

- To start over on a device, open `http://localhost:8000/?reset` (or use *Me → Settings → Reset all data*).

- Progress is saved in the browser on this device (`localStorage`); there are no accounts yet. *Me → Settings → Reset all data* starts over.
- Python in the Code Lab loads from a CDN the first time (about 10 MB), so it needs internet once.
- The page loads fresh scripts on every visit for easy development (see `index.html`); remove that loader when hosting for production.
- Hosting later: it is a static site, so GitHub Pages, Netlify, or Vercel work as-is. Accounts, syncing across devices, and parent/teacher dashboards would need a backend.

## Automated checks

`sh tests/run.sh` (macOS, no installs) checks every script's syntax, validates the Python exercises (every reference solution passes, no starter code does), and renders **every screen in every state** (all careers, demos, exercises, and difficulty settings) headlessly. `jsc tests/matching.js` simulates 2,000 students to check that career match scores are spread sensibly.

## Project structure

```
index.html           page shell
css/styles.css       design system (light + dark, phone tab bar)
js/data.js           original careers, personality questions, subjects, badges, question banks
js/careers_extra.js  20 more careers + BLS pay/growth/education for all, interest tiles
js/adapt.js          level, pace, and difficulty rules (pure functions)
js/practice.js       adaptive question generator + placement helpers
js/lessons.js        mini-lessons (10 subjects × 3 levels)
js/exercises.js      30 Python exercises with visible + hidden tests
js/pyworker.js       runs student Python in a Web Worker (Pyodide)
js/app.js            app logic and screens
start.command        double-click launcher for macOS
tests/               automated checks (see above)
```
