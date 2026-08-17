import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { buildItemRuntimeAudit, type ItemRuntimeAudit } from './itemRuntimeAudit.ts'

const audit = buildItemRuntimeAudit()
const persisted = JSON.parse(readFileSync(new URL('../../tasks/ITEM_RUNTIME_AUDIT.json', import.meta.url), 'utf8')) as ItemRuntimeAudit

assert.equal(audit.sourceItemCount, 210)
assert.equal(audit.rows.length, 210)
assert.equal(new Set(audit.rows.map((row) => row.itemId)).size, 210, 'item ids should be unique')
assert.ok(audit.effectCount > 300, 'the audit should cover the full effect catalog')
assert.ok(audit.rows.every((row) => row.families.length >= 5), 'every item should declare support across its runtime lifecycle')
assert.ok(audit.rows.every((row) => row.families.some((family) => family.id === 'catalog')), 'every item should declare catalog support')
assert.ok(audit.rows.every((row) => row.families.some((family) => family.id === 'stats')), 'every item should declare stat support')

const liveFingerprints = audit.rows.map((row) => row.fingerprint).sort()
const persistedFingerprints = persisted.rows.map((row) => row.fingerprint).sort()
assert.deepEqual(
  liveFingerprints,
  persistedFingerprints,
  'the item catalog or runtime classification changed; review and regenerate with npm run audit:item-runtime',
)

const chargedItems = audit.rows.filter((row) => row.families.some((family) => family.id === 'charges'))
assert.ok(chargedItems.length > 0, 'charged items should remain visible in the implementation queue')
assert.ok(chargedItems.every((row) => row.families.some((family) => family.id === 'charges' && family.status === 'missing')))

const neutralItems = audit.rows.filter((row) => row.slot === 'neutral' || row.slot === 'neutral_enchantment')
assert.ok(neutralItems.length > 0)
assert.ok(neutralItems.every((row) => row.families.some((family) => family.id === 'acquisition' && family.status === 'missing')))

const activeItemsWithResourceCost = audit.rows.filter((row) => (
  row.valueKeys.includes('manaCost') || row.valueKeys.includes('healthCost')
))
assert.ok(activeItemsWithResourceCost.length > 0)
assert.ok(
  activeItemsWithResourceCost.every((row) => row.families.some((family) => family.id === 'resource_cost' && family.status === 'complete')),
  'active mana/health costs should use the shared payment path',
)

console.log('item runtime audit tests passed')
