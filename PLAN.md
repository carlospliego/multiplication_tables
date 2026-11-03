# Times Table Rocket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a space-adventure web game (tablet + computer) that drills the 45 single-digit multiplication facts to instant recall using a spaced-repetition memory engine.

**Architecture:** A pure-TypeScript memory engine (`src/engine/`) decides levels, scheduling, unlocking and missions with injected `today` and RNG. A thin storage layer persists one versioned JSON save in `localStorage`. A React app (context + reducer) renders screens and delegates every rule to the engine.

**Tech Stack:** Vite, React 18, TypeScript (strict), CSS Modules, Vitest, React Testing Library, Playwright, vite-plugin-pwa, ESLint, Prettier.

**Spec:** `SPEC.md` (read it alongside this plan; section numbers like §3.2 refer to it).

## Global Constraints

- Facts: exactly 45, id `"axb"` with `a ≤ b`, `1 ≤ a ≤ b ≤ 9` (§2.2).
- Planet table order: ×1, ×2, ×5, ×3, ×4, ×9, ×6, ×7, ×8; fact counts 9/8/7/6/5/4/3/2/1 (§2.2).
- `FAST_MS = 4000`; intervals by level `{0:0, 1:0, 2:1, 3:2, 4:4, 5:7}` days (§3.1).
- Quest 15 questions (max 20 with re-inserts), warm-up 5, ≤ 3 new facts per quest, no new facts if ≥ 8 facts at level 1 (§3.3).
- Boss shield 12, max 20 questions, ~60/40 planet/review mix (§2.7).
- No visible countdown anywhere. No lives / game over (§2.6, §1.2).
- `engine/` imports nothing from React, the DOM, or `storage/`. Screens never touch `localStorage` (§8.2).
- All days are local `YYYY-MM-DD` strings; never use UTC dates for days (§3.6).
- Save key `ttr.save`, `schemaVersion: 1`; corrupt data copied to `ttr.save.corrupt.{timestamp}` (§5.1).
- Number pad buttons ≥ 64×64 px; respect `prefers-reduced-motion`; color never the only signal (§7).
- No third-party art or audio assets; art is inline SVG, audio is Web Audio synthesized (§2.13, §7).

## Review Focus

1. **Day changes mid-mission (playing past midnight)** — the mission finishes normally, counts for the day it *started* (`mission.day`), and answers use the day at answer time. Test in Task 8.
2. **Device clock moved backward** — no crash, no negative intervals; streak is left unchanged if `today < lastMissionDay`. Test in Task 8.
3. **Double submit (double-tap GO, or Enter + tap)** — exactly one answer recorded per question. Test in Task 13.
4. **Leading zero / odd input ("07", "0")** — "07" is accepted as 7; GO disabled while empty; a third digit is ignored. Test in Task 12.
5. **iPad sleeps or app switches mid-question** — the answer counts as slow (never promotes), the timer doesn't produce a huge active-time entry (capped 60 s). Tests in Tasks 8 and 13.

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, .eslintrc.cjs, .prettierrc, index.html
playwright.config.ts
src/
  main.tsx, App.tsx, App.module.css, theme.css
  engine/
    types.ts       shared engine types
    dates.ts       local-day helpers
    rng.ts         seedable RNG, shuffle, pick
    facts.ts       45 facts, PLANETS table, planetOf, tips, question orientation
    levels.ts      intervals, newFactRecord, applyAnswer, isDue
    placement.ts   Systems Check questions + level mapping
    progress.ts    openPlanets, frontierPlanet, availableBoss, starStates
    scheduler.ts   buildQuest, buildWarmup
    questRun.ts    runtime quest state, wrong-answer re-inserts, fuel
    boss.ts        boss state + question stream
    mission.ts     mission steps, streak
    stats.ts       active time, per-fact stats
    *.test.ts      colocated unit tests
  storage/
    save.ts, backup.ts (+ tests)
  state/
    GameContext.tsx, gameReducer.ts (+ test)
  audio/
    sfx.ts
  hooks/
    useQuestionTimer.ts (+ test)
  components/      NumberPad, QuestionCard, DiscoveryCard, RepairScreen, DotGrid, FuelGauge,
                   LightningBurst, Rocket, Planet, Alien, Asteroid, Starfield, StreakFlame
                   (each .tsx + .module.css, tests where listed)
  screens/         Welcome, SystemsCheck, GalaxyMap, MissionScreen, QuestScreen, BossScreen,
                   MissionComplete, FreeFlight, StarMap, Hangar, ParentGate, ParentDashboard
e2e/
  first-launch.spec.ts
.github/workflows/deploy.yml
```

---

# Phase 0 — Project Setup

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/test-setup.ts`, `src/App.test.tsx`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `test` (`vitest run`), `test:watch`, `lint`, `e2e` (added in Task 28).

