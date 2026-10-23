import test from 'node:test';
import assert from 'node:assert/strict';
import {opaqueToken,hashToken,validToken,safeHttpUrl} from '../../src/lib/security.ts';
test('sessions use unique random opaque tokens and persist only non-reversible hashes',()=>{const token=opaqueToken(),other=opaqueToken();assert.equal(validToken(token),true);assert.notEqual(token,other);assert.equal(hashToken(token).length,64);assert.notEqual(hashToken(token),token);assert.equal(hashToken(token),hashToken(token));assert.equal(validToken('demo-user'),false);});
test('URL handling rejects executable and credential-bearing links',()=>{assert.equal(safeHttpUrl('javascript:alert(1)'),null);assert.equal(safeHttpUrl('https://user:password@example.com'),null);assert.equal(safeHttpUrl('https://example.com/job'),'https://example.com/job');});
