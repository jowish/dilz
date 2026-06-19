const BLOCKED_PATTERNS = [
  /\b(?:kill yourself|kys|nazi|terrorist threat)\b/i,
  /\b(?:porn|child sexual|rape)\b/i,
  /(?:תתאבד|נאצי|פורנו|אונס)/i,
];

const REPEATED_LINK = /(?:https?:\/\/\S+.*){4,}/i;

function moderateUserText(value) {
  const text = String(value || '').trim();
  if (!text) return { allowed: true, reason: null };
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(text))) {
    return { allowed: false, reason: 'This content violates the Dilz community rules.' };
  }
  if (REPEATED_LINK.test(text)) {
    return { allowed: false, reason: 'Too many links. Please remove spam-like content.' };
  }
  return { allowed: true, reason: null };
}

function moderateFields(values) {
  for (const value of values) {
    const result = moderateUserText(value);
    if (!result.allowed) return result;
  }
  return { allowed: true, reason: null };
}

module.exports = { moderateUserText, moderateFields };
