# Pathfinder

Pathfinder helps middle and high school students (grades 6–12) discover a career that fits who they are, then turns it into a real plan they can follow day by day.

1. **About me**: grade, hobbies, interests, favorite subjects, future goals, and daily time available. The favorite-subject choices change with the grade (middle school, grades 9–10, grades 11–12).
2. **Personality test**: 18 quick questions scored across six traits (Builder, Thinker, Creator, Helper, Leader, Organizer).
3. **Career matches**: 14 careers ranked by personality fit, hobbies and interests, favorite subjects, and goals, with the reasons shown.
4. **Skill check (before any task is assigned)**: a short, ungraded, adaptive check of each subject on the chosen career (4 questions each; questions get easier or harder with the answers; “I'm not sure” is always allowed). It sets the starting level. No schedule is built until it's done (or the student chooses to skip).
5. **Learn first, then practice.** Nothing is assigned cold. Each day has one theme subject:
   - 📖 a short **lesson** at the student's level (explanation, worked example, key points) followed by a **3-question check**. Fail it and the lesson is shown again; after two tries, an easier lesson is offered.
   - 📝 the **practice set** (or a 🐍 **Python exercise**) stays 🔒 locked until the lesson is done.
   - 💭 a short reflection.
6. **My Path**
   - **Grade-by-grade roadmap** from middle school through 12th grade: courses, clubs, projects, and the competitions and olympiads to aim for (e.g. Data Scientist → MATHCOUNTS, AMC 8/10/12, AIME, USACO, AP Statistics…).
   - **Daily schedule** with a practice quiz, a focus session, and a reflection each day, plus a weekly real-world milestone. Students can edit, add, or remove tasks.
7. **Adaptive practice**: starts at the level found by the skill check (Beginner → Competition-ready). After that, 5-question sets match their level: score 80%+ to level up; under 40% eases back. Daily practice leans toward their weakest subject. Math, statistics, and logic questions are freshly generated every time.
8. **Adapts day by day**: daily load grows as the student builds stamina, gets lighter after missed days, and adds stretch challenges when they're excelling.
9. **Code Lab (real Python, checked by running it)**: Data Scientist, Software Engineer, Financial Analyst, Mechanical Engineer, and Environmental Scientist paths include Python exercises set in their job (e.g. a data scientist computes medians and modes; an engineer converts units and computes force). The student writes code in the browser; the app runs it with Python (Pyodide, in a Web Worker), shows exactly which tests passed or failed and why, and also runs **hidden tests** so answers can't be hard-coded. Hints cost a little XP, a worked solution is available after 3 failed runs, infinite loops are stopped after 6 seconds, pasted solutions are flagged, and the student's Python level moves up with clean solves. (30 exercises; the first run needs internet to download Python, about 10 MB, then it's cached.)
10. **Integrity tracker**: keeps progress honest.
   - Quizzes are auto-graded and timed; answering too fast doesn't count.
   - Focus timers only run while the tab is open and in front; distractions are counted.
   - Reflections are rejected if pasted, repeated, gibberish, or copied from earlier ones.
   - Milestones are self-reported and can be confirmed by a parent or teacher for bonus XP.
11. **Try-outs** (optional, never affect streaks or integrity): 17 short tasters of extracurriculars (robotics, coding club, math team, debate, Mock Trial/Model UN, journalism, HOSA, DECA/FBLA, volunteering and more). Students rate each one (Loved it → Not for me), see how to join a real club, and can add a reminder to their schedule. Activities they enjoy nudge matching careers up.
12. **Bao the panda** 🐼: the study buddy and logo. Bao's mood follows the student's daily habits (happy → munching bamboo → ready to study → sleepy → missing you) and never scolds. One rest day per week keeps Bao happy without pressure. Students can rename Bao in *Rewards → Settings*.
13. **Rewards**: XP, levels, 16 badges, streaks, confetti, and a **prize shop** where parents/teachers set real prizes that students redeem with earned coins.

## Run it on your laptop

No install needed. It's plain HTML, CSS, and JavaScript.

**Option A: double-click** `start.command` in Finder. It starts a local server and opens http://localhost:8000.
(The first time, macOS may ask you to confirm: right-click → Open.)

**Option B: Terminal**

```bash
cd ~/Documents/GitHub/Pathfinder
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

**Tip:** Turn on **Demo mode** in *Rewards → Settings* to make focus timers run 60× faster while trying things out.

## Notes

- Progress is saved in the browser on this device (`localStorage`). There is no account or server yet. *Rewards → Reset all data* starts over.
- Hosting later: the site is static, so it can go on GitHub Pages, Netlify, or Vercel as-is. Accounts, syncing across devices, and parent/teacher dashboards would need a backend.

## Project structure

```
index.html        page shell
css/styles.css    all styles (light + dark mode, mobile friendly)
js/data.js        careers, roadmaps, competitions, personality test, question banks, badges
js/practice.js    adaptive question generator + placement helpers
js/lessons.js     mini-lessons (10 subjects × 3 levels)
js/exercises.js   30 Python exercises with visible + hidden tests
js/pyworker.js    runs student Python in a Web Worker (Pyodide)
js/app.js         app logic: routing, matching, schedule, integrity tracker, rewards
start.command     double-click launcher for macOS
```
