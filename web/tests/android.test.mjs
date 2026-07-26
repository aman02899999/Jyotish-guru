/**
 * Android source consistency checks.
 *
 * The sandbox has no JVM, so this cannot type-check Kotlin. What it *can* do
 * is catch the class of breakage that actually shipped in this repo before:
 * tests referencing composables that no longer exist, assertions pinned to
 * stale strings, Room entities changed without a version bump, and symbols
 * used in the UI that were never declared in the ViewModel.
 *
 * Run with:  node web/tests/android.test.mjs
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const app = resolve(root, 'app/src');

let pass = 0, fail = 0;
const log = [];
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; log.push(`  ✓ ${name}`); }
  else { fail++; log.push(`  ✗ ${name}  ${detail}`); }
};
const section = (t) => log.push(`\n${t}`);

const read = (p) => readFileSync(resolve(root, p), 'utf8');
const SCREENS = read('app/src/main/java/com/example/ui/Screens.kt');
const VM = read('app/src/main/java/com/example/ui/AstrologyViewModel.kt');
const DB = read('app/src/main/java/com/example/data/Database.kt');
const REPO = read('app/src/main/java/com/example/data/Repository.kt');
const STRINGS = read('app/src/main/res/values/strings.xml');
const GRADLE = read('app/build.gradle.kts');

/** Strip comments and string literals so token scans do not match prose. */
function strip(src) {
  return src
    .replace(/"""[\s\S]*?"""/g, '""')
    .replace(/"(\\.|[^"\\\n])*"/g, '""')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

/* ---------------------------------------------------------------- */
section('Source integrity');

