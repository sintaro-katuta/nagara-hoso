export const DEFAULT_ENGINE_URL='http://127.0.0.1:10101';
export const SPEAKING_RATE=0.95;

export function localOrigin(value,label='接続先'){
 let url;
 try{url=new URL(value);}catch{throw new Error(`${label}のURLが正しくありません。`);}
 if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash){
  throw new Error(`${label}は http://127.0.0.1:ポート番号 のような、このPCのURLを指定してください。`);
 }
 return url.origin;
}

const normalized=value=>String(value??'').normalize('NFC').trim().replace(/\s+/gu,' ');
export function validateScript(script){
 if(!script||typeof script!=='object'||Array.isArray(script))throw new Error('台本はJSONオブジェクトで指定してください。');
 if(!script.voices||typeof script.voices!=='object'||Array.isArray(script.voices))throw new Error('voicesに出演者の声を指定してください。');
 const aliases=Object.keys(script.voices);
 if(aliases.length<1||aliases.length>2)throw new Error('出演者は1人または2人にしてください。');
 for(const alias of aliases){
  const voice=script.voices[alias];
  if(!voice||typeof voice!=='object'||(!normalized(voice.name)&&!normalized(voice.speaker_uuid)))throw new Error(`voices.${alias}にnameまたはspeaker_uuidを指定してください。`);
  for(const key of ['name','speaker_uuid','styleName'])if(voice[key]!==undefined&&(typeof voice[key]!=='string'||!normalized(voice[key])))throw new Error(`voices.${alias}.${key}は空でない文字列にしてください。`);
 }
 if(!Array.isArray(script.turns)||script.turns.length<2)throw new Error('turnsには二人の会話を2発言以上指定してください。');
 for(const [i,turn] of script.turns.entries()){
  if(!turn||!aliases.includes(turn.speaker))throw new Error(`発言${i+1}のspeakerはvoicesの出演者を指定してください。`);
  if(typeof turn.text!=='string'||!turn.text.trim()||turn.text.length>2000)throw new Error(`発言${i+1}のtextは1〜2000文字で指定してください。`);
  if(turn.pauseMs!==undefined&&(!Number.isFinite(turn.pauseMs)||turn.pauseMs<0||turn.pauseMs>5000))throw new Error(`発言${i+1}のpauseMsは0〜5000の数値にしてください。`);
 }
 if(!aliases.every(alias=>script.turns.some(turn=>turn.speaker===alias)))throw new Error('指定した出演者全員の発言を入れてください。');
 return script;
}

export function resolveVoices(config,speakers){
 if(!Array.isArray(speakers))throw new Error('Engineから声の一覧を取得できませんでした。');
 const resolved={};
 for(const alias of Object.keys(config)){
  const selector=config[alias];
  const matches=speakers.filter(s=>(!selector.speaker_uuid||s.speaker_uuid===selector.speaker_uuid)&&(!selector.name||normalized(s.name)===normalized(selector.name)));
  if(matches.length!==1){
   const available=speakers.map(s=>`${s.name} (${s.speaker_uuid})`).join('、')||'なし';
   throw new Error(`${alias}「${selector.name||selector.speaker_uuid}」を一意に選べません。指定したAIVMXモデルの導入と名前・UUIDを確認してください。利用できる声: ${available}`);
  }
  const speaker=matches[0];
  if(typeof speaker.speaker_uuid!=='string'||!speaker.speaker_uuid)throw new Error(`${alias}のspeaker_uuidを確認できませんでした。`);
  const styles=(speaker.styles||[]).filter(style=>!style.type||style.type==='talk');
  const matchingStyles=selector.styleName?styles.filter(style=>normalized(style.name)===normalized(selector.styleName)):styles;
  if(matchingStyles.length!==1||!Number.isSafeInteger(matchingStyles[0]?.id)||matchingStyles[0].id<0){
   throw new Error(`${speaker.name}のスタイルを一意に選べません。voices.${alias}.styleNameに指定してください。利用できるスタイル: ${styles.map(s=>s.name).join('、')||'なし'}`);
  }
  resolved[alias]={name:speaker.name,speaker_uuid:speaker.speaker_uuid,styleName:matchingStyles[0].name,styleId:matchingStyles[0].id};
 }
 const identities=Object.values(resolved).map(voice=>voice.speaker_uuid);
 if(new Set(identities).size!==identities.length)throw new Error('二人の声が同じspeaker_uuidです。別々のAIVMXモデルを指定してください。');
 return resolved;
}

export function createAivisClient({engine=DEFAULT_ENGINE_URL,fetchImpl=globalThis.fetch,timeoutMs=180000}={}){
 const origin=localOrigin(engine,'AivisSpeech Engine');
 async function request(path,options={}){
  let response;
  try{response=await fetchImpl(new URL(path,origin),{...options,redirect:'error',signal:AbortSignal.timeout(timeoutMs)});}
  catch(error){
   if(error.name==='TimeoutError'||error.name==='AbortError')throw new Error('AivisSpeech Engineの応答を待ちきれませんでした。Engineの状態を確認して、もう一度実行してください。');
   throw new Error(`AivisSpeech Engineに接続できません。${origin} で起動し、指定のモデルを導入してください。`);
  }
  if(!response.ok)throw new Error(`AivisSpeech Engineの${path.split('?')[0]}が失敗しました（HTTP ${response.status}）。Engineのログとモデルの状態を確認してください。`);
  return response;
 }
 return {
  async speakers(){
   const response=await request('/speakers');
   try{return await response.json();}catch{throw new Error('Engineの声一覧を読み取れませんでした。');}
  },
  async synthesize(text,voice){
   const params=new URLSearchParams({speaker:String(voice.styleId),text});
   const queryResponse=await request('/audio_query?'+params,{method:'POST'});
   let query;
   try{query=await queryResponse.json();}catch{throw new Error('Engineの音声設定を読み取れませんでした。');}
   if(!query||typeof query!=='object'||Array.isArray(query))throw new Error('Engineの音声設定が正しくありません。');
   query.speedScale=SPEAKING_RATE;
   const response=await request('/synthesis?'+new URLSearchParams({speaker:String(voice.styleId)}),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query)});
   const wav=Buffer.from(await response.arrayBuffer());
   if(wav.length<44||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw new Error('Engineから正しいWAV音声を受け取れませんでした。');
   return wav;
  }
 };
}

export async function synthesizeDialogue(script,{engine,fetchImpl,onTurn=async()=>{}}={}){
 validateScript(script);
 const client=createAivisClient({engine,fetchImpl});
 const voices=resolveVoices(script.voices,await client.speakers());
 // Resolve both identities before producing any audio. No default voice fallback.
 for(const [index,turn] of script.turns.entries()){
  const wav=await client.synthesize(turn.text.trim(),voices[turn.speaker]);
  await onTurn({index,turn,voice:voices[turn.speaker],wav,pauseMs:turn.pauseMs??(index===script.turns.length-1?0:180)});
 }
 return voices;
}
