// worker/profanity.js
// Cloudflare Worker profanity filter for initials tags and optional full names

export const BLOCKED_TAGS = new Set([
  'ASS', 'FUK', 'FCK', 'SHT', 'DIC', 'DIK', 'KYS', 'NIG', 'COK', 'TIT',
  'CNT', 'SEX', 'POO', 'WTF', 'PNS', 'KKK', 'NAZ', 'GAY', 'FAG', 'VAG',
  'CUM', 'PEE', 'DIX', 'FUX', 'PUS', 'SLT', 'WHR', 'BCH', 'JIZ', 'PRN',
  'FIK'
]);

export const BLOCKED_WORDS = [
  'anal', 'anus', 'arse', 'asshole', 'bastard', 'bitch', 'blowjob', 'boner',
  'bullshit', 'clit', 'cock', 'coon', 'cunt', 'dick', 'dildo', 'fag', 'faggot',
  'fuck', 'fucker', 'fucking', 'hitler', 'homo', 'jerkoff', 'jizz', 'kike',
  'kys', 'milf', 'nazi', 'nigga', 'nigger', 'penis', 'piss', 'pussy', 'retard',
  'scrotum', 'shit', 'slut', 'smegma', 'spic', 'tits', 'twat', 'vagina', 'wank',
  'whore'
];

export const BLOCKED_PATTERNS = BLOCKED_WORDS.map(w =>
  new RegExp('^' + w.replace(/(.)\1+/g, '$1').split('').map(c => c + '+').join('') + '$')
);

export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  let clean = text.toLowerCase().trim();

  clean = clean
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/\$/g, 's')
    .replace(/5/g, 's')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/8/g, 'b')
    .replace(/7/g, 't');

  return clean;
}

export function isProfaneTag(tag) {
  if (!tag || typeof tag !== 'string') return false;

  // Direct uppercase letters
  const cleanTag = tag.toUpperCase().replace(/[^A-Z]/g, '');
  if (cleanTag.length === 3 && BLOCKED_TAGS.has(cleanTag)) {
    return true;
  }

  // Leetspeak normalized tag (e.g. A55 -> ASS, 5HT -> SHT, D1K -> DIK)
  const leetTag = tag.toUpperCase()
    .replace(/@/g, 'A')
    .replace(/4/g, 'A')
    .replace(/\$/g, 'S')
    .replace(/5/g, 'S')
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/!/g, 'I')
    .replace(/3/g, 'E')
    .replace(/8/g, 'B')
    .replace(/7/g, 'T')
    .replace(/[^A-Z]/g, '');

  if (leetTag.length === 3 && BLOCKED_TAGS.has(leetTag)) {
    return true;
  }

  // Check 7 as Y (e.g. K7S -> KYS)
  const leetTagY = leetTag.replace(/T/g, 'Y');
  if (leetTagY.length === 3 && BLOCKED_TAGS.has(leetTagY)) {
    return true;
  }

  return false;
}

export function isProfaneText(text) {
  if (!text || typeof text !== 'string') return false;
  const normalized = normalizeText(text);
  if (!normalized) return false;

  const words = normalized.split(/[\s_\-\.\,\*\#\/]+/);
  for (const word of words) {
    const strippedWord = word.replace(/[^a-z]/g, '');
    const collapsedWord = strippedWord.replace(/(.)\1+/g, '$1');

    if (
      BLOCKED_WORDS.includes(strippedWord) ||
      BLOCKED_WORDS.includes(collapsedWord) ||
      BLOCKED_PATTERNS.some(p => p.test(strippedWord))
    ) {
      return true;
    }
    if (isProfaneTag(strippedWord) || isProfaneTag(collapsedWord)) {
      return true;
    }
  }

  const compressed = normalized.replace(/[^a-z]/g, '');
  const collapsedCompressed = compressed.replace(/(.)\1+/g, '$1');

  for (const blocked of BLOCKED_WORDS) {
    if (blocked.length >= 4 && (compressed.includes(blocked) || collapsedCompressed.includes(blocked))) {
      return true;
    }
  }

  return false;
}

export function validatePlayerIdentity(tag, fullName) {
  if (tag && isProfaneTag(tag)) {
    return { valid: false, error: '3-letter tag contains disallowed language.' };
  }
  if (fullName && (isProfaneText(fullName) || isProfaneTag(fullName))) {
    return { valid: false, error: 'Full name contains disallowed language.' };
  }
  return { valid: true };
}

export const validate = validatePlayerIdentity;