for (const [name, src] of [['Screens.kt', SCREENS], ['AstrologyViewModel.kt', VM], ['Database.kt', DB], ['Repository.kt', REPO]]) {
  const t = strip(src);
  const braces = (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length;
  const parens = (t.match(/\(/g) || []).length - (t.match(/\)/g) || []).length;
  ok(`${name} braces balanced`, braces === 0, `${braces}`);
  ok(`${name} parentheses balanced`, parens === 0, `${parens}`);
}

/* ---------------------------------------------------------------- */
section('Test suite references real symbols');

const testDir = resolve(app, 'test/java/com/example');
const testFiles = readdirSync(testDir).filter((f) => f.endsWith('.kt'));
ok('unit test sources present', testFiles.length >= 3, testFiles.join(', '));

// Regression: GreetingScreenshotTest referenced a `Greeting` composable that
// did not exist anywhere, so the test source set could not compile.
const allMain = [SCREENS, VM, DB, REPO, read('app/src/main/java/com/example/MainActivity.kt')].join('\n');
for (const f of testFiles) {
  const src = read(`app/src/test/java/com/example/${f}`);
  const composables = [...src.matchAll(/^\s*(?:composeTestRule\.setContent\s*\{[\s\S]*?)?\b([A-Z][A-Za-z0-9]*)\s*\(\s*(?:viewModel|"|\))/gm)]
    .map((m) => m[1]);
  const imported = [...src.matchAll(/^import com\.example\.ui\.([A-Z][A-Za-z0-9]*)$/gm)].map((m) => m[1]);
  for (const sym of imported) {
    ok(`${f}: imported '${sym}' is declared in main sources`,
      new RegExp(`fun\\s+${sym}\\s*\\(|class\\s+${sym}\\b`).test(allMain), sym);
  }
}
ok('no test references a non-existent Greeting composable',
  !testFiles.some((f) => /\bGreeting\s*\(/.test(strip(read(`app/src/test/java/com/example/${f}`)))));

/* ---------------------------------------------------------------- */
section('Test assertions match real resources');

const appName = (STRINGS.match(/<string name="app_name">([^<]*)<\/string>/) || [])[1];
ok('app_name defined', !!appName, appName);
const roboTest = read('app/src/test/java/com/example/ExampleRobolectricTest.kt');
const asserted = (roboTest.match(/assertEquals\("([^"]*)",\s*appName\)/) || [])[1];
ok('Robolectric asserts the real app name', asserted === appName, `asserts "${asserted}", actual "${appName}"`);

const appId = (GRADLE.match(/applicationId\s*=\s*"([^"]+)"/) || [])[1];
const instr = read('app/src/androidTest/java/com/example/ExampleInstrumentedTest.kt');
const assertedPkg = (instr.match(/assertEquals\("([^"]*)",\s*appContext\.packageName\)/) || [])[1];
ok('Instrumented test asserts the real applicationId',
  assertedPkg === appId, `asserts "${assertedPkg}", actual "${appId}"`);

/* ---------------------------------------------------------------- */
section('Room schema versioning');

const entityFields = (DB.match(/@Entity\(tableName = "user_profile"\)[\s\S]*?\n\)/) || [''])[0];
const version = +((DB.match(/@Database\([\s\S]*?version\s*=\s*(\d+)/) || [])[1] || 0);
ok('UserProfile entity found', entityFields.length > 50);
ok('database version is set', version > 0, `v${version}`);
// New streak columns must exist together with a bumped version.
const hasStreak = /streakCount|streakBest|streakLastDay|unlockedRewards/.test(entityFields);
ok('streak columns present on UserProfile', hasStreak);
ok('version bumped past the pre-streak schema (v5)', !hasStreak || version >= 6, `v${version}`);
ok('destructive migration configured (no crash on upgrade)',
  /fallbackToDestructiveMigration/.test(DB));

/* ---------------------------------------------------------------- */
section('ViewModel ↔ UI contract');

// Every viewModel.<member> the UI calls must be declared in the ViewModel.
const vmCalls = [...new Set(
  [...strip(SCREENS).matchAll(/viewModel\.([A-Za-z][A-Za-z0-9]*)/g)].map((m) => m[1])
)];
ok('UI calls into the ViewModel', vmCalls.length > 20, `${vmCalls.length} distinct members`);
const missing = vmCalls.filter((m) =>
  !new RegExp(`(fun|val|var)\\s+${m}\\b`).test(VM));
ok('every viewModel member used by the UI is declared',
  missing.length === 0, missing.join(', '));

// Companion/static access used by the UI.
const staticRefs = [...new Set(
  [...strip(SCREENS).matchAll(/AstrologyViewModel\.([A-Z_][A-Z0-9_]*)/g)].map((m) => m[1])
)];
for (const r of staticRefs) {
  ok(`companion member ${r} is declared`,
    new RegExp(`(val|var)\\s+${r}\\b`).test(VM) && /companion object/.test(VM));
}

/* ---------------------------------------------------------------- */
section('New growth features');

ok('touchDailyStreak declared', /fun touchDailyStreak\(/.test(VM));
ok('touchDailyStreak invoked from the UI', /viewModel\.touchDailyStreak\(\)/.test(SCREENS));
ok('referralCodeFor declared', /fun referralCodeFor\(/.test(VM));
ok('referralCodeFor invoked from the UI', /viewModel\.referralCodeFor\(/.test(SCREENS));
ok('StreakReward is a top-level declaration',
  /^data class StreakReward\(/m.test(VM));
ok('STREAK_REWARDS defined in a companion object', /companion object[\s\S]{0,200}STREAK_REWARDS/.test(VM));
ok('four streak milestones', (VM.match(/StreakReward\(\d+,/g) || []).length === 4);
ok('DailyStreakCard composable exists', /@Composable[\s\S]{0,40}fun DailyStreakCard\(/.test(SCREENS));
ok('DailyStreakCard is rendered somewhere', /DailyStreakCard\(viewModel/.test(SCREENS));

// Notification types actually used must exist in the enum.
const notifTypes = [...new Set(
  [...strip(VM).matchAll(/NotificationType\.([A-Z_]+)/g)].map((m) => m[1])
)];
const declared = ((VM.match(/enum class NotificationType\s*\{([\s\S]*?)\}/) || [])[1] || '')
  .split(',').map((x) => x.trim()).filter(Boolean);
const badTypes = notifTypes.filter((t) => !declared.includes(t));
ok('all NotificationType values used are declared',
  badTypes.length === 0, `undeclared: ${badTypes.join(', ')}`);

/* ---------------------------------------------------------------- */
section('Imports cover the new code');

const needed = [
  ['android.widget.Toast', /Toast\.makeText/],
  ['androidx.compose.ui.graphics.drawscope.rotate', /\brotate\(/],
  ['androidx.compose.foundation.verticalScroll', /verticalScroll\(/],
  ['androidx.compose.foundation.rememberScrollState', /rememberScrollState\(/],
  ['androidx.compose.ui.text.font.FontFamily', /FontFamily\./],
  ['androidx.compose.ui.geometry.Offset', /Offset\(/],
];
for (const [imp, usage] of needed) {
  if (!usage.test(strip(SCREENS))) continue;
  const pkg = imp.slice(0, imp.lastIndexOf('.'));
  const has = new RegExp(`^import ${imp.replace(/\./g, '\\.')}$|^import ${pkg.replace(/\./g, '\\.')}\\.\\*$`, 'm').test(SCREENS);
  ok(`import present for ${imp.split('.').pop()}`, has, imp);
}

/* ---------------------------------------------------------------- */
section('Manifest & build');

const manifest = read('app/src/main/AndroidManifest.xml');
ok('MainActivity declared', /MainActivity/.test(manifest));
ok('launcher intent filter present', /android\.intent\.category\.LAUNCHER/.test(manifest));
ok('versionCode set', /versionCode\s*=\s*\d+/.test(GRADLE));
ok('compose enabled', /compose\s*=\s*true/.test(GRADLE));
ok('room compiler wired through ksp', /"ksp"\(libs\.androidx\.room\.compiler\)/.test(GRADLE));

/* ---------------------------------------------------------------- */
console.log(log.join('\n'));
console.log(`\n${'─'.repeat(52)}`);
console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total`);
console.log('─'.repeat(52));
process.exit(fail === 0 ? 0 : 1);
