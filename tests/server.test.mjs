import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createApp} from '../server.mjs';
test('upload persists, byte streaming works, invalid uploads and cross origin requests are rejected',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'yorimichi-test-'));
 let app=await createApp({dataDir:dir});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 let base='http://127.0.0.1:'+app.address().port;
 const post=(query,body,headers={})=>fetch(base+'/api/episodes?'+new URLSearchParams(query),{method:'POST',headers:{'Content-Type':'audio/mpeg',...headers},body});
 const params={title:'朝 <&> ラジオ',channel:'tech',duration:'40',description:'<script>hello</script>'};
 const mp3=Buffer.concat([Buffer.from('ID3'),Buffer.alloc(100,17)]);
 try{
  assert.equal((await fetch(base+'/')).status,200);
  assert.equal((await fetch(base+'/player-model.js')).status,200);
  const runtime=await fetch(base+'/flowbite.js');assert.equal(runtime.status,200);assert.match(runtime.headers.get('content-type'),/javascript/);
  assert.equal((await post(params,mp3,{Origin:'https://untrusted.example'})).status,403);
  assert.equal((await post(params,'not audio')).status,415);
  assert.equal((await post({...params,channel:'invalid'},mp3)).status,400);
  assert.equal((await post(params,mp3,{'Content-Type':'text/plain'})).status,415);
  const response=await post(params,mp3);assert.equal(response.status,201);const episode=await response.json();assert.equal(episode.size,mp3.length);
  const other=await Promise.all([post({...params,title:'second'},mp3),post({...params,title:'third'},mp3)]);assert.ok(other.every(r=>r.status===201));
  assert.equal((await (await fetch(base+'/api/episodes')).json()).episodes.length,3);
  const partial=await fetch(base+episode.audio,{headers:{Range:'bytes=10-19'}});assert.equal(partial.status,206);assert.equal((await partial.arrayBuffer()).byteLength,10);assert.equal(partial.headers.get('content-range'),'bytes 10-19/103');
  assert.equal((await fetch(base+episode.audio,{headers:{Range:'bytes=999-'}})).status,416);
  assert.equal((await fetch(base+episode.audio,{method:'HEAD'})).headers.get('content-length'),'103');
  assert.deepEqual(Buffer.from(await (await fetch(base+episode.audio)).arrayBuffer()),mp3);
  const feed=await (await fetch(base+'/feed.xml')).text();assert.ok(feed.includes('朝 &lt;&amp;&gt; ラジオ'));assert.ok(!feed.includes('<script>'));
  assert.equal((await fetch(base+'/data/episodes.json')).status,404);
  const badHost=await new Promise((resolve,reject)=>{const req=http.get(base+'/api/episodes',{headers:{Host:'untrusted.example'}},r=>{r.resume();resolve(r.statusCode);});req.on('error',reject);});
  assert.equal(badHost,403);
  await new Promise(r=>app.close(r));
  app=await createApp({dataDir:dir});await new Promise(r=>app.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.address().port;
  assert.equal((await (await fetch(base+'/api/episodes')).json()).episodes.length,3);
  assert.equal(JSON.parse(await readFile(path.join(dir,'episodes.json'),'utf8')).length,3);
 }finally{await new Promise(r=>app.close(r));await rm(dir,{recursive:true,force:true});}
});
