# Pathfinder

Pathfinder helps middle and high school students (grades 6–12) discover a career that fits who they are, then turns it into a real plan they can follow day by day.

1. **About me**: grade, hobbies, interests, favorite subjects, future goals, and daily time available.
2. **Personality test**: 18 quick questions scored across six traits (Builder, Thinker, Creator, Helper, Leader, Organizer).
3. **Career matches**: 14 careers ranked by personality fit, hobbies and interests, favorite subjects, and goals, with the reasons shown.
4. **My Path**
   - **Grade-by-grade roadmap** from middle school through 12th grade: courses, clubs, projects, and the competitions and olympiads to aim for (e.g. Data Scientist → MATHCOUNTS, AMC 8/10/12, AIME, USACO, AP Statistics…).
   - **Daily schedule** with a practice quiz, a focus session, and a reflection each day, plus a weekly real-world milestone. Students can edit, add, or remove tasks.
5. **Adaptive practice**: 5-question sets in 10 subjects at 5 difficulty levels. Score 80%+ to level up; under 40% eases back. Math, statistics, and logic questions are freshly generated every time.
6. **Adapts day by day**: daily load grows as the student builds stamina, gets lighter after missed days, and adds stretch challenges when they're excelling.
7. **Integrity tracker**: keeps progress honest.
   - Quizzes are auto-graded and timed; answering too fast doesn't count.
   - Focus timers only run while the tab is open and in front; distractions are counted.
   - Reflections are rejected if pasted, repeated, gibberish, or copied from earlier ones.
   - Milestones are self-reported and can be confirmed by a parent or teacher for bonus XP.
8. **Rewards**: XP, levels, 15 badges, streaks, confetti, and a **prize shop** where parents/teachers set real prizes that students redeem with earned coins.

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
js/practice.js    adaptive question generator
js/app.js         app logic: routing, matching, schedule, integrity tracker, rewards
start.command     double-click launcher for macOS
```
