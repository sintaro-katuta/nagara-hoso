import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_ENGINE_URL,SPEAKING_RATE,localOrigin,validateScript,resolveVoices,createAivisClient,synthesizeDialogue} from '../lib/aivis.mjs';
import {parseArgs,validateProgram} from '../scripts/synthesize-radio.mjs';

const speakers=[
 {name:'阿井田 茂',speaker_uuid:'shigeru-uuid',styles:[{name:'ノーマル',id:90123456,type:'talk'},{name:'楽しい',id:90123457,type:'talk'}]},
 {name:'まお',speaker_uuid:'mao-uuid',styles:[{name:'ノーマル',id:76543210,type:'talk'}]}
];
function script(){return {voices:{shigeru:{name:'阿井田 茂',speaker_uuid:'shigeru-uuid',styleName:'ノーマル'},mao:{name:'まお',speaker_uuid:'mao-uuid',styleName:'ノーマル'}},turns:[{speaker:'shigeru',text:'おはようございます。',pauseMs:220},{speaker:'mao',text:'おはようございます。今日は散歩の話です。'}]};}
function wav(){const buffer=Buffer.alloc(48);buffer.write('RIFF');buffer.writeUInt32LE(40,4);buffer.write('WAVE',8);return buffer;}
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});

test('only explicit local HTTP origins are accepted',()=>{
 for(const url of [DEFAULT_ENGINE_URL,'http://localhost:10101','http://[::1]:10101/'])assert.ok(localOrigin(url));
 for(const url of ['https://api.aivis-project.com','http://192.168.1.2:10101','http://127.0.0.1.evil.example','file:///tmp/a','http://user:pass@localhost:10101','http://localhost:10101/path','http://localhost:10101/?redirect=https://example.com'])assert.throws(()=>localOrigin(url),/このPC/);
});

test('invalid engine URLs fail before any network request',async()=>{
 let called=false;
 await assert.rejects(synthesizeDialogue(script(),{engine:'https://example.com',fetchImpl:async()=>{called=true;}}),/このPC/);
 assert.equal(called,false);
});

test('voice identities and local style IDs are resolved without assuming Hub style numbers',()=>{
 const voices=resolveVoices(script().voices,speakers);
 assert.equal(voices.shigeru.styleId,90123456);
 assert.equal(voices.mao.styleId,76543210);
 assert.notEqual(voices.shigeru.speaker_uuid,voices.mao.speaker_uuid);
 assert.throws(()=>resolveVoices({...script().voices,mao:{...script().voices.shigeru}},speakers),/同じspeaker_uuid/);
});

test('missing, ambiguous, or mismatching configured voices never fall back',()=>{
 assert.throws(()=>resolveVoices(script().voices,[speakers[0]]),/まお/);
 assert.throws(()=>resolveVoices(script().voices,[...speakers,speakers[0]]),/一意/);
 assert.throws(()=>resolveVoices({...script().voices,mao:{name:'まお',speaker_uuid:'wrong',styleName:'ノーマル'}},speakers),/一意/);
 assert.throws(()=>resolveVoices({...script().voices,shigeru:{name:'阿井田 茂'}},speakers),/styleName/);
 assert.throws(()=>resolveVoices({...script().voices,mao:{name:'まお',styleName:'不明'}},speakers),/スタイル/);
});

test('both configured identities are checked before synthesis begins',async()=>{
 const calls=[];
 await assert.rejects(synthesizeDialogue(script(),{fetchImpl:async url=>{calls.push(String(url));return json([speakers[0]]);}}),/まお/);
 assert.equal(calls.length,1);
 assert.ok(calls[0].endsWith('/speakers'));
});

test('one-person programmes support arbitrary aliases and distinct configured speakers',()=>{
 const solo={voices:{daichi:{name:'阿井田 茂',speaker_uuid:'shigeru-uuid',styleName:'ノーマル'}},turns:[{speaker:'daichi',text:'おはようございます。'},{speaker:'daichi',text:'今日もよろしく。'}]};
 assert.equal(validateScript(solo),solo);
 assert.equal(resolveVoices(solo.voices,speakers).daichi.styleId,90123456);
 assert.throws(()=>validateScript({...solo,turns:[{speaker:'other',text:'こんにちは。'},{speaker:'daichi',text:'はい。'}]}),/voices/);
});

