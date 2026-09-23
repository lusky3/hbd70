// tests/profanity.test.js
// Unit tests for family-friendly arcade profanity filter

import test from 'node:test';
import assert from 'node:assert/strict';
import { isProfaneTag, isProfaneText, isClean, validatePlayerIdentity, validate } from '../src/utils/ProfanityFilter.js';
import { validatePlayerIdentity as workerValidate, validate as workerValidateAlias } from '../worker/profanity.js';

test('ProfanityFilter - Disallows inappropriate 3-letter tags', () => {
  const badTags = ['ASS', 'FUK', 'FCK', 'SHT', 'DIC', 'DIK', 'KYS', 'NIG', 'COK', 'TIT', 'CNT', 'SEX', 'POO', 'WTF'];
  for (const tag of badTags) {
    assert.equal(isProfaneTag(tag), true, `Tag ${tag} should be identified as profane`);
    const validation = validatePlayerIdentity(tag, '');
    assert.equal(validation.valid, false, `Validation should fail for tag ${tag}`);
  }
});

test('ProfanityFilter - Disallows leetspeak 3-letter tags', () => {
  const leetBadTags = ['A55', '5HT', 'D1K', 'K7S', 'P00', 'F1K', 'C0K'];
  for (const tag of leetBadTags) {
    assert.equal(isProfaneTag(tag), true, `Leet tag ${tag} should be identified as profane`);
    const validation = validate(tag, '');
    assert.equal(validation.valid, false, `Validation should fail for leet tag ${tag}`);
  }
});

test('ProfanityFilter - Permits clean 3-letter tags', () => {
  const cleanTags = ['ALL', 'COD', 'CAR', 'DAD', 'MOM', 'AL7', 'WIN', 'LUS', 'USA', 'CAN', 'ALX', 'HBD'];
  for (const tag of cleanTags) {
    assert.equal(isProfaneTag(tag), false, `Tag ${tag} should be allowed`);
    const validation = validatePlayerIdentity(tag, 'Valid Name');
    assert.equal(validation.valid, true, `Validation should pass for tag ${tag}`);
  }
});

test('ProfanityFilter - Disallows vulgar full names, slurs, and repeated characters', () => {
  const badNames = [
    'asshole',
    'Bad Asshole Player',
    'What The Fuck',
    'fucker',
    'little bitch',
    'N1GG3R',
    'f.u.c.k',
    'sh!t head',
    'fuuuuck',
    'shiiiit',
    'biiiitch',
    'puuuussy'
  ];
  for (const name of badNames) {
    assert.equal(isProfaneText(name), true, `Name "${name}" should be identified as profane`);
    assert.equal(isClean(name), false, `Name "${name}" should not be clean`);
    const validation = validatePlayerIdentity('ALL', name);
    assert.equal(validation.valid, false, `Validation should fail for name "${name}"`);
  }
});

test('ProfanityFilter - Disallows multi-word names containing 3-letter vulgarities', () => {
  const badCompoundNames = [
    'FUK YOU',
    'SEX MACHINE',
    'POO FACE',
    'TIT LOVER',
    'WTF GUY',
    'DIC HEAD'
  ];
  for (const name of badCompoundNames) {
    assert.equal(isProfaneText(name), true, `Compound name "${name}" should be identified as profane`);
    const validation = validate('ALL', name);
    assert.equal(validation.valid, false, `Validation should fail for compound name "${name}"`);
  }
});

test('ProfanityFilter - Permits innocent full names and locations', () => {
  const goodNames = [
    'Allan',
    'Allan Lusk',
    'Cody Lusk',
    'Carrie Lusk',
    'Grandpa Al',
    'Parry Sound 1956',
    'Classic Tanks Pro',
    'King City Legend',
    'Space Ace'
  ];
  for (const name of goodNames) {
    assert.equal(isProfaneText(name), false, `Name "${name}" should not be profane`);
    assert.equal(isClean(name), true, `Name "${name}" should be clean`);
    const validation = validatePlayerIdentity('ALL', name);
    assert.equal(validation.valid, true, `Validation should pass for name "${name}"`);
  }
});

test('ProfanityFilter - AC-4 validate alias contract', () => {
  assert.equal(typeof validate, 'function', 'validate function must be exported per AC-4');
  assert.equal(typeof workerValidateAlias, 'function', 'validate function must be exported by worker per AC-4');
  assert.equal(validate('ALL', 'Allan').valid, true);
  assert.equal(validate('ASS', 'Allan').valid, false);
});

test('ProfanityFilter - Worker validation parity', () => {
  assert.equal(workerValidate('ALL', 'Allan Lusk').valid, true);
  assert.equal(workerValidate('ASS', 'Allan Lusk').valid, false);
  assert.equal(workerValidate('A55', 'Allan Lusk').valid, false);
  assert.equal(workerValidate('ALL', 'dirty asshole').valid, false);
  assert.equal(workerValidate('ALL', 'FUK YOU').valid, false);
  assert.equal(workerValidate('ALL', 'fuuuuck').valid, false);
});
