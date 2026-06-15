const { timingSafeEqual } = require('node:crypto');

function getAdminToken(req) {
  const authorization = String(req.headers.authorization || '');
  if (authorization.startsWith('Bearer ')) return authorization.slice(7).trim();
  return String(req.headers['x-admin-token'] || '').trim();
}

function secretsMatch(candidate, expected) {
  if (!candidate || !expected) return false;
  const left = Buffer.from(String(candidate));
  const right = Buffer.from(String(expected));
  return left.length === right.length && timingSafeEqual(left, right);
}

module.exports = { getAdminToken, secretsMatch };
