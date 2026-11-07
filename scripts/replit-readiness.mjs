#!/usr/bin/env node
// Standalone, dependency-free Git snapshot. Safe to run via `git show ... | node`.
// No fetch, checkout, merge, reset, install, hooks, build, DB access or writes.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MAIN = 'refs/remotes/origin/main';
const CANDIDATE = 'refs/remotes/origin/codex/yoki-yoki-3-world';

/** @param {string[]} args @param {boolean} [optional] */
function git(args, optional = false) {
  const result = spawnSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', ...args], {
    encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  if (result.error || result.status !== 0) {
    if (optional && !result.error && (result.status === 1 || result.status === 128)) return null;
    // Git stderr can include credential-bearing remote URLs. Do not echo it.
    throw Error(`Gitの確認に失敗しました（${args[0]}）。リポジトリ内のShellで実行してください。`);
  }
  return result.stdout;
}

/** @param {string} ref */
function revision(ref) {
  const sha = git(['rev-parse', '--verify', `${ref}^{commit}`], true)?.trim();
  if (!sha) return null;
  return { ref, sha, committedAt: git(['show', '-s', '--format=%cI', sha])?.trim() };
}

/** @param {string | undefined} left @param {string | undefined} right @param {boolean} shallow */
function compare(left, right, shallow) {
  if (!left || !right) return { relation: 'missing_ref', leftOnly: null, rightOnly: null };
  if (left === right) return { relation: 'same', leftOnly: 0, rightOnly: 0 };
  // A shallow clone can falsely appear unrelated. Require full history first.
  if (shallow) return { relation: 'incomplete_history', leftOnly: null, rightOnly: null };
  if (!git(['merge-base', left, right], true)?.trim()) return { relation: 'unrelated', leftOnly: null, rightOnly: null };
  const counts = git(['rev-list', '--left-right', '--count', `${left}...${right}`])?.trim().split(/\s+/).map(Number);
  if (!counts || counts.length !== 2 || counts.some(n => !Number.isSafeInteger(n))) throw Error('履歴の比較結果を読み取れませんでした。');
  const [leftOnly, rightOnly] = counts;
  return { relation: leftOnly && rightOnly ? 'diverged' : leftOnly ? 'left_ahead' : 'right_ahead', leftOnly, rightOnly };
}

/** @param {string} porcelain */
function parseChanges(porcelain) {
  const entries = porcelain.split('\0'), changes = [];
  for (let i = 0; i < entries.length; i++) {
    if (!entries[i]) continue;
    const status = entries[i].slice(0, 2), path = entries[i].slice(3);
    const originalPath = /[RC]/.test(status) ? entries[++i] : undefined;
    changes.push({ status, path, ...(originalPath ? { originalPath } : {}),
      staged: status !== '??' && status[0] !== ' ',
      unstaged: status !== '??' && status[1] !== ' ',
      untracked: status === '??',
      conflicted: ['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(status),
    });
  }
  return changes;
}

function inspect() {
  const root = git(['rev-parse', '--show-toplevel'])?.trim();
  if (!root) throw Error('Gitリポジトリが見つかりません。');
  const branch = git(['symbolic-ref', '--quiet', '--short', 'HEAD'], true)?.trim() || null;
  const current = revision('HEAD'), main = revision(MAIN), candidate = revision(CANDIDATE);
  if (!current) throw Error('現在のコミットを読み取れません。');
  const upstreamRef = branch ? git(['rev-parse', '--symbolic-full-name', '@{upstream}'], true)?.trim() : null;
  const upstream = upstreamRef ? revision(upstreamRef) : null;
  const shallow = git(['rev-parse', '--is-shallow-repository'])?.trim() === 'true';
  const changes = parseChanges(git(['status', '--porcelain=v1', '-z', '--untracked-files=normal']) || '');
  const operations = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'BISECT_LOG', 'index.lock']
    .filter(name => { const file = git(['rev-parse', '--git-path', name])?.trim(); return file && existsSync(resolve(file)); });
  const configPath = resolve(root, '.replit');
  const postMergeConfigured = existsSync(configPath) && /^\s*\[postMerge\]\s*$/m.test(readFileSync(configPath, 'utf8'));
  const currentToCandidate = compare(current.sha, candidate?.sha, shallow);
  const mainToCandidate = compare(main?.sha, candidate?.sha, shallow);
  const currentToUpstream = compare(current.sha, upstream?.sha, shallow);
  const missingRefs = [!main && MAIN, !candidate && CANDIDATE].filter(Boolean);
  const reasons = [];
  if (missingRefs.length) reasons.push('参照が不足しています。先に origin の main と codex/yoki-yoki-3-world を fetch してください。');
  if (shallow) reasons.push('浅い履歴のため、異なるコミット間の取り込み可否を判定できません。');
  if (!branch) reasons.push('detached HEADです。元の作業ブランチを確認してください。');
  if (operations.length || changes.some(c => c.conflicted)) reasons.push('進行中のGit操作・競合があります。現在の作業を保存してから照合してください。');
  if (changes.length) reasons.push('未コミットの変更があります。取り込み前に内容を確認し、必要な変更を保全してください。');
  if (!upstream) reasons.push('現在のブランチの追跡先が不明です。未送信コミットの有無は断定できません。');
  if ((currentToUpstream.leftOnly ?? 0) > 0) reasons.push('現在のコミットに、追跡先へ反映されていない履歴があります。');
  if (['left_ahead', 'diverged', 'unrelated'].includes(currentToCandidate.relation)) reasons.push('現在の履歴に候補ブランチだけでは保持できない変更があります。上書きせず差分を照合してください。');
  if (['left_ahead', 'diverged', 'unrelated'].includes(mainToCandidate.relation)) reasons.push('候補ブランチに main の履歴がすべて含まれているとは確認できません。');
  if (postMergeConfigured) reasons.push('ReplitのpostMerge設定があります。取り込み時のスクリプト処理を確認してください。このツールは実行していません。');
  // Confirm the snapshot was not taken across a concurrent checkout/commit.
  const consistent = revision('HEAD')?.sha === current.sha &&
    revision(MAIN)?.sha === main?.sha && revision(CANDIDATE)?.sha === candidate?.sha &&
    (git(['symbolic-ref', '--quiet', '--short', 'HEAD'], true)?.trim() || null) === branch;
  if (!consistent) reasons.push('確認中にGitの参照が変わりました。Git操作が終わってから再実行してください。');
  return {
    schemaVersion: 1, capturedAt: new Date().toISOString(), consistent,
    branch, current, main, candidate, upstream,
    comparisons: { currentToCandidate, mainToCandidate, currentToUpstream },
    shallow, missingRefs, operations,
    workingTree: { clean: changes.length === 0, count: changes.length, changes },
    postMergeConfigured, reviewNotes: reasons,
    scope: '読み取り専用のGit照合です。参照はローカルにfetch済みの情報であり、本番ログイン・DB・ネイティブ動作・リリース可否は判定しません。',
  };
}

try {
  console.log(JSON.stringify(inspect(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Git状態を確認できませんでした。');
  process.exitCode = 1;
}
