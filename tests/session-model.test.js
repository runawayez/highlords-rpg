const {test}=require('node:test'),assert=require('node:assert/strict');
const {emptyTabletop,emptySceneTable,validTabletop,projectedTabletop,placeTableFormation,calculateGridAlignment}=require('../p2p/assets/session-model.js');
const {viewDelta,mergeViewDelta}=require('../p2p/assets/sync.js');
test('tabletop accepts legacy absence and bounds notes, libraries, combat and unsafe IDs',()=>{
 assert.equal(validTabletop(undefined),true);const invalid=emptyTabletop();invalid.library.maps=[null];assert.equal(validTabletop(invalid),false);const t=emptyTabletop();t.scenes.scene=emptySceneTable();assert.equal(validTabletop(t),true);
 t.scenes.scene.notes='a'.repeat(20001);assert.equal(validTabletop(t),false);t.scenes.scene.notes='secret';t.scenes.scene.combat.index=1;assert.equal(validTabletop(t),false);
 t.scenes.scene.combat.index=0;t.scenes.scene.pins=[{id:'pin',title:'Room',text:'note',shared:false,x:1,y:1}];assert.equal(validTabletop(t),true);
 t.scenes.scene.pins.push({...t.scenes.scene.pins[0]});assert.equal(validTabletop(t),false);assert.equal(validTabletop({...emptyTabletop(),scenes:JSON.parse('{"__proto__":{}}')}),false);
});
test('recipient projection removes library, notes, unshared pins and hidden initiative without disclosing turn',()=>{
 const tabletop=emptyTabletop(),scene=emptySceneTable();tabletop.scenes.s=scene;scene.notes='secret';scene.pins=[{id:'hidden',title:'trap',text:'secret',x:1,y:1,shared:false},{id:'public',title:'door',text:'known',x:1,y:1,shared:true}];scene.combat={entries:[{id:'monster',value:20},{id:'hero',value:10}],index:0,active:true,round:2,expression:'1d20'};
 const view=projectedTabletop({activeSceneId:'s',tabletop},[{id:'hero'}]);assert.equal(JSON.stringify(view).includes('secret'),false);assert.deepEqual(view.scenes.s.combat.entries,[{id:'hero',value:10}]);assert.equal(view.scenes.s.combat.active,false);assert.equal(validTabletop(view),true);
});
test('encounter placement scales formation and clamps all tokens inside the board',()=>{
 const placed=placeTableFormation([{size:56,x:0,y:0},{size:56,x:60,y:120}],60,120,{x:50,y:50},800,600);assert.equal(placed[1].x,170);assert.equal(placed[1].y,290);
 const edge=placeTableFormation([{size:120,x:800,y:-900}],60,120,{x:0,y:0},240,240)[0];assert.equal(edge.x,120);assert.equal(edge.y,0);
 assert.deepEqual(calculateGridAlignment({x:125,y:190},{x:245,y:190},2),{size:60,originX:5,originY:10});assert.equal(calculateGridAlignment({x:0,y:0},{x:2,y:0}),null);
});
test('movement deltas omit unchanged image and unrelated tokens and round-trip exactly',()=>{
 const before={campaignId:'c',activeSceneId:'s',map:'large-map'.repeat(1000),tokens:[{id:'a',x:0},{id:'b',x:20}],characters:[],chat:[]};const after=structuredClone(before);after.tokens[0].x=30;
 const delta=viewDelta(before,after,3,4);assert.equal(JSON.stringify(delta).includes('large-map'),false);assert.equal(delta.tokens.put.length,1);assert.ok(JSON.stringify(delta).length<JSON.stringify(after).length/10);assert.deepEqual(mergeViewDelta(before,delta,3),after);assert.equal(mergeViewDelta(before,delta,2),null);
});
test('permission removal drops the token and sheet; malformed and prototype delta keys fail closed',()=>{
 const before={campaignId:'c',activeSceneId:'s',tokens:[{id:'a'}],characters:[{id:'sheet',text:'private'}]},after={...before,tokens:[],characters:[]};const delta=viewDelta(before,after,1,2);
 assert.deepEqual(mergeViewDelta(before,delta,1),after);delta.changes=JSON.parse('{"__proto__":{"polluted":true}}');assert.equal(mergeViewDelta(before,delta,1),null);
 delta.changes={};delta.tokens.order=['a','a'];assert.equal(mergeViewDelta(before,delta,1),null);assert.equal({}.polluted,undefined);
});

test('sequence gaps reject deltas even when campaign revision has not changed',()=>{
 const before={campaignId:'c',activeSceneId:'s',tokens:[],participants:[]},after={...before,participants:[{id:'a'}]},delta=viewDelta(before,after,2,2);delta.baseSequence=5;delta.syncSequence=6;
 assert.equal(mergeViewDelta(before,delta,2,4),null);assert.deepEqual(mergeViewDelta(before,delta,2,5),after);
});

test('editing a numeric sheet field does not retransmit an unchanged portrait',()=>{
 const previous={campaignId:'c',activeSceneId:'s',tokens:[],characters:[{id:'sheet',name:'Hero',fields:[{id:'portrait',type:'portrait',value:'data:image/png;base64,'+'A'.repeat(10000)},{id:'hp',type:'number',value:'20',version:1}]}]};const next=structuredClone(previous);next.characters[0].fields[1].value='19';next.characters[0].fields[1].version=2;
 const delta=viewDelta(previous,next,1,2);assert.equal(JSON.stringify(delta).includes('data:image'),false);assert.deepEqual(mergeViewDelta(previous,delta,1),next);
});