- [ ] **Step 1: Initialize git and npm.** Run `git init` and `npm init -y` in the project root (the directory already holds `SPEC.md`, `PLAN.md`, `.claude/`, so don't use `npm create vite` — it refuses non-empty dirs).
- [ ] **Step 2: Install dependencies.**
  ```bash
  npm i react@18 react-dom@18
  npm i -D vite @vitejs/plugin-react typescript @types/react@18 @types/react-dom@18 \
    vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom \
    eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks prettier
  ```
- [ ] **Step 3: Configure.** `tsconfig.json` with `"strict": true`, `"jsx": "react-jsx"`, `"noUncheckedIndexedAccess": true`. `vite.config.ts` with the React plugin and `test: { environment: 'jsdom', setupFiles: 'src/test-setup.ts', css: { modules: { classNameStrategy: 'non-scoped' } } }`. `src/test-setup.ts` imports `@testing-library/jest-dom/vitest`. `.gitignore`: `node_modules`, `dist`, `test-results`, `playwright-report`.
- [ ] **Step 4: Write the failing smoke test** `src/App.test.tsx`: `it('renders the game title')` — `render(<App />)`; `expect(screen.getByText('Times Table Rocket')).toBeInTheDocument()`.
- [ ] **Step 5: Run** `npx vitest run src/App.test.tsx` — Expected: FAIL (App missing).
- [ ] **Step 6: Implement** `src/App.tsx` exporting `GAME_TITLE = 'Times Table Rocket'` and rendering it; `src/main.tsx` mounts `<App />`; `index.html` with viewport meta `width=device-width, initial-scale=1, viewport-fit=cover`.
- [ ] **Step 7: Verify** `npm test` PASS, `npm run build` succeeds, `npm run lint` clean.
- [ ] **Step 8: Commit** `git add -A && git commit -m "chore: scaffold Vite React TS project"`

---

# Phase 1 — Memory Engine (pure TypeScript, TDD)

### Task 2: Types, dates, RNG

**Files:**
- Create: `src/engine/types.ts`, `src/engine/dates.ts`, `src/engine/rng.ts`
- Test: `src/engine/dates.test.ts`, `src/engine/rng.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type Day = string;                 // 'YYYY-MM-DD' local
  export type FactId = string;              // 'axb', a <= b
  export type PlanetId = 1|2|3|4|5|6|7|8|9;
  export type Level = 0|1|2|3|4|5;
  export interface FactRecord { level: Level; dueDay: Day|null; lastPromotedDay: Day|null;
    fastDays: Day[]; everMastered: boolean; attempts: number; correct: number;
    totalCorrectMs: number; lastSeenDay: Day|null; }
  export type Facts = Record<FactId, FactRecord>;
  export interface Question { factId: FactId; a: number; b: number; answer: number;
    kind: 'normal' | 'discovery'; }
  export interface AnswerInput { correct: boolean; responseMs: number; interrupted: boolean; }
  export type Rng = () => number;           // [0, 1)
  ```
- Produces (`dates.ts`): `todayLocal(now?: Date): Day`, `addDays(day: Day, n: number): Day`, `compareDays(a: Day, b: Day): number` (−/0/+), `daysBetween(from: Day, to: Day): number`.
- Produces (`rng.ts`): `createRng(seed: number): Rng` (mulberry32), `shuffle<T>(items: readonly T[], rng: Rng): T[]` (Fisher–Yates, returns copy), `pick<T>(items: readonly T[], rng: Rng): T`, `randInt(min: number, maxInclusive: number, rng: Rng): number`.

- [ ] **Step 1: Write failing tests.**
  - `todayLocal(new Date(2026, 10, 2, 23, 59))` → `'2026-11-02'` (local, not UTC).
  - `addDays('2026-12-31', 1)` → `'2027-01-01'`; `addDays('2026-03-08', 1)` → `'2026-03-09'` (DST); `addDays('2026-11-02', -2)` → `'2026-10-31'`.
  - `compareDays('2026-11-02','2026-11-10') < 0`; `daysBetween('2026-11-02','2026-11-09') === 7`.
  - `createRng(42)` twice yields identical first 5 values; all values in `[0,1)`.
  - `shuffle([1..10], rng)` is a permutation and does not mutate input; `randInt(3,5,rng)` over 200 draws hits 3, 4 and 5 only.
- [ ] **Step 2: Run** `npx vitest run src/engine/dates.test.ts src/engine/rng.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** Dates: parse `YYYY-MM-DD` into a local `new Date(y, m-1, d)` at noon, add days via `setDate`, format with zero padding (noon avoids DST edge bugs).
- [ ] **Step 4: Run tests** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(engine): types, local-day helpers, seedable rng"` (add new files first).

### Task 3: Facts and planets

**Files:**
- Create: `src/engine/facts.ts`
- Test: `src/engine/facts.test.ts`

**Interfaces:**
- Consumes: types, `Rng`, `pick` from Task 2.
- Produces:
  ```ts
  export const TABLE_ORDER = [1, 2, 5, 3, 4, 9, 6, 7, 8] as const;
  export interface PlanetInfo { id: PlanetId; name: string; table: number; factIds: FactId[];
    alienName: string; shipPart: string; }
  export const PLANETS: readonly PlanetInfo[];          // index 0 = planet 1
  export const ALL_FACT_IDS: readonly FactId[];         // 45, planet order then fact order
  export function factId(a: number, b: number): FactId; // sorts
  export function parseFact(id: FactId): { a: number; b: number };
  export function planetOf(id: FactId): PlanetId;
  export function tipFor(id: FactId): string;
  export function makeQuestion(id: FactId, rng: Rng, kind?: Question['kind']): Question;
  ```
  Planet names: Launch Pad, Twinara, Pentaro, Trion, Quadrix, Nonova, Hexion, Septura, Octavia. Ship parts in order (§2.9): Racing Fins, Nose Cone, Twin Boosters, Wings, Flame Trail, Antenna, Stripes, Bubble Cockpit, Golden Paint. Alien names: Bleep, Twix, Penny, Zib, Quorp, Nova, Hex, Septi, Octo.

- [ ] **Step 1: Write failing tests.**
  - `ALL_FACT_IDS.length === 45`, all unique, all match `/^[1-9]x[1-9]$/` with a ≤ b.
  - `PLANETS.map(p => p.factIds.length)` equals `[9,8,7,6,5,4,3,2,1]`; `PLANETS.map(p=>p.table)` equals `TABLE_ORDER`.
  - `PLANETS[3].factIds` equals `['3x3','3x4','3x6','3x7','3x8','3x9']`; `PLANETS[5].factIds` equals `['6x9','7x9','8x9','9x9']`.
  - `factId(7,3) === '3x7'`; `planetOf('3x9') === 4`; `planetOf('6x9') === 6`; `planetOf('3x5') === 3`; `planetOf('8x8') === 9`.
  - `tipFor('2x7')` contains `"double"`; `tipFor('7x8') === "7×8 = 7×5 + 7×3 = 35 + 21"`; `tipFor('7x7') === "7×7 = 7×5 + 7×2 = 35 + 14"`.
  - `makeQuestion('3x7', rng)` has `answer 21`, `{a,b}` is `{3,7}` or `{7,3}`; over 100 calls both orders appear.
- [ ] **Step 2: Run** `npx vitest run src/engine/facts.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** Planet assignment: a fact belongs to the planet whose table is the earliest of `a`, `b` in `TABLE_ORDER`. Within a planet, order facts by the other factor ascending. Tip strings are exactly the §2.6.1 table; the ×7 tip is `` `7×${n} = 7×5 + 7×${n-5} = ${35} + ${7*(n-5)}` `` where `n` is the other factor (n ≥ 7 always on Septura).
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(engine): fact catalogue and planets`

### Task 4: Levels and applyAnswer

**Files:**
- Create: `src/engine/levels.ts`
- Test: `src/engine/levels.test.ts`

**Interfaces:**
- Consumes: types, `addDays`, `compareDays`.
- Produces:
  ```ts
  export const FAST_MS = 4000;
  export const INTERVAL_DAYS: Record<Level, number>;  // {0:0,1:0,2:1,3:2,4:4,5:7}
  export function newFactRecord(): FactRecord;         // level 0, nulls, zeros, []
  export function isFastAnswer(ans: AnswerInput): boolean; // correct && !interrupted && responseMs <= FAST_MS
  export function applyAnswer(rec: FactRecord, ans: AnswerInput, today: Day): FactRecord; // pure
  export function isDue(rec: FactRecord, today: Day): boolean;
  ```

- [ ] **Step 1: Write failing tests** (`T = '2026-11-02'`, `fast = {correct:true,responseMs:2000,interrupted:false}`):
  - `first exposure → level 1 due today regardless of answer` (level 0 + wrong → level 1, dueDay T, attempts 1).
  - `wrong drops to level 1 and due today` (level 4 → 1).
  - `wrong on mastered keeps everMastered` (level 5, everMastered true → level 1, everMastered true).
  - `fast correct promotes one level` (level 2, lastPromotedDay '2026-11-01' → level 3, dueDay `addDays(T,2)`, fastDays includes T, lastPromotedDay T).
  - `promotes at most once per day` (apply fast twice on T from level 2 → level 3).
  - `level 5 needs two distinct fast days` (level 4, fastDays [] → stays 4; level 4 fastDays ['2026-10-29'] → 5, everMastered true).
  - `slow correct keeps level` (responseMs 4001 → level unchanged, correct+1, dueDay reset by interval).
  - `exactly FAST_MS counts as fast` (4000 → promotes).
  - `interrupted correct is treated as slow` (interrupted true, 1000ms → level unchanged).
  - `fastDays keeps distinct last 5`.
  - `totalCorrectMs caps each answer at 30000`.
  - `isDue`: level 0 → false; level 2 dueDay T → true on T, false on `addDays(T,-1)`.
  - `does not mutate input record`.
- [ ] **Step 2: Run** `npx vitest run src/engine/levels.test.ts` — FAIL.
- [ ] **Step 3: Implement** following §3.2 steps 1–6 in order.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(engine): level rules and applyAnswer`

### Task 5: Progress derivations

**Files:**
- Create: `src/engine/progress.ts`
- Test: `src/engine/progress.test.ts`

**Interfaces:**
- Consumes: `PLANETS`, `ALL_FACT_IDS`, types.
- Produces:
  ```ts
  export type StarState = 'lit' | 'tuneUp' | 'dark';
  export function openPlanets(facts: Facts): PlanetId[];
  export function frontierPlanet(facts: Facts): PlanetId | null;
  export function availableBoss(facts: Facts, bossesBeaten: readonly PlanetId[]): PlanetId | null;
  export function starStates(facts: Facts): Record<FactId, StarState>;
  export function masteredCount(facts: Facts): number;
  export function makeFacts(overrides?: Partial<Record<FactId, Partial<FactRecord>>>): Facts; // test/helper: all 45 new + overrides
  ```

- [ ] **Step 1: Write failing tests.**
  - All new → `openPlanets` `[1]`, `frontierPlanet` `1`, `availableBoss` `null`.
  - Planet 1 all level 2 → open `[1,2]`, frontier `2`.
  - Planet 1 has one fact at level 1 → open `[1]`.
  - Planets 1–3 all level 4 → open `[1,2,3,4]`, frontier `4`.
  - Planet 1 all level 1 → `availableBoss(f, [])` `1`; `availableBoss(f, [1])` `null`.
  - Planets 1 & 2 bosses both available → returns `1`.
  - Locked planet with all facts ≥1 (impossible via play, but set directly) is not offered as a boss.
  - `starStates`: level 5 → 'lit'; level 2 + everMastered → 'tuneUp'; level 3 → 'dark'. `masteredCount` counts level 5.
  - `frontierPlanet` returns `null` when no open planet has level-0 facts.
- [ ] **Step 2: Run** `npx vitest run src/engine/progress.test.ts` — FAIL.
- [ ] **Step 3: Implement** per §3.5 / §2.7 / §2.8.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(engine): planet unlocking, boss availability, star states`

### Task 6: Quest and warm-up builder

**Files:**
- Create: `src/engine/scheduler.ts`
- Test: `src/engine/scheduler.test.ts`

**Interfaces:**
- Consumes: `isDue`, `frontierPlanet`, `PLANETS`, `makeQuestion`, `shuffle`, `pick`, `makeFacts`.
- Produces:
  ```ts
  export const QUEST_SIZE = 15;
  export const WARMUP_SIZE = 5;
  export const MAX_NEW_PER_QUEST = 3;
  export const MAX_LEVEL1_FOR_NEW = 8;
  export interface BuildOptions { today: Day; allowNew: boolean; size?: number }
  export function buildQuest(facts: Facts, opts: BuildOptions, rng: Rng): Question[];
  export function buildWarmup(facts: Facts, today: Day, rng: Rng): Question[];  // size 5, allowNew false
  ```

- [ ] **Step 1: Write failing tests** (seeded rng, `T`):
  - `introduces at most 3 new facts, each twice` — all 45 facts new: result has length 6, exactly 3 distinct facts (`1x1, 1x2, 1x3`), each once as `'discovery'` and once as `'normal'` (no introduced facts exist for filler).
  - `discovery precedes its re-ask by at least 3 positions` — checked on the all-new case above and on a mixed case (planets 1–3 at level 2, all due) over 50 seeds.
  - `new facts come from the frontier planet in order` (planets 1–3 at level 4 → new are `3x3, 3x4, 3x6`).
  - `no new facts when allowNew is false`.
  - `no new facts when ≥ 8 facts are at level 1`.
  - `due facts are included oldest dueDay first` — 20 due facts with assorted dueDays, allowNew false → the 15 chosen are the 15 oldest.
  - `includes up to 2 mastered facts for maintenance` when some are level 5 and not due.
  - `never places the same fact twice in a row` — property loop over 50 seeds.
  - `length is QUEST_SIZE when enough introduced facts exist`.
  - `buildWarmup` returns 5 questions, none `'discovery'`.
- [ ] **Step 2: Run** `npx vitest run src/engine/scheduler.test.ts` — FAIL.
- [ ] **Step 3: Implement** §3.3 steps 1–5. Ordering algorithm (the tests don't determine it):
  ```
  base  = shuffle(the non-new items)
  slots = base with discoveries D1..Dk inserted at indices 0, 2, 4 (clamped to length)
  for each Di: insert its re-ask Ni at index(Di) + 3 (clamped to end)
  repair adjacency: scan left→right; if item[i].factId === item[i-1].factId, swap item[i] with the
    nearest later non-new item whose factId differs from both of item[i]'s neighbours
    (never move discoveries or re-asks, so the ≥ 3 spacing holds)
  ```
  When fewer than 15 candidates exist and every introduced fact is used, repeat introduced facts (lowest level first) — but if no introduced facts exist, return only the new-fact items.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(engine): quest and warm-up builder`

### Task 7: Quest runtime and boss

**Files:**
- Create: `src/engine/questRun.ts`, `src/engine/boss.ts`
- Test: `src/engine/questRun.test.ts`, `src/engine/boss.test.ts`

**Interfaces:**
- Consumes: `Question`, `Facts`, `Rng`, `randInt`, `pick`, `makeQuestion`, `PLANETS`, `planetOf`.
- Produces (`questRun.ts`):
  ```ts
  export const MAX_REINSERTS_PER_FACT = 2;
  export const MAX_QUEST_LENGTH = 20;
  export interface QuestRun { queue: Question[]; index: number; reinserts: Record<FactId, number>;
    fuel: number; lightning: number; answered: number; }
  export function startQuestRun(queue: Question[]): QuestRun;
  export function currentQuestion(run: QuestRun): Question | null;
  export function recordQuestResult(run: QuestRun, correct: boolean, fast: boolean, rng: Rng): QuestRun;
  export function isQuestDone(run: QuestRun): boolean;
  export function fuelFraction(run: QuestRun): number;  // fuel / number of correct-able slots, 0..1
  ```
- Produces (`boss.ts`):
  ```ts
  export const BOSS_SHIELD = 12;
  export const BOSS_MAX_QUESTIONS = 20;
  export interface BossRun { planet: PlanetId; shield: number; asked: number;
    lastFactId: FactId | null; status: 'fighting' | 'won' | 'retreated'; }
  export function startBoss(planet: PlanetId): BossRun;
  export function nextBossQuestion(facts: Facts, run: BossRun, rng: Rng): Question;
  export function recordBossAnswer(run: BossRun, factId: FactId, correct: boolean): BossRun;
  ```

- [ ] **Step 1: Write failing tests.**
  - questRun: correct → index+1, fuel+1, `lightning` +1 only when fast. Wrong → the same fact appears again 3–5 positions later (or at end), not adjacent to an identical fact. A third wrong on one fact does not re-insert. Queue length never exceeds 20. `isQuestDone` true once index reaches queue length. A `'discovery'` question re-inserted becomes `'normal'`.
  - boss: `startBoss(4)` shield 12. 12 correct answers → status `'won'`. Wrong at shield 12 stays 12; wrong at shield 5 → 6. 20 answers without winning → `'retreated'`. Over 500 questions from `nextBossQuestion` (seeded), share of planet-4 facts is between 0.5 and 0.7, never the same fact twice in a row, and only introduced (level ≥ 1) facts from open planets ≤ boss planet are used. If no earlier-planet facts are introduced, all questions come from the boss planet.
- [ ] **Step 2: Run** `npx vitest run src/engine/questRun.test.ts src/engine/boss.test.ts` — FAIL.
- [ ] **Step 3: Implement.** Boss review weighting: weight `= 6 - level` for each candidate.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(engine): quest runtime re-inserts and boss battles`

### Task 8: Mission, streak, placement, stats

**Files:**
- Create: `src/engine/mission.ts`, `src/engine/placement.ts`, `src/engine/stats.ts`
- Test: `src/engine/mission.test.ts`, `src/engine/placement.test.ts`, `src/engine/stats.test.ts`

**Interfaces:**
- Produces (`mission.ts`):
  ```ts
  export type MissionStep = 'warmup' | 'quest1' | 'quest2' | 'quest3' | 'boss' | 'complete';
  export interface MissionState { day: Day; step: MissionStep; }
  export interface Streak { current: number; best: number; lastMissionDay: Day | null; }
  export function missionForToday(saved: MissionState | null, today: Day): MissionState; // resume same day, else fresh 'warmup'
  export function advanceMission(m: MissionState, bossAvailable: boolean): MissionState;  // quest3 → boss|complete; boss → complete
  export function isMissionDoneToday(saved: MissionState | null, today: Day): boolean;
  export function applyMissionComplete(streak: Streak, missionDay: Day): Streak;
  ```
- Produces (`placement.ts`):
  ```ts
  export const PLACEMENT_PLANETS: readonly PlanetId[];  // [1, 2, 3]
  export function placementQuestions(rng: Rng): Question[];      // 24, shuffled, kind 'normal'
  export function applyPlacementAnswer(rec: FactRecord, ans: AnswerInput, today: Day): FactRecord;
  ```
- Produces (`stats.ts`):
  ```ts
  export const ACTIVE_CAP_SECONDS = 60;
  export const ACTIVE_KEEP_DAYS = 60;
  export function addActiveSeconds(map: Record<Day, number>, today: Day, seconds: number): Record<Day, number>;
  export function lastNDays(map: Record<Day, number>, today: Day, n: number): { day: Day; seconds: number }[];
  export function factStats(rec: FactRecord): { accuracy: number | null; avgCorrectMs: number | null };
  ```

- [ ] **Step 1: Write failing tests.**
  - mission: `missionForToday(null, T)` → `{day:T, step:'warmup'}`; saved `{day:T, step:'quest2'}` → same; saved yesterday's `quest2` → fresh warmup for T. `advanceMission` order warmup→quest1→quest2→quest3→(boss if available)→complete. `isMissionDoneToday({day:T,step:'complete'}, T)` true; for yesterday false.
  - streak: first completion → `{1,1,T}`; consecutive day → current+1, best updated; gap of 2 days → current 1, best kept; same day twice → unchanged.
  - **Review Focus #1:** mission started on T, completed after midnight → `applyMissionComplete(streak, mission.day)` counts T (caller passes `mission.day`); assert the T+1 mission is still available (`isMissionDoneToday({day:T,step:'complete'}, addDays(T,1))` false).
  - **Review Focus #2:** `applyMissionComplete({current:3,best:5,lastMissionDay:'2026-11-05'}, '2026-11-02')` returns the input unchanged.
  - placement: 24 questions, exactly the facts of planets 1–3. Fast → level 4, `fastDays [T]`, `lastPromotedDay T`, dueDay `T+4`. Slow → level 2, due `T+1`. Wrong → level 1, due T. attempts incremented.
  - stats: `addActiveSeconds({}, T, 90)` → `{[T]:60}` (capped); entries older than 60 days pruned; **Review Focus #5:** negative seconds add 0. `lastNDays` returns 7 entries oldest→newest with zeros for missing days. `factStats` with 0 attempts → nulls; 4 attempts, 3 correct, 9000 ms → `{accuracy:0.75, avgCorrectMs:3000}`.
- [ ] **Step 2: Run** `npx vitest run src/engine` — new tests FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run src/engine` — all PASS.
- [ ] **Step 5: Commit** `feat(engine): missions, streak, placement, stats`

---

# Phase 2 — Storage

### Task 9: Save, load, validate

**Files:**
- Create: `src/storage/save.ts`
- Test: `src/storage/save.test.ts`

**Interfaces:**
- Consumes: engine types, `newFactRecord`, `ALL_FACT_IDS`, `MissionState`, `Streak`.
- Produces:
  ```ts
  export const SAVE_KEY = 'ttr.save';
  export const SCHEMA_VERSION = 1;
  export interface SaveData { /* exactly SPEC §5.2 */ }
  export type LoadStatus = 'ok' | 'none' | 'corrupt' | 'unavailable';
  export interface LoadResult { status: LoadStatus; save: SaveData | null; }
  export function createFreshSave(captainName: string, nowIso: string): SaveData; // 45 new facts, soundOn true
  export function validateSave(raw: unknown): SaveData | null;
  export function getStorage(): Storage | null;    // probes setItem/removeItem; null on throw
  export function loadSave(storage: Storage | null, nowMs: number): LoadResult;
  export function writeSave(storage: Storage | null, save: SaveData): boolean; // false on throw / null
  ```

- [ ] **Step 1: Write failing tests** (use an in-memory `Storage` fake):
  - `createFreshSave('Leo', iso)` has 45 facts, all level 0, `placementDone false`, streak zeros.
  - Round trip: `writeSave` then `loadSave` → status `'ok'`, deep-equal.
  - Empty storage → `'none'`.
  - Garbage JSON `'{oops'` → `'corrupt'`, save null, raw copied to `ttr.save.corrupt.{nowMs}`.
  - Valid JSON missing a fact id / level 9 / `schemaVersion 2` → `'corrupt'` via `validateSave` returning null.
  - `captainName` trimmed and > 16 chars rejected by validation.
  - `loadSave(null, …)` → `'unavailable'`.
  - `writeSave` with a storage whose `setItem` throws `QuotaExceededError` → returns `false`, does not throw.
- [ ] **Step 2: Run** `npx vitest run src/storage/save.test.ts` — FAIL.
- [ ] **Step 3: Implement.** Hand-written validator (no schema library): check every field's type and ranges from §5.2.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(storage): versioned local save with validation`

### Task 10: Export / import backup

**Files:**
- Create: `src/storage/backup.ts`
- Test: `src/storage/backup.test.ts`

**Interfaces:**
- Consumes: `SaveData`, `validateSave`.
- Produces:
  ```ts
  export function exportFilename(save: SaveData, today: Day): string; // `times-table-rocket-${slug(name)}-${today}.json`
  export function serializeSave(save: SaveData): string;              // pretty JSON
  export function parseImport(text: string): SaveData | null;
  export function downloadSave(save: SaveData, today: Day): void;     // Blob + temporary <a download>
  ```

- [ ] **Step 1: Write failing tests:** `exportFilename` for name `'Leo M!'` → `'times-table-rocket-leo-m-2026-11-02.json'`; `parseImport(serializeSave(s))` deep-equals `s`; `parseImport('hello')` null; `parseImport('{"schemaVersion":1}')` null.
- [ ] **Step 2: Run** `npx vitest run src/storage/backup.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(storage): export and import progress`

---

# Phase 3 — Playable Core (MVP checkpoint)

At the end of this phase he can enter his name, do the Systems Check, and play daily missions (no boss yet, plain styling).

### Task 11: Game state (context + reducer)

**Files:**
- Create: `src/state/gameReducer.ts`, `src/state/GameContext.tsx`
- Test: `src/state/gameReducer.test.ts`

**Interfaces:**
- Consumes: engine + storage modules.
- Produces:
  ```ts
  export type Screen = 'welcome' | 'systemsCheck' | 'map' | 'mission' | 'freeFlight'
    | 'starMap' | 'hangar' | 'parentGate' | 'parent';
  export interface GameState { save: SaveData | null; screen: Screen; loadStatus: LoadStatus;
    storageOk: boolean; corruptNotice: boolean; }
  export type GameAction =
    | { type: 'createCaptain'; name: string; nowIso: string }
    | { type: 'answer'; factId: FactId; answer: AnswerInput; today: Day; mode: 'normal' | 'placement'; activeSeconds: number }
    | { type: 'finishPlacement' }
    | { type: 'startMission'; today: Day }
    | { type: 'advanceMission'; today: Day }          // computes bossAvailable from save
    | { type: 'completeMission' }                     // uses save.mission.day for streak
    | { type: 'bossBeaten'; planet: PlanetId }
    | { type: 'markCelebrated'; planet?: PlanetId; galaxyMaster?: boolean }
    | { type: 'toggleSound' }
    | { type: 'navigate'; screen: Screen }
    | { type: 'importSave'; save: SaveData }
    | { type: 'resetProgress' }
    | { type: 'storageFailed' }
    | { type: 'dismissCorruptNotice' };
  export function initialGameState(load: LoadResult): GameState; // no save → 'welcome'; save && !placementDone → 'systemsCheck'; else 'map'
  export function gameReducer(state: GameState, action: GameAction): GameState; // pure
  export function GameProvider(props: { children: ReactNode; storage?: Storage | null }): JSX.Element;
  export function useGame(): { state: GameState; dispatch: (a: GameAction) => void };
  ```
  `GameProvider` loads once on mount, writes the save after every state change where `save` changed (dispatches `storageFailed` if `writeSave` returns false), and calls `navigator.storage?.persist?.()` once.

- [ ] **Step 1: Write failing reducer tests:** `createCaptain` → screen `systemsCheck`, 45 facts. `answer` with `mode:'placement'` uses `applyPlacementAnswer`; `mode:'normal'` uses `applyAnswer` and adds active seconds. `finishPlacement` → `placementDone true`, screen `map`. `startMission` on a new day resets the step to `warmup`; on the same day keeps the step. `advanceMission` from `quest3` → `boss` when a boss is available, else `complete`. `completeMission` updates streak using `mission.day`. `bossBeaten` appends the planet once (idempotent). `resetProgress` → save null, screen `welcome`. `importSave` replaces the save, screen `map`.
- [ ] **Step 2: Run** `npx vitest run src/state` — FAIL.
- [ ] **Step 3: Implement** reducer and provider.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(state): game reducer and provider with persistence`

### Task 12: NumberPad

**Files:**
- Create: `src/components/NumberPad.tsx`, `src/components/NumberPad.module.css`
- Test: `src/components/NumberPad.test.tsx`

**Interfaces:**
- Produces: `NumberPad(props: { value: string; onChange(v: string): void; onSubmit(): void; maxDigits?: number /* 2 */; disabled?: boolean; captureKeyboard?: boolean /* true */ })`. Buttons labeled `1`–`9`, `0`, `⌫` (aria-label "Delete"), `GO` (aria-label "Go"). Keyboard listener on `window` while mounted and `captureKeyboard`.

- [ ] **Step 1: Write failing tests:** tapping 5 then 6 calls onChange with `'5'` then `'56'`; a third digit is ignored (**Review Focus #4**); `⌫` removes last; GO disabled when value `''`; keyboard `7`, `Backspace`, `Enter` behave the same; `Enter` with empty value does not submit; `disabled` blocks all input; `'0'` then `'7'` yields `'07'` (parsed by the caller).
- [ ] **Step 2: Run** `npx vitest run src/components/NumberPad.test.tsx` — FAIL.
- [ ] **Step 3: Implement.** 3×4 grid (`1 2 3 / 4 5 6 / 7 8 9 / ⌫ 0 GO`), buttons min 64×64 px, `touch-action: manipulation` to stop double-tap zoom.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(ui): number pad with touch and keyboard input`

### Task 13: Question timer, QuestionCard, DiscoveryCard, RepairScreen, DotGrid

**Files:**
- Create: `src/hooks/useQuestionTimer.ts`, `src/components/QuestionCard.tsx`, `src/components/DiscoveryCard.tsx`, `src/components/RepairScreen.tsx`, `src/components/DotGrid.tsx` (+ `.module.css` each)
- Test: `src/hooks/useQuestionTimer.test.ts`, `src/components/QuestionCard.test.tsx`, `src/components/RepairScreen.test.tsx`

**Interfaces:**
- Consumes: `NumberPad`, `Question`, `tipFor`.
- Produces:
  ```ts
  export function useQuestionTimer(): { start(): void; stop(): { responseMs: number; interrupted: boolean } };
  export function QuestionCard(p: { question: Question; onAnswer(r: { value: number; correct: boolean; responseMs: number; interrupted: boolean }): void }): JSX.Element;
  export function DiscoveryCard(p: { question: Question; onContinue(): void }): JSX.Element;
  export function RepairScreen(p: { question: Question; onDone(): void }): JSX.Element;
  export function DotGrid(p: { rows: number; cols: number }): JSX.Element; // rows×cols dots, role="img", aria-label "7 rows of 8 dots"
  ```

- [ ] **Step 1: Write failing tests.**
  - timer (fake `performance.now`, dispatch `visibilitychange` with `document.hidden` true): `start` at 1000, `stop` at 3500 → `{2500, false}`; hidden during question → `interrupted true`.
  - QuestionCard: renders `3 × 7` with no countdown element (`queryByRole('timer')` null, no text matching `/\d+s/`); typing `21` + Go calls `onAnswer` once with `correct true`; typing `07` for 1×7 → `correct true`; **Review Focus #3:** pressing Go twice quickly / Enter then click → `onAnswer` called exactly once (card locks after first submit).
  - RepairScreen: shows `7 × 8 = 56`, a DotGrid with aria-label `7 rows of 8 dots`, and the tip; typing `54` + Go does not call `onDone` and clears input; typing `56` + Go calls `onDone`.
- [ ] **Step 2: Run** the three test files — FAIL.
- [ ] **Step 3: Implement.** QuestionCard calls `timer.start()` after its entrance animation ends (or immediately when `prefers-reduced-motion`), resets state when `question` identity changes (use a `key` from the caller).
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(ui): question card, discovery card, repair screen, invisible timer`

### Task 14: QuestScreen (runs warm-up, quests, free flight)

**Files:**
- Create: `src/screens/QuestScreen.tsx`, `src/components/FuelGauge.tsx`, `src/components/LightningBurst.tsx` (+ css)
- Test: `src/screens/QuestScreen.test.tsx`

**Interfaces:**
- Consumes: `QuestRun` API (Task 7), `QuestionCard`, `DiscoveryCard`, `RepairScreen`, `isFastAnswer`, `useGame`.
- Produces: `QuestScreen(p: { title: string; queue: Question[]; rng: Rng; onAnswer(factId: FactId, ans: AnswerInput, activeSeconds: number): void; onComplete(summary: { answered: number; lightning: number }): void; onExit(): void })`.
  Flow per item: `'discovery'` → DiscoveryCard → QuestionCard; answer → `onAnswer` → if wrong, RepairScreen → next; correct feedback ≤ 1 s (LightningBurst when fast). Active seconds = seconds since previous answer (or screen start), passed through.

- [ ] **Step 1: Write failing tests** (queue of 3 fixed questions): answering all correctly calls `onAnswer` 3× and `onComplete({answered:3, …})`; a wrong answer shows the repair screen, then the same fact appears again later before completion; discovery items show "New Discovery!" before the question; a `⟵ Map` button calls `onExit`.
- [ ] **Step 2: Run** `npx vitest run src/screens/QuestScreen.test.tsx` — FAIL.
- [ ] **Step 3: Implement.** FuelGauge shows `fuelFraction(run)` as a vertical bar (with % label for accessibility).
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(screens): quest screen with fuel, lightning and re-asks`

### Task 15: Welcome and Systems Check

**Files:**
- Create: `src/screens/Welcome.tsx`, `src/screens/SystemsCheck.tsx` (+ css)
- Test: `src/screens/Welcome.test.tsx`, `src/screens/SystemsCheck.test.tsx`

**Interfaces:**
- Consumes: `useGame`, `placementQuestions`, `QuestionCard`.
- Produces: `Welcome()` dispatches `createCaptain`; `SystemsCheck()` asks the 24 placement questions (no repair screen; shows "logged!" ≤ 1 s), dispatching `answer` with `mode:'placement'`, then `finishPlacement`.

- [ ] **Step 1: Write failing tests:** Welcome — Launch disabled for empty/whitespace name; `maxLength 16`; submitting `'  Leo '` dispatches name `'Leo'`. Welcome shows an "Add to Home Screen" tip line. SystemsCheck — renders "Systems Check" and a progress label `1 / 24`; after 24 answers dispatches `finishPlacement`; wrong answers never show "Repair".
- [ ] **Step 2: Run** the tests — FAIL.
- [ ] **Step 3: Implement.** Welcome uses a regular text input (on-screen keyboard is fine here).
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(screens): welcome and systems check`

### Task 16: Basic Galaxy Map, MissionScreen, Free Flight, App switcher

**Files:**
- Create: `src/screens/GalaxyMap.tsx`, `src/screens/MissionScreen.tsx`, `src/screens/MissionComplete.tsx`, `src/screens/FreeFlight.tsx`
- Modify: `src/App.tsx` (screen switcher inside `GameProvider`)
- Test: `src/screens/MissionScreen.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `buildWarmup`, `buildQuest`, `missionForToday`, `isMissionDoneToday`, `openPlanets`, `QuestScreen`, `todayLocal`, `createRng(Date.now())`.
- Produces: `MissionScreen()` renders the current `save.mission.step` (warm-up/quest via QuestScreen with `allowNew: true` for quests; `'boss'` renders a placeholder that immediately advances until Task 19; `'complete'` renders MissionComplete and dispatches `completeMission` once). Quest queues are built when a step starts, from the latest facts. `FreeFlight()` loops QuestScreen with `allowNew:false`. `GalaxyMap()` (plain for now) lists 9 planets with locked/open state, Launch Mission or Free Flight button, streak count.

- [ ] **Step 1: Write failing tests:** MissionScreen walks warmup → quest1 → quest2 → quest3 → complete (stub QuestScreen via completing answers quickly with a seeded fixture save) and `completeMission` is dispatched once; reopening on the same day resumes at the saved step; after completion GalaxyMap shows **Free Flight** instead of **Launch Mission**. App: no save → Welcome; save with placement done → Galaxy Map.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` — all PASS. **Manual check:** `npm run dev`, play a full mission in the browser on desktop and in iPad responsive mode.
- [ ] **Step 5: Commit** `feat: playable daily mission loop (MVP)`

---

# Phase 4 — Adventure Layer

### Task 17: Art kit and theme

**Files:**
- Create: `src/theme.css`, `src/components/Rocket.tsx`, `Planet.tsx`, `Alien.tsx`, `Asteroid.tsx`, `Starfield.tsx`, `StreakFlame.tsx` (+ css)
- Modify: `src/main.tsx` (import theme and font)
- Test: `src/components/Rocket.test.tsx`

**Interfaces:**
- Produces:
  - `Rocket(p: { parts: readonly string[]; size?: number; state?: 'idle' | 'boost' | 'wobble' })` — draws a base rocket plus one SVG layer per earned part name from `PLANETS[].shipPart`.
  - `Planet(p: { planet: PlanetId; state: 'locked' | 'open' | 'frontier' | 'boss' | 'freed'; size?: number })` — distinct color + surface feature per planet; locked = dark silhouette + padlock icon.
  - `Alien(p: { planet: PlanetId; silhouette?: boolean })`, `Asteroid(p: { shield: number; max: number })` (12 shield segments as arc pieces), `Starfield()` (CSS-animated background, static when reduced motion), `StreakFlame(p: { days: number })`.
- Font: `npm i @fontsource/fredoka`; theme tokens (space navy background, neon accents) as CSS variables; global `@media (prefers-reduced-motion: reduce)` disables transforms/keyframes.

- [ ] **Step 1: Write failing test:** `Rocket` with `parts={['Racing Fins','Wings']}` renders elements with `data-part="Racing Fins"` and `data-part="Wings"` and not `data-part="Antenna"`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** all art components (inline SVG, viewBox-based, scale with `size`).
- [ ] **Step 4: Run tests** — PASS. Manual: view each component on a scratch page in `npm run dev`.
- [ ] **Step 5: Commit** `feat(art): rocket, planets, aliens, asteroid, starfield, theme`

### Task 18: Galaxy Map polish and celebrations

**Files:**
- Modify: `src/screens/GalaxyMap.tsx` (+ css)
- Test: `src/screens/GalaxyMap.test.tsx`

**Interfaces:**
- Consumes: `openPlanets`, `frontierPlanet`, `availableBoss`, `masteredCount`, `Planet`, `Rocket`, `StreakFlame`, `save.celebrated`, `markCelebrated`.

- [ ] **Step 1: Write failing tests:** planet states map correctly (locked/open/frontier/boss/freed via `data-state`); a newly opened planet not in `celebrated.planetsUnlocked` shows "New planet detected: {name}!" once and dispatches `markCelebrated`; all 45 mastered shows "Galaxy Master" once; buttons Star Map, Hangar, Sound, Grown-ups present; the greeting includes `Captain {name}`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** a winding path layout (SVG path, planets at fixed points, scroll vertically on narrow screens).
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(map): galaxy map states, streak and celebrations`

### Task 19: Boss battle screen

**Files:**
- Create: `src/screens/BossScreen.tsx` (+ css)
- Modify: `src/screens/MissionScreen.tsx` (replace boss placeholder)
- Test: `src/screens/BossScreen.test.tsx`

**Interfaces:**
- Consumes: `startBoss`, `nextBossQuestion`, `recordBossAnswer`, `availableBoss`, `Asteroid`, `QuestionCard`, `RepairScreen`.
- Produces: `BossScreen(p: { planet: PlanetId; rng: Rng; onAnswer(factId, ans, activeSeconds): void; onFinish(result: 'won' | 'retreated'): void })`. MissionScreen dispatches `bossBeaten` on `'won'` then advances.

- [ ] **Step 1: Write failing tests:** 12 correct answers → "Planet freed!" and `onFinish('won')`; a wrong answer shows RepairScreen and the shield count rises by 1 (`aria-label "Shield 6 of 12"`); 20 answers without winning → retreat message and `onFinish('retreated')`; no timer element present.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** laser and explosion as CSS animations.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(boss): asteroid boss battles`

### Task 20: Hangar (rewards)

**Files:**
- Create: `src/screens/Hangar.tsx` (+ css)
- Test: `src/screens/Hangar.test.tsx`

**Interfaces:**
- Consumes: `save.bossesBeaten`, `PLANETS`, `Rocket`, `Alien`.

- [ ] **Step 1: Write failing test:** with `bossesBeaten [1, 2]` the rocket shows parts Racing Fins and Nose Cone; aliens Bleep and Twix shown; the planet-3 slot reads "Free Pentaro to unlock".
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Reward = `PLANETS[p-1].shipPart` / `.alienName` for each beaten planet.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(hangar): ship parts and alien crew`

### Task 21: Star Map

**Files:**
- Create: `src/screens/StarMap.tsx`, `src/screens/starLayout.ts` (+ css)
- Test: `src/screens/StarMap.test.tsx`

**Interfaces:**
- Consumes: `starStates`, `masteredCount`, `ALL_FACT_IDS`, `parseFact`.
- Produces: `STAR_POSITIONS: Record<FactId, { x: number; y: number }>` (45 points on a rocket outline, viewBox 0–100).

- [ ] **Step 1: Write failing tests:** 45 star buttons rendered; counter `★ 2 / 45 stars lit` for two level-5 facts; tapping the `3x7` star shows `3 × 7 = 21`; tune-up star labeled "needs a tune-up"; each state has a distinct `data-state` and shape (not color only).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat(starmap): constellation progress view`

### Task 22: Mission Complete polish and sound

**Files:**
- Create: `src/audio/sfx.ts`
- Modify: `src/screens/MissionComplete.tsx`, `QuestScreen.tsx`, `BossScreen.tsx`, `GalaxyMap.tsx` (sound hooks)
- Test: `src/audio/sfx.test.ts`, `src/screens/MissionComplete.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type Sfx = 'correct' | 'lightning' | 'wrong' | 'laser' | 'explosion' | 'launch' | 'celebrate';
  export function unlockAudio(): void;          // create/resume AudioContext on first user gesture
  export function play(sfx: Sfx): void;         // no-op when muted or no AudioContext
  export function setMuted(muted: boolean): void;
  ```
  Mission summary data comes from the mission run: questions answered and lightning count (summed from each step's `onComplete` summary, held in MissionScreen component state), stars lit today (facts with `level === 5 && lastPromotedDay === today`), planets freed today (boss won this mission).

- [ ] **Step 1: Write failing tests:** `play` does nothing (no throw) when `AudioContext` is undefined; muted → no oscillator created (mock AudioContext). MissionComplete shows answered count, ⚡ count, "N new stars", streak flame, and buttons **Back to Galaxy** / **Free Flight**.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** each effect as a short oscillator/gain envelope (≤ 600 ms). Call `unlockAudio` from the first pointerdown/keydown in `App`. Sync `setMuted(!save.settings.soundOn)`.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** `feat: mission summary and synthesized sound effects`

---

# Phase 5 — Parent Area

### Task 23: Parent gate

**Files:**
- Create: `src/screens/ParentGate.tsx` (+ css)
- Test: `src/screens/ParentGate.test.tsx`

**Interfaces:**
- Consumes: `NumberPad` with `maxDigits={4}`, `randInt`.
- Produces: `ParentGate(p: { rng: Rng })` — shows `a × b` with `a, b ∈ [11, 29]`; correct → `navigate('parent')`; wrong → new problem; Close → `navigate('map')`.

- [ ] **Step 1: Write failing tests** (seeded rng): correct product navigates to `parent`; wrong shows a different problem and stays; Close navigates to `map`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(parent): parent gate`

### Task 24: Parent dashboard (grid + summary)

**Files:**
- Create: `src/screens/ParentDashboard.tsx`, `src/components/FactGrid.tsx` (+ css)
- Test: `src/screens/ParentDashboard.test.tsx`

**Interfaces:**
- Consumes: `factId`, `factStats`, `lastNDays`, `masteredCount`, `save`.
- Produces: `FactGrid(p: { facts: Facts; onSelect(id: FactId): void })` — 9×9 table, header row/col 1–9, each cell `data-level`, a level icon (· ○ ◐ ◑ ★) plus color; legend below.

- [ ] **Step 1: Write failing tests:** 81 cells; cells (3,7) and (7,3) both reflect fact `3x7`; level 5 cell shows ★; tapping a cell shows detail with level, attempts, accuracy `75%`, avg time `3.0 s`, last practiced day; summary shows `★ x / 45`, current/best streak, planets freed, 7-day minutes list, total minutes this week.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(parent): progress heatmap and summary`

### Task 25: Backup, reset, and storage notices

**Files:**
- Modify: `src/screens/ParentDashboard.tsx`, `src/App.tsx` (storage banner)
- Test: `src/screens/ParentDashboard.backup.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `downloadSave`, `parseImport`, `importSave`, `resetProgress`, `state.storageOk`, `state.corruptNotice`.

- [ ] **Step 1: Write failing tests:** Export calls `downloadSave`; importing an invalid file shows "That file isn't a Times Table Rocket save" and dispatches nothing; a valid file asks for confirmation then dispatches `importSave`; Reset button enabled only after typing `RESET`; when `storageOk` false the app shows "Progress can't be saved on this device."; when `corruptNotice` true the dashboard shows a one-time notice with Dismiss; dashboard shows the "Add to Home Screen" recommendation.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (file input `accept="application/json,.json"`, read with `file.text()`). **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(parent): backup, import, reset and storage notices`

---

# Phase 6 — Ship It

### Task 26: PWA (offline + home screen)

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` (generated from the Rocket SVG via a small `scripts/make-icons.mjs` using `sharp`, dev dependency)

- [ ] **Step 1: Install** `npm i -D vite-plugin-pwa sharp`.
- [ ] **Step 2: Configure** `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Times Table Rocket', short_name: 'TT Rocket', display: 'standalone', orientation: 'any', background_color: '#0b1030', theme_color: '#0b1030', icons: [...] } })`; add `apple-mobile-web-app-capable` and `apple-touch-icon` tags.
- [ ] **Step 3: Verify** `npm run build && npx vite preview`; in Chrome DevTools → Application: manifest valid, service worker active; toggle Offline and reload → app still loads and plays.
- [ ] **Step 4: Commit** `feat: installable offline PWA`

### Task 27: Accessibility, motion, responsive pass

**Files:**
- Modify: component/screen CSS as needed
- Test: `src/a11y.test.tsx`

- [ ] **Step 1: Write failing test** `src/a11y.test.tsx`: number pad buttons have accessible names; Galaxy Map planets have aria-labels like "Trion, open"; with `matchMedia('(prefers-reduced-motion: reduce)')` mocked true, QuestionCard starts its timer without waiting for `animationend`.
- [ ] **Step 2: Run** — FAIL where missing. **Step 3: Fix.** **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Manual:** check layouts at 375×667, 768×1024, 1024×768, 1920×1080 in DevTools; no horizontal scroll; pad buttons ≥ 64 px; no flashing > 3 per second.
- [ ] **Step 6: Commit** `fix: accessibility, reduced motion, responsive layout`

### Task 28: End-to-end tests

**Files:**
- Create: `playwright.config.ts`, `e2e/first-launch.spec.ts`
- Modify: `package.json` (`"e2e": "playwright test"`)

- [ ] **Step 1: Install** `npm i -D @playwright/test && npx playwright install chromium webkit`.
- [ ] **Step 2: Configure** projects `desktop-chromium` (1280×800) and `ipad-webkit` (`devices['iPad (gen 7)']`), `webServer: { command: 'npm run build && npx vite preview --port 4173', port: 4173 }`.
- [ ] **Step 3: Write tests:** `first launch to first quest` — enter "Leo", answer all 24 Systems Check questions correctly (read the question text, compute the product, tap digits + Go), land on the map, Launch Mission, answer the 5 warm-up questions, reload → still on map with streak/progress persisted and mission resuming at `quest1`. `parent gate opens dashboard` — open Grown-ups, solve the problem, see 81 grid cells.
- [ ] **Step 4: Run** `npm run e2e` — Expected: PASS in both projects.
- [ ] **Step 5: Commit** `test: end-to-end first launch and parent flows`

### Task 29: Deploy and acceptance

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`
- Modify: `vite.config.ts` (`base: process.env.BASE_PATH ?? '/'`)

- [ ] **Step 1: Add workflow:** on push to `main` → `npm ci`, `npm test`, `npm run build` with `BASE_PATH=/<repo-name>/`, deploy `dist` via `actions/deploy-pages`.
- [ ] **Step 2: README:** how to run (`npm run dev`), test, build, and how to "Add to Home Screen" on iPad; note that progress lives on the device and how to export it.
- [ ] **Step 3: Verify** `npm test && npm run build && npm run e2e` all pass locally.
- [ ] **Step 4: Commit** `chore: deploy workflow and README`
- [ ] **Step 5: Hand off to the parent** (needs a GitHub remote they create): push, enable Pages, then run the SPEC §9.2 acceptance checklist on the real iPad and computer.
