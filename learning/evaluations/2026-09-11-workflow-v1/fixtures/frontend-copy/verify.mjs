import fs from 'node:fs';
import assert from 'node:assert/strict';
const s=fs.readFileSync(new URL('./page.html',import.meta.url),'utf8');
assert.ok(s.includes('立即报名'),'button typo remains');
assert.ok(!s.includes('立即报明'),'old typo remains');
assert.ok(s.includes('id="join"'),'id contract changed');
assert.ok(s.includes('type="button"'),'button behavior changed');
console.log('PASS: text and static button contract only; no browser/visual evidence');
