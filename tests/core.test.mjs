import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRange,metadata,storageEstimate,xml} from '../lib/core.mjs';
test('byte ranges handle seek, suffix and invalid bounds',()=>{
 assert.deepEqual(parseRange('bytes=10-19',100),{start:10,end:19});
 assert.deepEqual(parseRange('bytes=50-',100),{start:50,end:99});
 assert.deepEqual(parseRange('bytes=-20',100),{start:80,end:99});
 assert.deepEqual(parseRange('bytes=90-999',100),{start:90,end:99});
 for(const r of ['bytes=100-','bytes=30-20','bytes=-0','bytes=-','bytes=0-1,3-4','bytes=NaN-'])assert.equal(parseRange(r,100),false);
 assert.equal(parseRange(undefined,100),null);
});
test('metadata rejects invalid channels, titles, duration and source schemes',()=>{
 const p=new URLSearchParams({title:'朝のお話',channel:'life',duration:'30'});
 assert.equal(metadata(p).title,'朝のお話');
 for(const [key,val] of [['title','  '],['channel','other'],['duration','NaN'],['duration','-3'],['source','javascript:alert(1)']]){
  const bad=new URLSearchParams(p);bad.set(key,val);assert.throws(()=>metadata(bad));
 }
});
test('30 minutes at 64 kbps is 14.4 MB and 4 episodes/day for 90 days is 5.184 GB',()=>{
 assert.deepEqual(storageEstimate({}),{bytesPerEpisode:14400000,totalBytes:5184000000,daysWithin10GB:173});
});
test('RSS text is escaped',()=>{assert.equal(xml('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');});
