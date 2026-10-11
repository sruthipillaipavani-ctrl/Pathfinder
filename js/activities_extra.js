// Extracurricular demos for every career.
// 1) Tags the existing try-out activities with the newer careers.
// 2) Adds new activities (cyber club, game jam, aviation, trades, sports medicine, animal care, communication lab).
// Each activity is a short, do-it-now taster ("demo") plus how to join a real one.
(function () {
  const D = window.PF_DATA;

  const TAG = {
    robotics: ['civil-engineer', 'it-manager', 'pilot'],
    'coding-club': ['it-manager', 'cybersecurity', 'web-developer', 'game-developer'],
    'math-team': ['actuary', 'financial-manager', 'cybersecurity', 'game-developer'],
    'science-olympiad': ['physician-assistant', 'nurse-practitioner', 'veterinarian', 'physical-therapist', 'occupational-therapist', 'civil-engineer'],
    debate: ['marketing-manager', 'health-services-manager'],
    journalism: ['video-producer', 'marketing-manager', 'speech-pathologist'],
    'art-design': ['web-developer', 'video-producer', 'dentist', 'occupational-therapist', 'marketing-manager', 'game-developer'],
    'maker-architecture': ['civil-engineer', 'electrician'],
    'peer-tutoring': ['speech-pathologist', 'occupational-therapist', 'physician-assistant', 'nurse-practitioner'],
    hosa: ['physician-assistant', 'nurse-practitioner', 'dentist', 'physical-therapist', 'occupational-therapist', 'speech-pathologist', 'veterinarian', 'athletic-trainer', 'health-services-manager'],
    'environment-club': ['civil-engineer', 'veterinarian'],
    'business-club': ['marketing-manager', 'financial-manager', 'health-services-manager', 'it-manager'],
    'investment-club': ['financial-manager', 'actuary'],
    'psych-club': ['speech-pathologist', 'occupational-therapist', 'nurse-practitioner'],
    volunteering: ['physician-assistant', 'nurse-practitioner', 'speech-pathologist', 'occupational-therapist', 'physical-therapist', 'veterinarian', 'dentist', 'athletic-trainer', 'health-services-manager'],
    'photo-video': ['video-producer', 'marketing-manager'],
  };
  D.ACTIVITIES.forEach((a) => {
    (TAG[a.id] || []).forEach((id) => { if (!a.careers.includes(id)) a.careers.push(id); });
  });

  const NEW = [
    { id: 'cyber-club', name: 'Cybersecurity Club (CyberPatriot, picoCTF)', emoji: '🛡️', minutes: 20,
      careers: ['cybersecurity', 'it-manager', 'software-engineer', 'web-developer'],
      blurb: 'Learn how hackers think so you can defend against them: ciphers, passwords, scams, and capture-the-flag puzzles.',
      commit: 'About 2–3 hours a week during the season; picoCTF is online and free.',
      join: 'Ask your computer science teacher about CyberPatriot. picoCTF (from Carnegie Mellon) is free for students and you can play on your own.',
      steps: [
        { t: 'Decode this secret message. Each letter was moved 3 places forward in the alphabet, so shift each letter back 3: "FRGH LV IXQ". Write the decoded message.', w: true, reveal: 'Answer: CODE IS FUN. This is a Caesar cipher, one of the oldest codes. Modern encryption is far stronger, but the idea (a rule that scrambles a message) is the same.' },
        { t: 'Which password is harder to crack, and why? A) sunshine B) Tree-Bike-Lamp-9-Pear', w: true, reveal: 'B. Longer passwords that mix several random words, numbers, and symbols have far more combinations. A passphrase of 4 random words is a great trick.' },
        { t: 'You get a message: "URGENT! Your account will be closed. Click here to verify your password: http://secure-login-g00gle.com". List three warning signs that it is a scam.', w: true, reveal: 'Pressure and urgency, a strange link (g00gle with zeros), and a request for your password. Real companies do not ask for your password by link.' },
      ] },
    { id: 'game-jam', name: 'Game Design Club / Game Jam', emoji: '🎮', minutes: 25,
      careers: ['game-developer', 'software-engineer', 'web-developer', 'video-producer', 'graphic-designer'],
      blurb: 'Design, build, and playtest games with a team, sometimes in a single weekend.',
      commit: 'About 1–2 hours a week; game jams are usually a weekend, many are online.',
      join: 'Ask a computer science or art teacher about a game club. Look up the Global Game Jam and itch.io jams for beginners; Scratch, Roblox Studio, and Godot are free tools.',
      steps: [
        { t: 'Design a tiny game on paper that uses only a die and a pencil. Write the goal, three rules, and how a player loses.', w: true },
        { t: 'Playtest it with someone (or play it twice yourself). What was confusing or not fun? Change one rule and write what you changed.', w: true, reveal: 'Game designers call this iteration: play, notice, change, repeat. Almost no great game worked on the first try.' },
        { t: 'Give your game a name and write one sentence that would make a stranger want to play it.', w: true },
      ] },
    { id: 'aviation-club', name: 'Aviation / Drone Club / Civil Air Patrol', emoji: '✈️', minutes: 20,
      careers: ['pilot', 'mech-engineer', 'civil-engineer'],
      blurb: 'Learn how aircraft fly, try simulators and drones, and meet people who fly for a living.',
      commit: 'About 2–4 hours a week; Civil Air Patrol meets weekly.',
      join: 'Search for a local Civil Air Patrol cadet squadron (ages 12+), an EAA Young Eagles flight, or a school drone or robotics club.',
      steps: [
        { t: 'Fold a paper airplane and fly it 3 times. Change just ONE thing (wing size or nose weight) and fly it 3 more times. Which version flew farther?', w: true, reveal: 'Changing one thing at a time is how engineers learn what really matters.' },
        { t: 'Write a 5-step pre-flight checklist for something you do, like riding a bike or leaving for school. Pilots use checklists on every flight.', w: true, reveal: 'Checklists save lives in aviation and in hospitals. Even the most experienced pilots use them every time.' },
        { t: 'Planes usually take off and land facing into the wind. Why do you think that helps? Write your guess.', w: true, reveal: 'Wind flowing over the wings adds airflow, so the plane gets lift at a slower ground speed and needs less runway.' },
      ] },
    { id: 'skilled-trades', name: 'Skilled Trades / SkillsUSA', emoji: '🔧', minutes: 20,
      careers: ['electrician', 'civil-engineer', 'mech-engineer', 'architect'],
      blurb: 'Learn hands-on trades like electrical work, welding, and construction, and compete in skills contests.',
      commit: 'Often part of a shop or career-and-technical-education class; SkillsUSA competitions are yearly.',
      join: 'Ask your counselor about career and technical education (CTE) classes and SkillsUSA, or visit a local union apprenticeship open house.',
      steps: [
        { t: 'Circuits: if one bulb breaks in a series circuit, what happens to the others? What about in a parallel circuit? Write both.', w: true, reveal: 'In a series circuit one break turns every bulb off. In parallel, each bulb has its own path, so the others stay on. Homes are mostly wired in parallel.' },
        { t: 'Safety first: name three safety rules you would follow before using a power tool or working near electricity.', w: true, reveal: 'Common answers: wear eye protection, turn the power off, check the tool, keep your area clear, and ask for help if you are not trained. Professionals make safety a habit.' },
        { t: 'Measure a desk or table. Write its length and width and calculate its area. Then estimate how many would fit on your bedroom floor.', w: true },
      ] },
    { id: 'sports-med', name: 'Sports Medicine Club / Student Athletic Trainer', emoji: '🏅', minutes: 20,
      careers: ['athletic-trainer', 'physical-therapist', 'occupational-therapist', 'physician-assistant', 'nurse-practitioner'],
      blurb: 'Help athletes stay healthy: first aid, injury prevention, and recovery.',
      commit: 'About 2–4 hours a week, often at practices and games.',
      join: 'Ask your school athletic trainer or coach about student trainer or team manager roles, and check for a HOSA sports medicine event.',
      steps: [
        { t: 'Take your pulse for 15 seconds and multiply by 4. Then do 30 jumping jacks and take it again. Write both numbers.', w: true, reveal: 'Your heart rate rises with exercise to deliver more oxygen. Athletic trainers watch how quickly it returns to normal to judge fitness and recovery.' },
        { t: 'A teammate rolls an ankle. Write the steps of R.I.C.E. and what each letter means.', w: true, reveal: 'Rest, Ice, Compression, Elevation. It is first aid for minor sprains; serious injuries need a medical professional.' },
        { t: 'Design a 3-exercise warm-up for a sport you like. Why does warming up help prevent injuries?', w: true },
      ] },
    { id: 'animal-care', name: '4-H / FFA / Vet Science Club', emoji: '🐾', minutes: 20,
      careers: ['veterinarian', 'env-scientist'],
      blurb: 'Learn to care for animals, from pets and farm animals to wildlife.',
      commit: 'About 1–3 hours a week; animal projects have regular care routines.',
      join: 'Ask about FFA at your school, find a local 4-H club, or volunteer at an animal shelter or wildlife rehabilitation center.',
      steps: [
        { t: 'Watch an animal (a pet, a bird, a squirrel) for 5 minutes. List 5 behaviors you notice and what you think each one means.', w: true },
        { t: 'Write a daily care plan for a pet: food, water, exercise, and health checks.', w: true, reveal: 'Veterinarians teach owners plans like this every day. Preventive care keeps animals healthy and saves money.' },
        { t: 'Look up the normal resting heart rate or temperature of one animal. Why might a vet need to know these numbers?', w: true },
      ] },
    { id: 'communication-lab', name: 'Speech & Communication Club', emoji: '🗣️', minutes: 15,
      careers: ['speech-pathologist', 'teacher', 'psychologist', 'occupational-therapist'],
      blurb: 'Explore how people communicate: sounds, stories, listening, and getting your point across clearly.',
      commit: 'About 1 hour a week.',
      join: 'Ask your English or speech teacher about a speech, drama, or American Sign Language club. Many libraries run public speaking groups for teens too.',
      steps: [
        { t: 'Say each tongue twister slowly three times, then fast: "red leather, yellow leather" and "she sells seashells". Which sounds were hardest for you?', w: true, reveal: 'Speech-language pathologists study exactly how the tongue, lips, and mouth make sounds, and help people practice the tricky ones.' },
        { t: 'Tell someone a 30-second story about your weekend without moving your hands. Tell it again with gestures and expression. What changed?', w: true },
        { t: 'Explain how to tie a shoe using only words. Have someone try to follow your instructions. Where did your instructions fall short?', w: true, reveal: 'Clear language is a skill. Teachers and therapists constantly look for new ways to say things so people understand.' },
      ] },
  ];
  NEW.forEach((a) => { if (!D.ACTIVITIES.some((x) => x.id === a.id)) D.ACTIVITIES.push(a); });
})();
