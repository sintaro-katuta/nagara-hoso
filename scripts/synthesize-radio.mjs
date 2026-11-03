import {readFile,writeFile,mkdtemp,mkdir,rm,copyFile,stat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {DEFAULT_ENGINE_URL,SPEAKING_RATE,localOrigin,validateScript,synthesizeDialogue} from '../lib/aivis.mjs';
const run=promisify(execFile);

export function parseArgs(args){
 const options={ingest:false};
 const values={'--engine':'engine','--output':'output','--radio-url':'radioUrl'};
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==='--help'||arg==='-h'){options.help=true;continue;}
  if(arg==='--ingest'){options.ingest=true;continue;}
  if(arg==='--program'){options.program=true;continue;}
  if(values[arg]){
   if(options[values[arg]]!==undefined)throw new Error(`${arg}が重複しています。`);
   const value=args[++i];if(!value||value.startsWith('--'))throw new Error(`${arg}の値を指定してください。`);
   options[values[arg]]=value;continue;
  }
  if(arg.startsWith('-'))throw new Error(`不明なオプション: ${arg}`);
  if(options.script)throw new Error('台本JSONは1つ指定してください。');
  options.script=arg;
 }
 if(!options.help&&!options.script)throw new Error('台本JSONを指定してください。--helpで使い方を確認できます。');
 if(options.radioUrl&&!options.ingest)throw new Error('--radio-urlは--ingestと一緒に指定してください。');
 return options;
}

export function validateProgram(script){
 if(typeof script.title!=='string'||!script.title.trim())throw new Error('番組のtitleを指定してください。');
 const expected=['opening','free','letter','music','ending'];
 const sections=script.turns.map(t=>t.section).filter((id,index,list)=>index===0||id!==list[index-1]);
 if(JSON.stringify(sections)!==JSON.stringify(expected))throw new Error('--programの台本にはopening/free/letter/music/endingをこの順でまとめて指定してください。');
 if(!Array.isArray(script.sections)||JSON.stringify(script.sections.map(s=>s.id))!==JSON.stringify(expected)||script.sections.some(s=>!s.label?.trim()||!s.direction?.trim()))throw new Error('sectionsに各部のid・label・directionを指定してください。');
 return script;
}

const help=`使い方: node scripts/synthesize-radio.mjs 台本.json [オプション]

  --engine URL      AivisSpeech Engine（既定: ${DEFAULT_ENGINE_URL}）
  --output PATH     生成するMP3のパス（既存ファイルは上書きしません）
  --ingest          完成したMP3をローカルのながら放送に追加
  --program         構成台本のジングル・BGM・曲を加えた番組として制作
  --radio-url URL   ながら放送のURL（既定: http://127.0.0.1:4317）
  --help            この説明を表示

voicesで阿井田 茂・まおの名前またはspeaker_uuidとstyleNameを指定し、
turnsにspeaker（shigeru/mao）、text、任意のpauseMsを並べます。
話速は${SPEAKING_RATE}。既定ではMP3を作るだけで、サイトには追加しません。
必要: 起動済みAivisSpeech Engine、両方のAIVMXモデル、ffmpeg。`;

