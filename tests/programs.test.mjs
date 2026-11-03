import test from 'node:test';
import assert from 'node:assert/strict';
import {episodeProgram,episodeTitle,programs} from '../public/programs.js';
import {makeScript} from '../lib/weekly-production.mjs';
import {metadata} from '../lib/core.mjs';

test('seven days map to unique program art and speakers',()=>{
 const dates=['2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07'];
 assert.deepEqual(dates.map(date=>episodeProgram({id:'daily-'+date}).image),['sunday','monday','tuesday','wednesday','thursday','friday','saturday']);
 assert.equal(new Set(programs.map(p=>p.image)).size,7);
 assert.equal(episodeProgram({program:4}).cast,'久世 理人・相原 澪');
 assert.equal(episodeProgram({title:'別の番組'}),undefined);
});
test('old titles are displayed as the episode title and metadata is validated',()=>{
 const episode={id:'daily-2026-11-03',title:'熱血にぃやん｜2026-11-03｜一歩から始めよう'};
 assert.equal(episodeTitle(episode),'一歩から始めよう');
 assert.equal(metadata(new URLSearchParams({title:'朝',channel:'life',program:'1'})).program,1);
 assert.throws(()=>metadata(new URLSearchParams({title:'朝',channel:'life',program:'9'})));
});
test('new titles contain only the generated phrase',()=>{
 const turns=Array.from({length:8},(_,i)=>({speaker:i%2?'tsumugi':'ayumu',text:'話題についてゆっくり話してみましょう。'.repeat(5)}));
 assert.equal(makeScript('2026-11-02',{topic:'いつもの道に隠れた小さな発見',description:'身近な発見について話します。',turns}).title,'いつもの道に隠れた小さな発見');
});
