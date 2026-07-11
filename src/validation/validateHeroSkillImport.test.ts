import assert from 'node:assert/strict'
import { validateHeroSkillImport } from './validateHeroSkillImport.ts'

const result = validateHeroSkillImport()
assert.equal(result.valid, true, result.errors.join('\n'))
assert.equal(result.heroCount, 127)
assert.equal(result.abilityCount, 734)

console.log('official hero skill import validation passed')