export async function main(args=process.argv.slice(2)){
 const options=parseArgs(args);
 if(options.help){console.log(help);return;}
 const engine=localOrigin(options.engine||process.env.AIVIS_ENGINE_URL||DEFAULT_ENGINE_URL,'AivisSpeech Engine');
 const radioUrl=options.ingest?localOrigin(options.radioUrl||process.env.RADIO_URL||'http://127.0.0.1:4317','ながら放送'):null;
 let script;
 try{script=JSON.parse(await readFile(path.resolve(options.script),'utf8'));}catch(error){throw new Error(`台本JSONを読み込めませんでした: ${error.message}`);}
 validateScript(script);
 if(options.program){
  validateProgram(script);
  try{await run('python3',['--version']);}catch{throw new Error('番組制作にはPython 3が必要です。');}
 }
 if(options.ingest&&(!script.title?.trim()||!['tech','life','comedy','news'].includes(script.channel)))throw new Error('--ingestを使う台本にはtitleとchannel（tech/life/comedy/news）が必要です。');
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const output=path.resolve(options.output||`output/radio-${stamp}.mp3`);
 if(path.extname(output).toLowerCase()!=='.mp3')throw new Error('--outputには拡張子.mp3のパスを指定してください。');
 try{await stat(output);throw new Error(`出力先にファイルが存在します。別のパスを指定してください: ${output}`);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(options.program){try{await stat(output+'.production');throw new Error(`制作データが既に存在します。別の出力名を指定してください: ${output}.production`);}catch(error){if(error.code!=='ENOENT')throw error;}}
 try{await run('ffmpeg',['-version']);}catch{throw new Error('ffmpegが見つかりません。インストールしてから実行してください。');}
 const work=await mkdtemp(path.join(tmpdir(),'yorimichi-aivis-'));
 try{
  const parts=[];
  const produced=[];
  const voices=await synthesizeDialogue(script,{engine,onTurn:async({index,voice,wav,pauseMs})=>{
   const name=`part-${String(index).padStart(5,'0')}.wav`,source=path.join(work,'source.wav');
   await writeFile(source,wav);
   const echo=options.program&&script.turns[index].effect==='title'?',aecho=0.8:0.8:70|140:0.12|0.06':'';
   try{await run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-i',source,'-af',`aresample=24000,aformat=sample_fmts=s16:channel_layouts=mono${echo},apad=pad_dur=${pauseMs/1000}`,'-ar','24000','-ac','1','-c:a','pcm_s16le',path.join(work,name)]);}
   catch{throw new Error(`発言${index+1}の音声を整えられませんでした。ffmpegの動作を確認してください。`);}
   parts.push(`file '${name}'`);
   produced.push({index,file:name,speaker:script.turns[index].speaker,text:script.turns[index].text,section:script.turns[index].section,pauseMs,voice});
   console.log(`${index+1}/${script.turns.length} ${voice.name}（${voice.styleName}）`);
  }});
  await writeFile(path.join(work,'parts.txt'),parts.join('\n')+'\n');
  const encoded=path.join(work,'radio.mp3');
  try{
   if(options.program){
    const production=output+'.production';
    await mkdir(path.dirname(output),{recursive:true});
    await mkdir(production);
    for(const part of produced)await copyFile(path.join(work,part.file),path.join(production,part.file),constants.COPYFILE_EXCL);
    const manifest=path.join(production,'manifest.json');
    await writeFile(manifest,JSON.stringify({script,engine,speakingRate:SPEAKING_RATE,voices,turns:produced},null,2)+'\n',{flag:'wx'});
    const result=await run('python3',[fileURLToPath(new URL('./arrange-radio.py',import.meta.url)),manifest,'--output',encoded]);
    console.log(result.stdout.trim());
    console.log(`台詞・構成・音素材: ${production}`);
   }else await run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-f','concat','-safe','1','-i',path.join(work,'parts.txt'),'-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','96k',encoded]);
  }
  catch(error){throw new Error(options.program?`番組の構成に失敗しました。生成済みの台詞は ${output}.production に残しています。${error.stderr?.trim()||error.message}`:'MP3への変換に失敗しました。ffmpegがlibmp3lameに対応しているか確認してください。');}
  await mkdir(path.dirname(output),{recursive:true});
  await copyFile(encoded,output,constants.COPYFILE_EXCL);
  console.log(`MP3を作成しました: ${output}`);
  console.log(`声: ${Object.values(voices).map(voice=>voice.name).join(' / ')}、話速: ${SPEAKING_RATE}`);
 }finally{await rm(work,{recursive:true,force:true});}
 if(options.ingest){
  try{const result=await run(process.execPath,[fileURLToPath(new URL('./ingest.mjs',import.meta.url)),output,script.channel,script.title,script.description||''],{env:{...process.env,RADIO_URL:radioUrl}});console.log(result.stdout.trim());}
  catch{throw new Error(`MP3は保存済みですが、ながら放送に追加できませんでした。${radioUrl} の起動を確認してください。保存先: ${output}`);}
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
