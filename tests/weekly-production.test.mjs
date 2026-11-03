import test from 'node:test';
import assert from 'node:assert/strict';
import {japaneseDate,afterRelease,beforeProduction,makeScript} from '../lib/weekly-production.mjs';

test('production and release use Japan time',()=>{
 assert.equal(japaneseDate(new Date('2026-11-01T15:05:00Z')),'2026-11-02');
 assert.equal(beforeProduction(new Date('2026-11-01T20:59:00Z')),true);
 assert.equal(beforeProduction(new Date('2026-11-01T21:00:00Z')),false);
 assert.equal(afterRelease(new Date('2026-11-01T21:59:00Z')),false);
 assert.equal(afterRelease(new Date('2026-11-01T22:00:00Z')),true);
});
test('generated script is bound to the day’s cast and malformed drafts fail',()=>{
 const turns=Array.from({length:8},(_,i)=>({speaker:i%2?'tsumugi':'ayumu',text:'あしたのお話です。'.repeat(8)}));
 const draft={topic:'小さな発見',description:'朝の小さな話です。',turns};
 const s=makeScript('2026-11-02',draft);
 assert.deepEqual(Object.keys(s.voices),['ayumu','tsumugi']);
 assert.equal(s.voices.tsumugi.name,'まい');
 const spoken=makeScript('2026-11-02',{...draft,turns:turns.map(t=>({...t,text:t.text+'長谷川歩です。歩さん、真鍋紬さん。'}))});
 assert.match(spoken.turns[0].text,/はせがわあゆむです。あゆむさん、まなべつむぎさん。/);
 const wed={topic:'音楽',description:'音楽の話です。',turns:Array.from({length:8},(_,i)=>({speaker:i%2?'tomoshibi':'ritsu',text:'曲のお話をします。'.repeat(8)+'朝比奈灯です。灯さん。'}))};
 assert.match(makeScript('2026-11-04',wed).turns[0].text,/あさひなともしびです。ともしびさん。/);
 assert.throws(()=>makeScript('2026-11-02',{...draft,turns:turns.map(t=>({...t,speaker:'intruder'}))}));
 assert.throws(()=>makeScript('2026-11-02',{...draft,turns:turns.slice(0,2)}));
});