test('dialogue uses two local IDs, preserves the query, and sets only speedScale to 0.95',async()=>{
 const calls=[],turns=[];
 const query={speedScale:1,pitchScale:0.05,intonationScale:1.2,kana:'おはようございます。',prePhonemeLength:0.1,postPhonemeLength:0.1,outputSamplingRate:44100,outputStereo:false};
 await synthesizeDialogue(script(),{fetchImpl:async(url,options)=>{
  const parsed=new URL(url);assert.equal(parsed.origin,DEFAULT_ENGINE_URL);assert.equal(options.redirect,'error');calls.push({url:parsed,options});
  if(parsed.pathname==='/speakers')return json(speakers);
  if(parsed.pathname==='/audio_query')return json(query);
  assert.equal(parsed.pathname,'/synthesis');
  assert.deepEqual(JSON.parse(options.body),{...query,speedScale:SPEAKING_RATE});
  return new Response(wav(),{headers:{'Content-Type':'audio/wav'}});
 },onTurn:async turn=>turns.push(turn)});
 assert.deepEqual(calls.filter(c=>c.url.pathname==='/audio_query').map(c=>c.url.searchParams.get('speaker')),['90123456','76543210']);
 assert.deepEqual(calls.filter(c=>c.url.pathname==='/synthesis').map(c=>c.url.searchParams.get('speaker')),['90123456','76543210']);
 assert.deepEqual(turns.map(t=>t.pauseMs),[220,0]);
 assert.ok(turns.every(t=>Buffer.isBuffer(t.wav)));
});

test('invalid scripts fail before any network request',async()=>{
 const badScripts=[{}, {...script(),turns:[{speaker:'shigeru',text:'ひとりです。'},{speaker:'shigeru',text:'二度目です。'}]}, {...script(),turns:[{speaker:'shigeru',text:''},{speaker:'mao',text:'はい。'}]}, {...script(),turns:[{speaker:'shigeru',text:'はい。',pauseMs:-1},{speaker:'mao',text:'はい。'}]}];
 let called=false;
 for(const value of badScripts)await assert.rejects(synthesizeDialogue(value,{fetchImpl:async()=>{called=true;}}));
 assert.equal(called,false);
 assert.equal(validateScript(script()).turns.length,2);
});

test('engine errors stop immediately instead of generating another voice',async()=>{
 let count=0;
 const client=createAivisClient({fetchImpl:async()=>{count++;return new Response('model unavailable',{status:503});}});
 await assert.rejects(client.synthesize('こんにちは。',{styleId:90123456}),/HTTP 503/);
 assert.equal(count,1);
 const unreachable=createAivisClient({fetchImpl:async()=>{throw new TypeError('fetch failed');}});
 await assert.rejects(unreachable.speakers(),/10101.*モデル/);
 const redirect=createAivisClient({fetchImpl:async(url,options)=>{assert.equal(options.redirect,'error');throw new TypeError('redirect');}});
 await assert.rejects(redirect.speakers(),/接続できません/);
});

test('malformed audio-query JSON and non-WAV synthesis responses are rejected',async()=>{
 const malformed=createAivisClient({fetchImpl:async()=>json(null)});
 await assert.rejects(malformed.synthesize('こんにちは。',{styleId:1}),/音声設定が正しく/);
 let count=0;
 const invalidAudio=createAivisClient({fetchImpl:async()=>++count===1?json({kana:'こんにちは。'}):new Response('not a WAV')});
 await assert.rejects(invalidAudio.synthesize('こんにちは。',{styleId:1}),/正しいWAV/);
});

test('CLI defaults to generation only and rejects incomplete or unknown arguments',()=>{
 assert.deepEqual(parseArgs(['example.json']),{ingest:false,script:'example.json'});
 assert.equal(parseArgs(['example.json','--ingest','--output','radio.mp3']).ingest,true);
 assert.equal(parseArgs(['--help']).help,true);
 assert.equal(parseArgs(['example.json','--program']).program,true);
 for(const args of [[],['example.json','--speed','1'],['example.json','--output'],['a.json','b.json'],['a.json','--radio-url','http://localhost:4317']])assert.throws(()=>parseArgs(args));
});

test('program sections must be complete, contiguous, and have production notes before synthesis',()=>{
 const ids=['opening','free','letter','music','ending'];
 const program={title:'朝のラジオ',turns:ids.map(section=>({section})),sections:ids.map(id=>({id,label:id,direction:'短いジングル'}))};
 assert.equal(validateProgram(program),program);
 assert.throws(()=>validateProgram({...program,turns:[{section:'opening'},{section:'free'},{section:'opening'},...program.turns.slice(2)]}),/この順/);
 assert.throws(()=>validateProgram({...program,turns:program.turns.slice(0,-1)}),/この順/);
 assert.throws(()=>validateProgram({...program,sections:[]}),/sections/);
 assert.throws(()=>validateProgram({...program,title:''}),/title/);
});
