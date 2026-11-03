# Times Table Rocket — Specification

**Status:** Approved (decisions delegated to Claude's recommendations, 2026-11-02)
**Working title:** Times Table Rocket (easy to rename — title lives in one constant)

---

## 1. Purpose

A space-adventure web game that helps an 8-year-old **memorize** the single-digit
multiplication facts (1×1 through 9×9) to the point of instant recall.

**Success looks like:**
- He *wants* to play ~10 minutes a day (the adventure pulls him back).
- Over a few weeks, all 45 facts reach "Mastered" — answered correctly in ≤ 4 seconds on
  at least two different days.
- A parent can see, at a glance, which facts are solid and which are shaky.

### 1.1 What we know about the player
- Age 8, reads fine, understands what multiplication means.
- Already solid on ×1, ×2, ×5; slow or guessing on ×3, ×4, ×6, ×7, ×8, ×9.
- Plays on **both an iPad/tablet (touch) and a computer (keyboard)**, mostly one device.
- Motivated by **adventure / story**. Chosen theme: **Space explorer**.

### 1.2 Decisions (and why)
| Decision | Choice | Why |
|---|---|---|
| Platform | Responsive web app (touch + keyboard), installable as a PWA | Works on tablet and computer with one codebase; free static hosting |
| Tech | Vite + React + TypeScript; CSS/SVG animation | Fast to build; the learning engine stays pure TS and easy to test |
| Timer | **Invisible.** Speed is measured, never displayed as a countdown | Rewards recall without anxiety; slow ≠ wrong |
| Saving | Local to the device (`localStorage`), with export/import backup file | No accounts, no server, no cost |
| Session | ~10 minutes/day = one Daily Mission | Short daily spaced practice beats long sessions |
| Parent view | Simple progress grid + stats, behind a parent gate | Visibility without complexity |
| Facts | 45 unique facts (a×b = b×a treated as one fact) | Halves the memorization load; asked in both orders |

### 1.3 Out of scope (v1)
- Multiple child profiles, accounts, cross-device sync, servers.
- ×10, ×11, ×12, division, two-digit facts.
- Parent settings (daily goal, table focus) — parent view is read-only plus backup/reset.
- Leaderboards, multiplayer, ads, in-app purchases, analytics/telemetry.
- Text-to-speech.

---

## 2. Game Design

### 2.1 Identity
On first launch the player types his name and becomes **Captain {name}**. Used in greetings
("Ready for launch, Captain Leo?"). Name is 1–16 characters, trimmed.

### 2.2 The 45 facts and the 9 planets
A **fact** is an unordered pair `{a, b}` with `1 ≤ a ≤ b ≤ 9`, identified as `"axb"` with the
smaller number first (e.g. `"3x7"`). There are exactly 45.

**Planet order (table order):** ×1, ×2, ×5, ×3, ×4, ×9, ×6, ×7, ×8.

A fact belongs to the planet of whichever of its two factors comes **first** in table order.
This gives each planet only the facts that are *new* when he arrives:

| # | Planet | Table | Facts | Count |
|---|---|---|---|---|
| 1 | Launch Pad | ×1 | 1×1 … 1×9 | 9 |
| 2 | Twinara | ×2 | 2×2 … 2×9 | 8 |
| 3 | Pentaro | ×5 | 3×5, 4×5, 5×5, 5×6, 5×7, 5×8, 5×9 | 7 |
| 4 | Trion | ×3 | 3×3, 3×4, 3×6, 3×7, 3×8, 3×9 | 6 |
| 5 | Quadrix | ×4 | 4×4, 4×6, 4×7, 4×8, 4×9 | 5 |
| 6 | Nonova | ×9 | 6×9, 7×9, 8×9, 9×9 | 4 |
| 7 | Hexion | ×6 | 6×6, 6×7, 6×8 | 3 |
| 8 | Septura | ×7 | 7×7, 7×8 | 2 |
| 9 | Octavia | ×8 | 8×8 | 1 |

Total = 45. Later planets are small but hold the hardest facts.

When a fact is asked, the factor order is chosen at random (`3 × 7` or `7 × 3`).

### 2.3 First launch: Systems Check (placement)
After entering his name, he runs a **Systems Check**: each of the 24 facts on planets 1–3
(×1, ×2, ×5) is asked once in shuffled order, framed as "checking the rocket's systems."
No wrong-answer teaching screen here — just a gentle "logged!" and move on.

Result per fact:
- **Fast correct (≤ 4 s):** level 4, `fastDays = [today]`, `lastPromotedDay = today`
  (mastery on the next fast answer on a later day).
- **Slow correct:** level 2.
- **Wrong:** level 1.

`dueDay` is set from the level's interval (§3.1) and stats are recorded as for any answer.
Placement uses this mapping instead of the normal `applyAnswer` rules (§3.2). The Systems
Check does not count as the day's mission.

Planets 1–3 are then evaluated for unlocks normally (§2.8), so a confident player starts on
Trion (×3) on day one.

### 2.4 The Galaxy Map (home screen)
- A winding path of 9 planets on a starfield. Each planet has a distinct color/shape.
- States: **locked** (dark silhouette with padlock), **open** (lit), **current frontier**
  (glowing, the rocket parked beside it), **boss waiting** (asteroid icon orbiting), **freed**
  (flag planted).
- Big **Launch Mission** button (or **Free Flight** if today's mission is done).
- Corner buttons: **Star Map**, **Hangar**, **Sound on/off**, and a small, unobtrusive
  **Grown-ups** button.
- Streak flame with the current day count ("Captain's Log: 4 days").

### 2.5 The Daily Mission (~10 minutes)
A mission is a fixed sequence of steps:

1. **Engine Warm-up** — 5 questions, review facts only (no new facts).
2. **Quest 1** — ~15 questions.
3. **Quest 2** — ~15 questions.
4. **Quest 3** — ~15 questions.
5. **Boss Battle** — only if a boss is available (§2.7); at most one boss per mission.
6. **Mission Complete** — summary screen.

At ~6–8 s per question including feedback, this lands near 10 minutes.

- During quests, each correct answer pumps fuel into a **fuel gauge**; a full gauge at the end
  of a quest triggers a short rocket-launch animation to the next quest.
- Progress is saved after **every answer**. If he leaves mid-mission and returns the **same
  local day**, the mission resumes at the start of the step he was on. On a new day, a fresh
  mission is generated.
- **One mission per day counts.** After today's mission is complete, the map offers
  **Free Flight**: unlimited quests that review introduced facts but **never introduce new
  facts** (protects the spacing schedule). Free Flight answers still update fact levels.

### 2.6 Answering a question
- Question shown large: `7 × 8 = ?`
- **Input:** on-screen number pad (0–9, ⌫, big **GO**), always visible. On a keyboard,
  digits type, `Backspace` deletes, `Enter` submits. Max 2 digits. GO is disabled when empty.
- **Correct & fast (≤ 4 s):** chime + "⚡ Lightning!" burst + fuel added.
- **Correct & slow (> 4 s):** chime + fuel added (no lightning). Never framed as a failure.
- **Wrong:** soft "sputter" sound, rocket wobbles. Then the **Repair screen**:
  - Shows `7 × 8 = 56` with a **dot grid** (7 rows × 8 columns, grouped visually).
  - Shows the planet's **tip** (§2.6.1).
  - He must **type the correct answer once** to continue ("lock it in"). This retype is not
    an attempt and does not affect the fact's level.
  - The fact is re-inserted 3–5 questions later in the same quest.
- No lives, no game over, ever.

#### 2.6.1 Tips by planet table
| Table | Tip |
|---|---|
| ×1 | "Anything times 1 stays the same!" |
| ×2 | "Times 2 means double it!" |
| ×5 | "Count by 5s — like the minutes on a clock!" |
| ×3 | "Double it, then add one more group." |
| ×4 | "Double it, then double again!" |
| ×9 | "The tens digit is one less, and the digits add up to 9!" |
| ×6 | "Do ×5, then add one more group." |
| ×7 | "Use one you know: 7×7 = 7×5 + 7×2." (example generated from the actual fact) |
| ×8 | "Double, double, double!" |

The ×7 tip is generated from the fact (e.g. for 7×8: "7×8 = 7×5 + 7×3 = 35 + 21").

#### 2.6.2 Introducing a new fact
The first time a level-0 fact appears, it is shown as a **"New Discovery!"** card: the full
fact with its answer, dot grid, and tip. Then the question is asked. That first answer moves
the fact to level 1 regardless of speed/correctness (it was just shown). The fact is
re-asked once more later in the same quest (≥ 3 positions later).

### 2.7 Boss Battles
- A planet's **boss becomes available** when every fact on that planet is at level ≥ 1
  (all introduced) and the boss hasn't been beaten.
- Boss: a giant asteroid with a **12-segment shield**. Each correct answer fires a laser and
  removes one segment. Each wrong answer regenerates one segment (max 12) and shows the
  normal Repair screen.
- Questions: ~60% from the boss's planet, ~40% review from earlier planets.
- **Win:** shield reaches 0 → explosion, planet **freed**, rewards granted (§2.9).
- **Retreat:** if not won within 20 questions, the asteroid "flies off to recharge" with an
  encouraging message; it returns in a future mission. No penalty.
- No visible timer (consistent with §1.2).
- If several bosses are available, the one on the earliest planet comes first.

### 2.8 Planet unlocking
The next planet in order **opens** when every fact on the current frontier planet is at
**level ≥ 2**. Unlocking is checked after every answer and shown with a celebration on
returning to the map ("New planet detected: Quadrix!").

New facts are always drawn from the **earliest open planet that still has level-0 facts**.

### 2.9 Rewards
- **Ship parts:** each freed planet grants one part, in this fixed order: Racing Fins, Nose
  Cone, Twin Boosters, Wings, Flame Trail, Antenna, Stripes, Bubble Cockpit, Golden Paint.
- **Alien crew:** each freed planet grants its native alien (9 simple SVG characters, e.g.
  "Zib from Trion"). Shown in the Hangar.
- **Hangar screen:** the rocket drawn with all earned parts, plus the crew lineup.
  Unearned slots shown as silhouettes ("Free Quadrix to unlock").

### 2.10 Star Map (kid-facing progress)
- 45 stars arranged as a **rocket constellation**, one star per fact.
- Mastered (level 5) → bright, glowing star. Previously mastered but dropped → dim star
  with a gentle pulse, labeled "needs a tune-up". Others → faint dots.
- Tap a star to see its fact (`3 × 7 = 21`) and its state in kid words.
- Counter: "★ 18 / 45 stars lit". All 45 lit → full-screen celebration + "Galaxy Master"
  title on the map.

### 2.11 Streak (Captain's Log)
- A day counts when that day's mission is **completed**.
- `current` streak increments if the previous counted day was yesterday (local); otherwise
  resets to 1. `best` streak is kept.
- Shown on the map and Mission Complete screen.

### 2.12 Mission Complete screen
Shows: questions answered, ⚡ lightning count, new stars lit today, any planet freed /
unlocked, streak flame with today lit. Buttons: **Back to Galaxy**, **Free Flight**.

### 2.13 Sound
- Short synthesized sound effects via the Web Audio API (no audio asset files): correct
  chime, lightning zap, wrong sputter, laser, explosion, launch whoosh, celebration.
- Audio context starts on the first user tap (iOS requirement).
- One mute toggle on the map; persisted. No background music in v1.

---

## 3. Memory Engine

Pure TypeScript, no DOM/React. All time-dependent functions take `today` (local date string
`YYYY-MM-DD`) and all randomness takes an injected RNG, so behavior is deterministic in tests.

### 3.1 Levels
| Level | Meaning | Due again after |
|---|---|---|
| 0 | New — never introduced | n/a (selected as "new") |
| 1 | Just learned or recently missed | 0 days (due same day) |
| 2 | Getting there | 1 day |
| 3 | Pretty solid | 2 days |
| 4 | Strong | 4 days |
| 5 | **Mastered ★** | 7 days |

A fact is **due** when `level ≥ 1` and `dueDay ≤ today`.

### 3.2 Applying an answer
Constants: `FAST_MS = 4000`.

Given a fact record, the answer (`correct`, `responseMs`), and `today`:
1. Update stats: `attempts++`, `lastSeenDay = today`; if correct: `correct++`,
   `totalCorrectMs += min(responseMs, 30000)`.
2. **First exposure** (level 0, after the New Discovery card): set level 1, `dueDay = today`.
   Stop.
3. **Wrong:** level → 1, `dueDay = today`. If it was level 5, it stays marked
   `everMastered = true` (shows as "needs a tune-up").
4. **Correct & fast** (`responseMs ≤ FAST_MS` and the page was visible the whole time):
   - Add `today` to `fastDays` (distinct, keep the last 5).
   - **Promote by one level, at most once per day** (`lastPromotedDay !== today`).
   - Promotion **to level 5 requires ≥ 2 distinct `fastDays`**; otherwise cap at 4.
   - On promotion set `lastPromotedDay = today`.
   - On reaching level 5 set `everMastered = true`.
5. **Correct & slow:** level unchanged.
6. Set `dueDay = today + interval(level)` (interval per §3.1).

If the page was hidden (tab switched / app backgrounded) at any point while a question was
on screen, a correct answer is treated as **slow** (prevents inflated or broken timings).

### 3.3 Building a quest (15 questions)
Inputs: all fact records, `today`, `allowNew` (false for Warm-up, Free Flight, and Boss), RNG.

1. **New facts:** if `allowNew` and fewer than 8 facts are currently at level 1, pick up to
   **3** level-0 facts from the earliest open planet that has any (in that planet's fact
   order). Each new fact uses **2 slots** (discovery + re-ask ≥ 3 positions later).
2. **Due facts:** fill with due facts, oldest `dueDay` first, then lowest level first.
3. **Maintenance:** if any level-5 facts exist and none are already included, include up to
   2 random mastered facts.
4. **Filler:** if still short, fill with introduced facts of the lowest level, random among
   ties; if every introduced fact is already used, allow repeats (never back-to-back).
5. **Order:** shuffle with constraints — the same fact never appears twice in a row; a new
   fact's re-ask is ≥ 3 positions after its discovery.
6. **Wrong-answer re-inserts** happen at runtime: the fact is inserted 3–5 positions later
   (or at the end if fewer remain). Each fact can be re-inserted at most twice per quest.
   A quest therefore has 15–20 questions.

**Warm-up** = 5 questions using steps 2–5 with `allowNew = false`.

### 3.4 Building a boss battle
Up to 20 questions, generated as a lazy stream: each next question is drawn ~60% from the
boss planet's facts and ~40% from introduced facts on earlier planets, weighted toward lower
levels, never the same fact twice in a row.

### 3.5 Progress derivations (pure functions)
- `openPlanets(facts)` — planet 1 always open; planet *n+1* open when planet *n* is open
  and all its facts are level ≥ 2.
- `frontierPlanet(facts)` — earliest open planet with any level-0 fact (or none).
- `availableBoss(facts, bossesBeaten)` — earliest open planet whose facts are all level ≥ 1
  and whose boss isn't beaten.
- `starStates(facts)` — per fact: `lit` (level 5), `tuneUp` (everMastered && level < 5),
  `dark`.

### 3.6 Days
All "day" values are **local calendar dates** (`YYYY-MM-DD`) from the device clock. A
helper adds days and compares dates without time-zone drift.

---

## 4. Parent Area

### 4.1 Parent gate
"Grown-ups" button → a random 2-digit × 2-digit problem (e.g. `23 × 14`), typed with the
number pad. Correct → dashboard. Wrong → new problem. Close button returns to the map.

### 4.2 Dashboard
- **9×9 fact grid (heatmap).** Rows and columns 1–9; cell `(r, c)` shows fact `{r, c}`
  (symmetric cells share a color). Colors:
  - Gray — new (level 0)
  - Red — learning (level 1)
  - Orange — getting there (2)
  - Yellow — solid (3–4)
  - Green — mastered (5)
  - Each color also has a distinct pattern/icon for color-blind readability.
- Tap a cell → fact detail: level, attempts, accuracy %, average correct response time,
  last practiced day.
- **Summary:** stars mastered `x / 45`, current & best streak, planets freed, minutes played
  per day for the last 7 days (simple bar list), total minutes this week.
- **Backup:** *Export progress* (downloads `times-table-rocket-{name}-{date}.json`) and
  *Import progress* (file picker; validated; confirm before overwrite).
- **Reset progress:** requires typing `RESET`; then returns to first-launch.

### 4.3 Minutes played
Active time = sum over answers of the time since the previous answer (or question start),
each capped at 60 s. Stored per local day; keep the last 60 days.

---

## 5. Saving & Data

### 5.1 Storage
- Key: `ttr.save` in `localStorage`, JSON, with `schemaVersion: 1`.
- Saved after every answer and every screen-level state change.
- On load: parse → validate → migrate (by `schemaVersion`) → use.
- **Corrupt or invalid data:** copy the raw string to `ttr.save.corrupt.{timestamp}`, start
  fresh, and show a one-time notice in the parent area.
- **`localStorage` unavailable** (e.g. private browsing): the game still plays in memory and
  shows a small banner "Progress can't be saved on this device."
- Call `navigator.storage.persist()` when available.
- **iPad note:** Safari can clear site data for websites not used for 7 days. Data for
  home-screen-installed web apps is not subject to that rule, so the first-run screen and the
  parent dashboard recommend **"Add to Home Screen"**, and Export/Import exists as a backup.

### 5.2 Data model
```ts
type Day = string;           // 'YYYY-MM-DD' local
type FactId = string;        // 'axb', a <= b, e.g. '3x7'
type PlanetId = 1|2|3|4|5|6|7|8|9;
type Level = 0|1|2|3|4|5;

interface FactRecord {
  level: Level;
  dueDay: Day | null;          // null while level 0
  lastPromotedDay: Day | null;
  fastDays: Day[];             // distinct, most recent last, max 5
  everMastered: boolean;
  attempts: number;
  correct: number;
  totalCorrectMs: number;
  lastSeenDay: Day | null;
}

interface MissionState {
  day: Day;
  step: 'warmup' | 'quest1' | 'quest2' | 'quest3' | 'boss' | 'complete';
}

interface SaveData {
  schemaVersion: 1;
  captainName: string;
  createdAt: string;            // ISO timestamp
  placementDone: boolean;
  facts: Record<FactId, FactRecord>;   // all 45 always present
  bossesBeaten: PlanetId[];
  streak: { current: number; best: number; lastMissionDay: Day | null };
  mission: MissionState | null;
  dailyActiveSeconds: Record<Day, number>;  // last 60 days
  settings: { soundOn: boolean };
  celebrated: { planetsUnlocked: PlanetId[]; galaxyMaster: boolean }; // avoid repeat celebrations
}
```

### 5.3 Import validation
Imported files must parse as JSON, have a known `schemaVersion`, all 45 fact IDs with valid
fields, and sane numbers; otherwise show "That file isn't a Times Table Rocket save" and
change nothing.

---

## 6. Screens & Flow

```
First launch:  Welcome (name) → Systems Check → Galaxy Map
Returning:     Galaxy Map
Galaxy Map → Launch Mission → Warm-up → Quest 1 → Quest 2 → Quest 3 → [Boss] → Mission Complete → Galaxy Map
Galaxy Map → Free Flight → Quest (repeatable) → Galaxy Map
Galaxy Map → Star Map | Hangar | Grown-ups → Parent Gate → Dashboard
```
A small **⟵ Map** button is available during quests (progress already saved; mission
resumes at the current step).

Navigation is an in-app screen state (no URL router).

---

## 7. Visual & UX Requirements

- Art is drawn in code (inline SVG + CSS): rocket, 9 planets, 9 aliens, asteroid boss,
  starfield. No third-party art assets.
- Kid-friendly rounded font, bundled locally (works offline).
- Layout works from 768×1024 (iPad portrait) through 1024×768 (iPad landscape) to desktop
  1920×1080; usable on a 375-wide phone.
- Number pad buttons ≥ 64×64 px; question text ≥ 64 px tall on tablet.
- Respects `prefers-reduced-motion` (animations become fades). Nothing flashes more than
  3 times per second.
- Color is never the only signal (icons/patterns too).
- Feedback after an answer lasts ≤ 1 s for correct answers, so the pace stays brisk.

---

## 8. Technical Architecture

### 8.1 Stack
- **Vite + React 18 + TypeScript (strict).**
- Plain CSS (CSS Modules), no UI library.
- State: React context + `useReducer`; the reducer delegates to the pure engine.
- **PWA:** `vite-plugin-pwa` — manifest, icons, offline service worker.
- **Testing:** Vitest + React Testing Library (unit/component); Playwright (end-to-end, Chromium
  desktop + WebKit iPad viewport).
- Lint/format: ESLint + Prettier.
- Hosting: any static host (GitHub Pages planned).

### 8.2 Modules
```
src/
  engine/            pure, framework-free, fully unit-tested
    dates.ts         local-day helpers (today, addDays, compare)
    rng.ts           seedable RNG + shuffle
    facts.ts         45 facts, planet table, planet-of-fact, tips
    levels.ts        intervals, applyAnswer()
    scheduler.ts     buildQuest(), buildWarmup(), nextBossQuestion()
    progress.ts      openPlanets(), frontierPlanet(), availableBoss(), starStates()
    mission.ts       mission step machine, streak update
    placement.ts     Systems Check result mapping
    stats.ts         per-fact stats, active-time accounting
  storage/
    save.ts          load / save / validate / migrate / fresh save
    backup.ts        export (download) / import (parse + validate)
  state/
    GameContext.tsx  provider, reducer, actions, persistence side-effect
  audio/
    sfx.ts           Web Audio synthesized effects + mute
  components/        NumberPad, QuestionCard, RepairScreen, DotGrid, FuelGauge,
                     LightningBurst, Rocket, Planet, Alien, Asteroid, Starfield, StreakFlame
  screens/           Welcome, SystemsCheck, GalaxyMap, Mission (Warmup/Quest/Boss/Complete),
                     FreeFlight, StarMap, Hangar, ParentGate, ParentDashboard
  App.tsx            screen switcher
```
Rules: `engine/` imports nothing from React, DOM, or storage. Screens never touch
`localStorage` directly.

### 8.3 Timing
Response time = `performance.now()` at submit − time the question became interactive (after
its entrance animation). A `visibilitychange` listener flags a question as "interrupted" if
the page is hidden while it's on screen.

---

## 9. Testing & Acceptance

### 9.1 Automated
- **Engine (unit):** 45 facts and planet counts 9/8/7/6/5/4/3/2/1; `applyAnswer` for every
  branch (first exposure, wrong, fast, slow, once-per-day promotion, 2-day mastery rule,
  tune-up); intervals; quest builder (≤ 3 new, 2 slots per new fact, no back-to-back,
  re-ask spacing, due ordering, maintenance inclusion, `allowNew=false`); re-insert limits;
  boss stream mix and 20-question cap; planet unlocking; boss availability; streak rules;
  placement mapping.
- **Storage:** round-trip, fresh save has 45 facts, corrupt data backed up, unknown
  version rejected, import validation.
- **Components:** number pad by tap and by keyboard (digits, Backspace, Enter, 2-digit max);
  Repair screen requires correct retype; parent gate.
- **End-to-end:** first launch → name → Systems Check → map → first quest answered → reload
  keeps progress; parent gate → dashboard grid renders.

### 9.2 Acceptance checklist (manual, on the real iPad and a computer)
- [ ] Fresh install → Systems Check → appropriate starting planet.
- [ ] A full Daily Mission takes roughly 8–12 minutes.
- [ ] Wrong answers feel gentle; no countdown visible anywhere.
- [ ] Leaving mid-mission and returning the same day resumes the mission.
- [ ] A boss can be beaten and grants a ship part and crew member.
- [ ] Star Map and parent grid agree.
- [ ] Works offline after first load; installs to the Home Screen.
- [ ] Export → Reset → Import restores progress.

---

## 10. Future Ideas (not v1)
Asteroid-dodge mini-game (Phaser) as a reward; ×10–×12 "outer rim" planets; division
"reverse thrusters"; multiple captains; cloud sync; parent settings (table focus, mission
length); voice read-aloud.
