import {channels,metadata,parseRange,xml} from '../lib/core.mjs';
import {episodeTitle} from '../public/programs.js';

const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const publicEpisode=row=>({id:row.id,title:episodeTitle(row),channel:row.channel,description:row.description,source:row.source,duration:row.duration,size:row.size,date:row.date,audio:`/audio/${row.id}.mp3`,demo:false});
async function authorized(request,env){
 if(typeof env.UPLOAD_SECRET!=='string'||env.UPLOAD_SECRET.length<32)return false;
 const provided=request.headers.get('Authorization')||'';
 const enc=new TextEncoder();
 const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(provided)),crypto.subtle.digest('SHA-256',enc.encode('Bearer '+env.UPLOAD_SECRET))]);
 return crypto.subtle.timingSafeEqual(a,b);
}
async function list(env){
 const {results}=await env.DB.prepare('SELECT id,title,channel,description,source,duration,size,date FROM episodes ORDER BY date DESC LIMIT 1000').all();
 return results.map(publicEpisode);
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  try{
   if(request.method==='GET'&&url.pathname==='/api/episodes'){
    const episodes=await list(env);return json({episodes,channels,storageBytes:episodes.reduce((n,x)=>n+x.size,0)});
   }
   if(request.method==='GET'&&url.pathname==='/api/health')return json({ok:true,mode:'cloudflare'});
   if(request.method==='POST'&&url.pathname==='/api/episodes'){
    if(!await authorized(request,env))return json({error:'認証が必要です。'},401);
    let meta;try{meta=metadata(url.searchParams);}catch(e){return json({error:e.message},400);}
    if(!(request.headers.get('content-type')||'').startsWith('audio/mpeg'))return json({error:'MP3を指定してください。'},415);
    const length=Number(request.headers.get('content-length'));
    if(!Number.isSafeInteger(length)||length<3||length>20*1024*1024)return json({error:'3バイト以上20 MiB以下のMP3を指定してください。'},413);
    const key=request.headers.get('X-Episode-Key');
    if(key&&!/^\d{4}-\d{2}-\d{2}$/.test(key))return json({error:'エピソードキーが正しくありません。'},400);
    const id=key?'daily-'+key:crypto.randomUUID();
    const existing=await env.DB.prepare('SELECT id,title,channel,description,source,duration,size,date FROM episodes WHERE id=?').bind(id).first();
    if(existing)return json(publicEpisode(existing));
    const body=await request.arrayBuffer();
    const bytes=new Uint8Array(body);
    if(bytes.length!==length||!(bytes[0]===73&&bytes[1]===68&&bytes[2]===51||bytes[0]===255&&(bytes[1]&224)===224))return json({error:'MP3を確認できません。'},415);
    const objectKey=`audio/${id}-${crypto.randomUUID()}.mp3`;
    await env.AUDIO.put(objectKey,body,{httpMetadata:{contentType:'audio/mpeg'}});
    const date=new Date().toISOString();
    await env.DB.prepare('INSERT OR IGNORE INTO episodes (id,title,channel,description,source,duration,size,date,object_key) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,meta.title,meta.channel,meta.description,meta.source,meta.duration,length,date,objectKey).run();
    const row=await env.DB.prepare('SELECT id,title,channel,description,source,duration,size,date FROM episodes WHERE id=?').bind(id).first();
    return json(publicEpisode(row),201);
   }
   const match=/^\/audio\/([\w-]+)\.mp3$/.exec(url.pathname);
   if(match&&['GET','HEAD'].includes(request.method)){
    const row=await env.DB.prepare('SELECT object_key,size FROM episodes WHERE id=?').bind(match[1]).first();
    if(!row)return json({error:'音声が見つかりません。'},404);
    const range=parseRange(request.headers.get('Range'),row.size);
    if(range===false)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${row.size}`}});
    const start=range?.start??0,end=range?.end??row.size-1;
    const headers={'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Length':String(end-start+1),'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'};
    if(range)headers['Content-Range']=`bytes ${start}-${end}/${row.size}`;
    if(request.method==='HEAD')return new Response(null,{status:range?206:200,headers});
    const object=await env.AUDIO.get(row.object_key,range?{range:{offset:start,length:end-start+1}}:undefined);
    if(!object)return json({error:'音声が見つかりません。'},404);
    return new Response(object.body,{status:range?206:200,headers});
   }
   if(request.method==='GET'&&url.pathname==='/feed.xml'){
    const episodes=await list(env),base=url.origin;
    const items=episodes.map(e=>`<item><title>${xml(e.title)}</title><description>${xml(e.description)}</description><guid isPermaLink="false">${xml(e.id)}</guid><pubDate>${new Date(e.date).toUTCString()}</pubDate><enclosure url="${xml(base+e.audio)}" length="${e.size}" type="audio/mpeg"/></item>`).join('');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ながら放送</title><link>${xml(base)}</link><description>いつもの時間に、気ままな声を。</description><language>ja</language>${items}</channel></rss>`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
   }
   if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/audio/'))return json({error:'見つかりません。'},404);
   return env.ASSETS.fetch(request);
  }catch(e){console.error(e);return json({error:'処理に失敗しました。'},500);}
 }
};
