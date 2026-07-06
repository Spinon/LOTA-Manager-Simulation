import { spawnSync } from 'node:child_process'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    ...options,
  })

  if (result.error) {
    throw result.error
  }

  return {
    code: result.status ?? 1,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  }
}

function git(args, options = {}) {
  return run('git', args, options)
}

function fail(message, details) {
  console.error(message)
  if (details) console.error(details)
  process.exit(1)
}

const insideWorkTree = git(['rev-parse', '--is-inside-work-tree'])
if (insideWorkTree.code !== 0 || insideWorkTree.stdout !== 'true') {
  fail('Not inside a git worktree.')
}

const branchResult = git(['branch', '--show-current'])
if (branchResult.code !== 0 || !branchResult.stdout) {
  fail('Could not determine the current git branch.', branchResult.stderr)
}

const branch = branchResult.stdout
const upstreamResult = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])
const upstream = upstreamResult.code === 0 && upstreamResult.stdout
  ? upstreamResult.stdout
  : `origin/${branch}`

const fetchResult = git(['fetch', '--prune', 'origin'])
if (fetchResult.code !== 0) {
  fail('Could not fetch origin before sync check.', fetchResult.stderr)
}

const upstreamExists = git(['rev-parse', '--verify', upstream])
if (upstreamExists.code !== 0) {
  fail(`Upstream branch not found: ${upstream}`)
}

const counts = git(['rev-list', '--left-right', '--count', `HEAD...${upstream}`])
if (counts.code !== 0) {
  fail('Could not compare local branch with upstream.', counts.stderr)
}

const [aheadText, behindText] = counts.stdout.split(/\s+/)
const ahead = Number(aheadText)
const behind = Number(behindText)
const dirty = git(['status', '--porcelain'])

console.log(`Branch: ${branch}`)
console.log(`Upstream: ${upstream}`)
console.log(dirty.stdout ? 'Working tree: has local uncommitted changes' : 'Working tree: clean')

if (ahead === 0 && behind === 0) {
  console.log('Sync: local branch is up to date with origin.')
  process.exit(0)
}

if (ahead > 0 && behind === 0) {
  fail(`Sync: local branch is ${ahead} commit(s) ahead of ${upstream}. Push before starting shared work.`)
}

if (ahead === 0 && behind > 0) {
  fail(`Sync: local branch is ${behind} commit(s) behind ${upstream}. Pull before starting work.`)
}

fail(`Sync: local branch has diverged from ${upstream}. Ahead ${ahead}, behind ${behind}. Reconcile before starting work.`)
