import {stat,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const [file,channel,title,...description]=process.argv.slice(2);
if(!file||!channel||!title){console.error('使い方: npm run ingest -- /path/to/episode.mp3 tech "タイトル" "説明（任意）"');process.exit(1);}
try{
 const size=(await stat(file)).size;if(size>100*1024*1024)throw new Error('100 MB以下のMP3を指定してください。');
 let duration=0;try{duration=Number(execFileSync('ffprobe',['-v','quiet','-show_entries','format=duration','-of','csv=p=0',file],{encoding:'utf8'}).trim());}catch{console.warn('ffprobeが使えないため再生時間は初回再生時に取得します。');}
 const url=new URL('/api/episodes',process.env.RADIO_URL||'http://127.0.0.1:4317');
 if(!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('このプロトタイプの送信先はローカルのみです。');
 url.search=new URLSearchParams({channel,title,description:description.join(' '),duration:String(duration)}).toString();
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'audio/mpeg'},body:await readFile(file)});const body=await r.json();if(!r.ok)throw new Error(body.error);
 console.log('追加しました:',body.title,'→',url.origin);
}catch(e){console.error(e.message);process.exitCode=1;}
