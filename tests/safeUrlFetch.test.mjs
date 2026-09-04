import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parsePublicUrl, assertPublicHost, fetchPublicHtml, isPrivateIPv4, isPrivateIPv6 } = require('../lib/safeUrlFetch.js');

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
const privateLookup = async () => [{ address: '10.0.0.5', family: 4 }];

function response({ status = 200, body = '<html></html>', headers = {} } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => body,
  };
}

test('only plain public http(s) addresses are accepted', () => {
  assert.ok(parsePublicUrl('https://ksp.co.il/item/1'));
  assert.ok(parsePublicUrl('http://example.com'));
  assert.equal(parsePublicUrl('file:///etc/passwd'), null);
  assert.equal(parsePublicUrl('ftp://example.com'), null);
  assert.equal(parsePublicUrl('javascript:alert(1)'), null);
  assert.equal(parsePublicUrl('not a url'), null);
  assert.equal(parsePublicUrl(''), null);
  assert.equal(parsePublicUrl('https://user:pass@example.com'), null, 'credentials in the URL are refused');
});

test('loopback, private and metadata addresses are refused outright', () => {
  for (const value of [
    'http://localhost:8080/admin',
    'http://127.0.0.1/',
    'http://10.0.0.1/',
    'http://192.168.1.1/',
    'http://172.16.0.5/',
    'http://169.254.169.254/latest/meta-data/',
    'http://0.0.0.0/',
    'http://[::1]/',
    'http://printer.local/',
    'http://vault.internal/',
  ]) {
    assert.equal(parsePublicUrl(value), null, `${value} must be refused`);
  }
});

test('the private-range checks cover the ranges they claim to', () => {
  for (const address of ['10.1.2.3', '127.0.0.1', '169.254.169.254', '172.20.1.1', '192.168.0.1', '100.64.0.1', '224.0.0.1', '0.0.0.0']) {
    assert.equal(isPrivateIPv4(address), true, address);
  }
  assert.equal(isPrivateIPv4('93.184.216.34'), false);
  assert.equal(isPrivateIPv4('8.8.8.8'), false);
  assert.equal(isPrivateIPv6('::1'), true);
  assert.equal(isPrivateIPv6('fe80::1'), true);
  assert.equal(isPrivateIPv6('fd00::1'), true);
  assert.equal(isPrivateIPv6('::ffff:127.0.0.1'), true, 'IPv4-mapped loopback');
  assert.equal(isPrivateIPv6('2606:4700::1111'), false);
});

test('a public-looking hostname that resolves to a private address is refused', async () => {
  await assert.rejects(
    () => assertPublicHost(new URL('https://internal.example.com'), { lookup: privateLookup }),
    /PRIVATE_HOST/
  );
  await assert.doesNotReject(() => assertPublicHost(new URL('https://example.com'), { lookup: publicLookup }));
});

test('a redirect into private space is refused instead of followed', async () => {
  const fetchImpl = async () => response({ status: 302, headers: { location: 'http://169.254.169.254/' } });
  await assert.rejects(
    () => fetchPublicHtml('https://example.com/deal', { fetchImpl, lookup: publicLookup }),
    /BAD_REDIRECT/
  );
});

test('a public redirect is followed, and the landed URL is what comes back', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    return seen.length === 1
      ? response({ status: 301, headers: { location: 'https://example.com/final' } })
      : response({ body: '<html>ok</html>', headers: { 'content-type': 'text/html' } });
  };
  const result = await fetchPublicHtml('https://example.com/start', { fetchImpl, lookup: publicLookup });
  assert.equal(result.url, 'https://example.com/final');
  assert.equal(result.html, '<html>ok</html>');
  assert.equal(seen.length, 2);
});

test('a redirect loop stops instead of spinning', async () => {
  const fetchImpl = async () => response({ status: 302, headers: { location: 'https://example.com/again' } });
  await assert.rejects(
    () => fetchPublicHtml('https://example.com/a', { fetchImpl, lookup: publicLookup, maxRedirects: 2 }),
    /TOO_MANY_REDIRECTS/
  );
});

test('non-HTML responses are not parsed as pages', async () => {
  const fetchImpl = async () => response({ headers: { 'content-type': 'application/pdf' } });
  await assert.rejects(
    () => fetchPublicHtml('https://example.com/x.pdf', { fetchImpl, lookup: publicLookup }),
    /NOT_HTML/
  );
});

test('an error status is reported, not returned as an empty page', async () => {
  const fetchImpl = async () => response({ status: 403, headers: { 'content-type': 'text/html' } });
  await assert.rejects(() => fetchPublicHtml('https://example.com/x', { fetchImpl, lookup: publicLookup }), /HTTP_403/);
});
