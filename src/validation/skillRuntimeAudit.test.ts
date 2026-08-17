import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { buildSkillRuntimeAudit, type SkillRuntimeAudit } from './skillRuntimeAudit.ts'

const audit = buildSkillRuntimeAudit()
const persisted = JSON.parse(readFileSync(new URL('../../tasks/SKILL_RUNTIME_AUDIT.json', import.meta.url), 'utf8')) as SkillRuntimeAudit

assert.equal(audit.sourceHeroCount, 127)
assert.equal(audit.skillCount, 734)
assert.equal(audit.rows.length, 734)
assert.equal(new Set(audit.rows.map((row) => `${row.heroId}:${row.sourceAbilityId}`)).size, 734, 'official ability ids should be unique inside each hero kit')
assert.ok(audit.rows.every((row) => row.families.length >= 3), 'every official skill should have an explicit runtime classification')
assert.ok(audit.rows.every((row) => row.families.some((family) => family.id === 'activation')), 'every skill should declare runtime availability')
assert.ok(audit.rows.every((row) => row.kind === 'passive' || row.families.some((family) => family.id === 'cost_cooldown')), 'every castable skill should declare cost/cooldown support')

const liveFingerprints = audit.rows.map((row) => row.fingerprint).sort()
const persistedFingerprints = persisted.rows.map((row) => row.fingerprint).sort()
assert.deepEqual(
  liveFingerprints,
  persistedFingerprints,
  'the official skill catalog or runtime support classification changed; review and regenerate with npm run audit:skill-runtime',
)

const namedControlValueKeys = ['fearDuration', 'tauntDuration', 'sleepDuration', 'hexDuration', 'disarmDuration', 'breakDuration', 'leashDuration']
namedControlValueKeys.forEach((valueKey) => {
  const rows = audit.rows.filter((row) => row.valueKeys.includes(valueKey))
  assert.ok(rows.length > 0, `${valueKey} should be normalized from at least one official skill`)
  const tag = valueKey.replace('Duration', '').toLowerCase()
  assert.ok(rows.every((row) => row.tags.includes(tag)), `${valueKey} skills should expose the canonical ${tag} runtime tag`)
})

const summonRows = audit.rows.filter((row) => row.families.some((family) => family.id === 'summon'))
const materializedSummons = summonRows.filter((row) => row.families.some((family) => family.id === 'summon' && family.status === 'partial'))
const pendingSummons = summonRows.filter((row) => row.families.some((family) => family.id === 'summon' && family.status === 'missing'))
assert.equal(materializedSummons.length, 33, 'all imported summon triggers should use independent units')
assert.equal(pendingSummons.length, 0, 'event-driven summon triggers should be materialized')

const completeImmunityAbilityIds = audit.rows
  .filter((row) => row.families.some((family) => family.id === 'immunity' && family.status === 'complete'))
  .map((row) => row.sourceAbilityId)
  .sort((left, right) => left - right)
assert.deepEqual(
  completeImmunityAbilityIds,
  [352, 389, 661, 1250, 1392, 1501, 1504, 5014, 5028, 5238, 5249, 5274, 5331, 5429, 5467, 5619, 7852, 7902],
  'rule-level immunity support should stay explicit and source-scoped',
)
for (const piercingOnlyAbilityId of [5468, 5509, 5510, 5581, 8106]) {
  const row = audit.rows.find((candidate) => candidate.sourceAbilityId === piercingOnlyAbilityId)!
  assert.equal(
    row.families.some((family) => family.id === 'immunity'),
    false,
    `${piercingOnlyAbilityId} should not be classified as granting immunity merely because it pierces immunity`,
  )
}

console.log('skill runtime audit tests passed')
