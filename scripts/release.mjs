#!/usr/bin/env node
/**
 * Cut a release: bump the version, sync the lockfile, tag, push, and create a
 * GitHub release from the CHANGELOG entry.
 *
 * Usage:
 *   npm run release -- patch|minor|major [--title "…"] [--dry-run]
 *                                         [--no-push] [--no-release]
 *
 * Before running, add the CHANGELOG section for the version you are about to
 * cut and leave it uncommitted; it rides the release commit. The working tree
 * must otherwise be clean, on `main`, with a free tag.
 *
 * The script stops at the first failure and prints what already happened, so a
 * half-finished release can be completed by hand.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Compute the next version.
 * @param {string} current - the current `X.Y.Z`.
 * @param {string} bump - `patch`, `minor`, `major`, or an explicit `X.Y.Z`.
 * @returns {string} the next version.
 */
export function nextVersion(current, bump) {
  const match = SEMVER.exec(current);
  if (match === null) throw new Error(`package.json version "${current}" is not X.Y.Z`);
  const [, major, minor, patch] = match.map(Number);
  if (SEMVER.test(bump)) return bump;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'major') return `${major + 1}.0.0`;
  throw new Error(`"${bump}" is not a bump (patch, minor, major) or an X.Y.Z version`);
}

/**
 * Extract one version's section body from the changelog.
 * @param {string} text - the changelog.
 * @param {string} version - the version to look for.
 * @returns {string | undefined} the body without the heading, when present.
 */
export function changelogSection(text, version) {
  const marker = `## [${version}]`;
  const start = text.indexOf(marker);
  if (start === -1) return undefined;
  const next = text.indexOf('\n## [', start + marker.length);
  const section = text.slice(start, next === -1 ? text.length : next);
  return section.split('\n').slice(1).join('\n').trim();
}

function run(command, args, { inherit = false } = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
  }).trim();
}

function tryRun(command, args) {
  try {
    run(command, args);
    return true;
  } catch {
    return false;
  }
}

function usage() {
  console.log(
    [
      'Usage: npm run release -- <patch|minor|major|X.Y.Z> [options]',
      '',
      'Options:',
      '  --title <text>   GitHub release title (default: the tag)',
      '  --dry-run        validate and print the plan, change nothing',
      '  --no-push        commit and tag locally, do not push',
      '  --no-release     skip `gh release create`',
    ].join('\n'),
  );
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const noPush = argv.includes('--no-push');
  const noRelease = argv.includes('--no-release');
  const titleIndex = argv.indexOf('--title');
  const title = titleIndex === -1 ? undefined : argv[titleIndex + 1];
  const bump = argv.find((arg, index) => !arg.startsWith('--') && index !== (titleIndex === -1 ? -1 : titleIndex + 1));

  if (bump === undefined) {
    usage();
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const current = pkg.version;
  const next = nextVersion(current, bump);
  const tag = `v${next}`;

  const changed = run('git', ['diff', '--name-only', 'HEAD']).split('\n');
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard']).split('\n');
  const dirty = [...new Set([...changed, ...untracked].map((path) => path.trim()).filter((path) => path !== ''))];
  const unexpected = dirty.filter((path) => path !== 'CHANGELOG.md');
  if (unexpected.length > 0) {
    throw new Error(
      `working tree has changes outside CHANGELOG.md:\n  ${unexpected.join('\n  ')}\n` +
        'Commit or stash them first; only the changelog entry may ride the release commit.',
    );
  }

  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== 'main') throw new Error(`releases are cut from main, not ${branch}`);

  if (tryRun('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`])) {
    throw new Error(`tag ${tag} already exists`);
  }

  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  const notes = changelogSection(changelog, next);
  if (notes === undefined) {
    throw new Error(
      `CHANGELOG.md has no "## [${next}]" section.\n` +
        'Write the entry first (Added / Changed / Fixed), then run this again.',
    );
  }

  if (dryRun) {
    console.log(
      [
        'Release plan',
        `  current    ${current}`,
        `  next       ${next}`,
        `  tag        ${tag} (free)`,
        `  changelog  ## [${next}] found (${notes.split('\n').length} lines)`,
        '  steps      npm test → bump package.json + lock → commit → tag → push → gh release',
        '',
        'Dry run: nothing changed.',
      ].join('\n'),
    );
    return;
  }

  console.log(`release ${current} → ${next}`);
  console.log('running the test suite…');
  run('npm', ['test'], { inherit: true });

  pkg.version = next;
  writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
  run('npm', ['install', '--package-lock-only', '--no-audit', '--no-fund'], { inherit: true });

  run('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md']);
  run('git', ['commit', '-m', `chore(release): ${tag}`], { inherit: true });
  run('git', ['tag', '-a', tag, '-m', tag]);

  if (!noPush) {
    try {
      run('git', ['push', 'origin', 'main'], { inherit: true });
      run('git', ['push', 'origin', tag], { inherit: true });
    } catch {
      console.error(
        `\npush failed. The commit and ${tag} exist locally; finish with:\n` +
          '  git push origin main\n' +
          `  git push origin ${tag}`,
      );
      process.exit(1);
    }
  }

  if (!noRelease) {
    const notesFile = join(mkdtempSync(join(tmpdir(), 'dayflow-release-')), 'notes.md');
    writeFileSync(notesFile, `${notes}\n`);
    try {
      run('gh', ['release', 'create', tag, '--title', title ?? tag, '--notes-file', notesFile], {
        inherit: true,
      });
    } catch {
      console.error(
        `\ngh release create failed. The tag is pushed; publish the notes by hand:\n` +
          `  gh release create ${tag} --notes-file ${notesFile}`,
      );
      process.exit(1);
    }
  }

  console.log(`\nreleased ${tag}`);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(`release: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
