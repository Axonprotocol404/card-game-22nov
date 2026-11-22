// make.fun best-card-game-20261122-1826 entry program.
//
// A Node 22, standard-library-only program that prepares the entry's output
// directory: it copies game/ and screenshots/ into $MAKEFUN_OUTPUT_DIR
// (default /output) and writes dossier.json from buildDossier of
// vendor/makefun-game.ts, using the bounty's gate caps. It prints a banner
// log, does light validation, and exits non-zero when anything refuses.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { buildDossier, DOSSIER_SCHEMA } from './vendor/makefun-game.ts';

// The bounty's gate.json caps (vendor/makefun-game.ts header, best-game-01).
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
} as const;

const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const root = resolve(import.meta.dirname ?? '.');

function banner(label: string): void {
  console.log(`== make.fun entry: ${label}`);
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...listFiles(join(dir, e.name)));
    else if (e.isFile()) out.push(join(dir, e.name));
  }
  return out;
}

function lightValidation(dir: string): string[] {
  const problems: string[] = [];
  const gameIndex = join(dir, 'game', 'index.html');
  if (!existsSync(gameIndex)) problems.push('missing game/index.html in output');
  const shots = join(dir, 'screenshots');
  if (!existsSync(shots) || !statSync(shots).isDirectory()) {
    problems.push('missing screenshots/ directory in output');
  } else {
    const images = readdirSync(shots).filter((n) => /\.(png|jpe?g)$/i.test(n));
    if (images.length < 3 || images.length > CAPS.screenshots.max) {
      problems.push(`screenshots/ holds ${images.length} images, expected 3..${CAPS.screenshots.max}`);
    }
  }
  return problems;
}

function main(): number {
  banner('copying entry into output');
  // A stale output dir must not leak old files into the hand-in: replace game/
  // and screenshots/ wholesale, keeping any other content of the output dir.
  rmSync(join(outputDir, 'game'), { recursive: true, force: true });
  rmSync(join(outputDir, 'screenshots'), { recursive: true, force: true });
  rmSync(join(outputDir, 'dossier.json'), { force: true });
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(root, 'game'), join(outputDir, 'game'), { recursive: true });
  cpSync(join(root, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

  const gameFiles = listFiles(join(outputDir, 'game'));
  const shots = listFiles(join(outputDir, 'screenshots'));
  console.log(`[entry] copied game/ (${gameFiles.length} files) and screenshots/ (${shots.length} files) to ${outputDir}`);

  const problems = lightValidation(outputDir);
  if (problems.length > 0) {
    for (const p of problems) console.error(`[entry] validation: ${p}`);
    return 1;
  }

  banner('writing dossier.json');
  const dossier = buildDossier(outputDir, { ...CAPS });
  const dossierPath = join(outputDir, 'dossier.json');
  writeFileSync(dossierPath, dossier);
  // Round-trip check: the dossier must parse as canonical JSON with the
  // expected schema, a cover index, and at least the three screenshots.
  const parsed = JSON.parse(new TextDecoder('utf-8').decode(dossier)) as { schema?: string; cover?: number; images?: unknown[] };
  if (parsed.schema !== DOSSIER_SCHEMA || parsed.cover !== 0 || (parsed.images?.length ?? 0) < 3) {
    console.error(`[entry] validation: dossier.json is not a sound ${DOSSIER_SCHEMA} document`);
    return 1;
  }
  console.log(`[entry] wrote ${dossierPath} (${dossier.length} bytes, schema ${DOSSIER_SCHEMA}, ${parsed.images!.length} images)`);

  banner('done');
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  console.error(`[entry] failed: ${(err as Error).message}`);
  process.exitCode = 1;
}
