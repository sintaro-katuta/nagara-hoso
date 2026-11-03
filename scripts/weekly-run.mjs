import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeScript,japaneseDate,afterRelease,beforeProduction} from '../lib/weekly-production.mjs';
import {programForDate} from '../lib/weekly-programs.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=process.env.RADIO_WEEKLY_DIR||path.join(root,'data','weekly');
const engine=process.env.AIVIS_ENGINE_URL||'http://127.0.0.1:10101';
const radio=process.env.RADIO_URL||'http://127.0.0.1:4317';
const args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--prepare-test'))throw new Error('使い方: weekly-run.mjs [--prepare-test YYYY-MM-DD]');
const testMode=args.length===2;
const date=testMode?args[1]:japaneseDate();
programForDate(date);
const dayDir=path.join(work,date);
const lock=path.join(work,`${date}.lock`);
const exists=async file=>{try{await readFile(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const writeJson=async(file,value)=>{const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(value,null,2)+'\n');await rename(tmp,file);};
const cmd=async(file,args,options={})=>new Promise((resolve,reject)=>{
 const child=spawn(file,args,{cwd:root,env:process.env,stdio:['ignore','pipe','pipe'],...options});
 let stdout='',stderr='';child.stdout?.on('data',x=>stdout+=x);child.stderr?.on('data',x=>stderr+=x);
 child.on('error',reject);child.on('close',code=>code===0?resolve(stdout):reject(new Error(`${file} failed (${code}): ${stderr.slice(-2000)}`)));
});
const fetchLocal=async(url,options={})=>{const u=new URL(url);if(u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname))throw new Error('接続先はローカルに限ります。');return fetch(u,{...options,signal:AbortSignal.timeout(12000),redirect:'error'});};

async function prepare(){
 const scriptFile=path.join(dayDir,'script.json'), mp3=path.join(dayDir,'episode.mp3');
 await mkdir(dayDir,{recursive:true});
 if(await exists(path.join(dayDir,'ready.json')))return;
 if(await exists(mp3))throw new Error(`未検証の音声が残っています。内容を確認して別の場所に移動してください: ${mp3}`);
 if(!await exists(scriptFile)){
  const programme=programForDate(date);
  const history=await readFile(path.join(work,'history.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
  const previousEpisodes=history.filter(x=>x.programme===programme.title).slice(-12);
  const previous=previousEpisodes.map(x=>x.topic);
  const lastEpisode=previousEpisodes.at(-1);
  const lastScript=lastEpisode?await readFile(path.join(work,lastEpisode.date,'script.json'),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;}):'';
  const feedback=await readFile(path.join(work,'feedback.txt'),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
  const schema={type:'object',properties:{topic:{type:'string'},description:{type:'string'},turns:{type:'array',items:{type:'object',properties:{speaker:{type:'string',enum:programme.cast.map(c=>c.id)},text:{type:'string'}},required:['speaker','text'],additionalProperties:false}}},required:['topic','description','turns'],additionalProperties:false};
  const schemaFile=path.join(dayDir,'schema.json'), draftFile=path.join(dayDir,'draft.json');
  await writeJson(schemaFile,schema);
  const bios=await readFile(path.join(root,'docs','personality-and-voice-candidates.md'),'utf8');
  const prompt=`あなたは架空のラジオ番組の台本作家です。今日の番組: ${JSON.stringify(programme)}。日付: ${date}。過去の話題（重複を避ける）: ${JSON.stringify(previous)}。直近の台本（設定の整合用、同じ小話は繰り返さない）: ${lastScript.slice(0,10000)}。フィードバック: ${feedback.slice(0,5000)}。人物設定: ${bios}\n日本語のオリジナル台本をJSONのみで出力。topic は日付や番組名を含めず、内容を表す約30文字のキャッチーなタイトルにする。台詞合計1000〜1600文字、8〜40発言。冒頭、フリートーク、本題、締めの流れ。読み上げ文中の名前は指定された読みをひらがなで書く。${programme.cast.length===1?'一人語りにする。':'二人が互いの話を受け、全員が複数回話す。'} 架空の体験は創作設定として扱い、実際の出来事やニュース、実在の投稿と偽らない。時刻や次回日付は断言しない。根拠が必要な具体的な事実を作らない。音楽の歌詞、著作物の引用、架空のお便りや広告は入れない。`;
  await cmd(process.env.RADIO_CODEX||'/opt/homebrew/bin/codex',['exec','--skip-git-repo-check','--ephemeral','-s','read-only','--output-schema',schemaFile,'-o',draftFile,prompt]);
  const draft=JSON.parse(await readFile(draftFile,'utf8'));
  const script=makeScript(date,draft);await writeJson(scriptFile,script);
 }
 const script=JSON.parse(await readFile(scriptFile,'utf8'));
 await cmd(process.execPath,[path.join(root,'scripts','synthesize-radio.mjs'),scriptFile,'--engine',engine,'--output',mp3]);
 const duration=Number((await cmd('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',mp3])).trim());
 if(!Number.isFinite(duration)||duration<20||duration>1800)throw new Error('音声の長さを検証できませんでした。');
 await writeJson(path.join(dayDir,'ready.json'),{date,title:script.title,duration});
}

async function publish(){
 const mp3=path.join(dayDir,'episode.mp3'),script=JSON.parse(await readFile(path.join(dayDir,'script.json'),'utf8'));
 const originalTitle=script.title;
 if(script.title.startsWith(programForDate(date).title+'｜'+date+'｜'))script.title=script.title.slice((programForDate(date).title+'｜'+date+'｜').length);
 if(!await exists(path.join(dayDir,'ready.json')))throw new Error('音声の検証が完了していません。');
 const response=await fetchLocal(new URL('/api/episodes',radio));
 if(!response.ok)throw new Error('サイトの番組一覧を取得できません。');
 const catalog=await response.json();
 if(!Array.isArray(catalog.episodes))throw new Error('番組一覧が不正です。');
 const matched=catalog.episodes.filter(x=>(x.title===script.title||x.title===originalTitle)&&japaneseDate(new Date(x.date))===date);
 if(matched.length>1)throw new Error('同じ番組が複数あります。手動で確認してください。');
 let episode=matched[0];
 if(!episode){
  const u=new URL('/api/episodes',radio);u.search=new URLSearchParams({channel:script.channel,title:script.title,description:script.description,program:String(programForDate(date).weekday),duration:String(JSON.parse(await readFile(path.join(dayDir,'ready.json'),'utf8')).duration)}).toString();
  const result=await fetchLocal(u,{method:'POST',headers:{'Content-Type':'audio/mpeg'},body:await readFile(mp3)});
  if(!result.ok)throw new Error(`サイトへの追加に失敗しました: HTTP ${result.status}`);
  episode=await result.json();
 }
 const cloudFile=path.join(work,'cloud.json');
 if(await exists(cloudFile)){
  const cloud=JSON.parse(await readFile(cloudFile,'utf8'));
  const target=new URL(cloud.url);
  if(target.protocol!=='https:'||!target.hostname.endsWith('.workers.dev')||target.username||target.password||target.pathname!=='/'||target.search||target.hash)throw new Error('公開先は設定済みの workers.dev HTTPS URL を指定してください。');
  const secret=(await readFile(path.join(work,'upload-secret'),'utf8')).trim();
  if(secret.length<32)throw new Error('公開用の認証設定が正しくありません。');
  const u=new URL('/api/episodes',target);u.search=new URLSearchParams({channel:script.channel,title:script.title,description:script.description,duration:String(JSON.parse(await readFile(path.join(dayDir,'ready.json'),'utf8')).duration)}).toString();
  const result=await fetch(u,{method:'POST',headers:{'Content-Type':'audio/mpeg','Authorization':`Bearer ${secret}`,'X-Episode-Key':date,'User-Agent':`Mozilla/5.0 (compatible; YorimichiRadio/1.0; +${target.origin}/)`},body:await readFile(mp3),signal:AbortSignal.timeout(120000),redirect:'error'});
  if(!result.ok)throw new Error(`Cloudflareへの追加に失敗しました: HTTP ${result.status}`);
 }
 const historyFile=path.join(work,'history.json');
 const history=await readFile(historyFile,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
 if(!history.some(h=>h.date===date)){
  const draft=JSON.parse(await readFile(path.join(dayDir,'draft.json'),'utf8'));
  history.push({date,programme:programForDate(date).title,topic:draft.topic,episodeId:episode.id});await writeJson(historyFile,history);
 }
 await writeJson(path.join(dayDir,'published.json'),{date,id:episode.id,title:episode.title});
}

async function main(){
 if(!testMode&&beforeProduction()){console.log('制作開始時刻より前です。');return;}
 await mkdir(work,{recursive:true});
 try{await mkdir(lock);}catch(e){if(e.code==='EEXIST'){console.log('本日の制作は実行中、またはロックの確認が必要です。');return;}throw e;}
 try{
  if(!testMode&&await exists(path.join(dayDir,'published.json'))){console.log('本日の配信は完了済みです。');return;}
  await prepare();
  if(!testMode&&afterRelease())await publish();
  console.log(!testMode&&afterRelease()?'本日の配信処理が完了しました。':'本日の配信準備が完了しました。');
 }
 finally{await rm(lock,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
