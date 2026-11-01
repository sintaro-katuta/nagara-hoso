import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQueue,nextIds} from '../public/player-model.js';
test('a filtered playlist continues only within that list',()=>{
 const all=[{id:'a'},{id:'b'},{id:'c'}];
 const queue=buildQueue([all[0],all[2]],all,'a');
 assert.deepEqual(queue,['a','c']);assert.deepEqual(nextIds(queue,'a'),['c']);
});
test('a featured episode outside the current filter builds a complete queue without duplicates',()=>{
 const all=[{id:'a'},{id:'b'},{id:'b'},{id:'c'}];
 assert.deepEqual(buildQueue([{id:'b'}],all,'a'),['a','b','c']);
});
test('the queue ends without cycling and an unknown selection cannot skip to the first item',()=>{
 assert.deepEqual(nextIds(['a','b'],'b'),[]);assert.deepEqual(nextIds(['a','b'],'missing'),[]);
});
