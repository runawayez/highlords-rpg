const test=require('node:test');const assert=require('node:assert/strict');const {roll}=require('../server');
test('rolagem dentro dos limites',()=>{const r=roll('2d6+3');assert.equal(r.values.length,2);assert.ok(r.total>=5&&r.total<=15)});
test('rejeita dados excessivos e entrada inválida',()=>{assert.throws(()=>roll('31d20'));assert.throws(()=>roll('javascript:evil'))});
