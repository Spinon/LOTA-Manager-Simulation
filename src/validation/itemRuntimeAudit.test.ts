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
assert.deepEqual(
  chargedItems
    .filter((row) => row.families.some((family) => family.id === 'charges' && family.status === 'complete'))
    .map((row) => row.itemId)
    .sort(),
  ['i001_regen_rations', 'i011_refillable_bottle', 'i012_rain_barrier_drops', 'i068_magic_wand', 'i143_spirit_urn', 'i147_holy_locket_generic', 'i150_war_drums_generic'],
  'all declared charges should use the persistent inventory counter and their matching event path',
)
assert.deepEqual(
  chargedItems
    .filter((row) => row.families.some((family) => family.id === 'charges' && family.status === 'missing'))
    .map((row) => row.itemId)
    .sort(),
  [],
  'no declared item charge should remain disconnected from runtime events',
)

const toggleItems = audit.rows.filter((row) => row.effectKinds.includes('toggle'))
assert.deepEqual(
  toggleItems
    .filter((row) => row.families.some((family) => family.id === 'toggle' && family.status === 'complete'))
    .map((row) => row.itemId)
    .sort(),
  ['i072_attribute_treads', 'i078_armlet_relic', 'i160_revenant_brooch_generic'],
  'all imported toggle items should persist and resolve their selected state',
)
assert.equal(toggleItems.some((row) => row.families.some((family) => family.id === 'toggle' && family.status === 'missing')), false)

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
