import http from 'node:http';
import {readFile, writeFile, mkdir, rename, stat, open, unlink} from 'node:fs/promises';
import {createReadStream, createWriteStream} from 'node:fs';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {channels,parseRange,metadata,xml} from './lib/core.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
export async function createApp({dataDir=path.join(root,'data')}={}) {
  const audioDir=path.join(dataDir,'audio');
  await mkdir(audioDir,{recursive:true});
  const dbFile=path.join(dataDir,'episodes.json');
  let episodes;
  try { episodes=JSON.parse(await readFile(dbFile,'utf8')); if(!Array.isArray(episodes)) throw new Error('Invalid catalog'); }
  catch(e) { if(e.code!=='ENOENT') throw e; episodes=[]; }
  let saving=Promise.resolve();
  async function commit(ep) {
    const task=saving.then(async()=>{
      const next=[ep,...episodes];
      await writeFile(dbFile+'.tmp',JSON.stringify(next,null,2));
      await rename(dbFile+'.tmp',dbFile); episodes=next;
    });
    saving=task.catch(()=>{}); return task;
  }
  return http.createServer(async(req,res)=>{
    const host=req.headers.host||'';
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const json=(code,obj)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
    if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return json(403,{error:'ローカルアクセス専用です。'});
    const url=new URL(req.url,'http://'+host);
    try {
      if(req.method==='GET' && url.pathname==='/api/episodes') return json(200,{episodes,channels,storageBytes:episodes.reduce((n,e)=>n+e.size,0)});
      if(req.method==='GET' && url.pathname==='/api/health') return json(200,{ok:true,mode:'local',episodes:episodes.length});
      if(req.method==='POST' && url.pathname==='/api/episodes') {
        if(req.headers.origin && req.headers.origin!=='http://'+host) return json(403,{error:'別サイトからのアップロードはできません。'});
        if(!(req.headers['content-type']||'').startsWith('audio/mpeg')) return json(415,{error:'MP3形式の音声を選んでください。'});
        let meta;
        try {meta=metadata(url.searchParams);} catch(e) {return json(400,{error:e.message});}
        const max=100*1024*1024;
        if(Number(req.headers['content-length'])>max) return json(413,{error:'ファイルは100 MB以下にしてください。'});
        const id=randomUUID(), tmp=path.join(audioDir,id+'.part'), dest=path.join(audioDir,id+'.mp3');
        let size=0;
        try {
          const limiter=new Transform({transform(chunk,enc,cb){size+=chunk.length;cb(size>max?Object.assign(new Error('ファイルは100 MB以下にしてください。'),{status:413}):null,chunk);}});
          await pipeline(req,limiter,createWriteStream(tmp,{flags:'wx'}));
          const f=await open(tmp,'r'); let head=Buffer.alloc(3); try{await f.read(head,0,3,0);}finally{await f.close();}
          if(size<3 || !(head.toString()==='ID3' || (head[0]===255 && (head[1]&224)===224))) throw Object.assign(new Error('MP3のヘッダーを確認できませんでした。'),{status:415});
          await rename(tmp,dest);
          const ep={id,...meta,size,date:new Date().toISOString(),audio:'/audio/'+id+'.mp3',demo:false};
          await commit(ep); return json(201,ep);
        } catch(e) {await unlink(tmp).catch(()=>{});await unlink(dest).catch(()=>{});if(!res.destroyed) return json(e.status||500,{error:e.status?e.message:'音声を保存できませんでした。'});return;}
      }
      if(['GET','HEAD'].includes(req.method) && /^\/audio\/[\w-]+\.mp3$/.test(url.pathname)) {
        const ep=episodes.find(e=>e.audio===url.pathname);
        if(!ep) return json(404,{error:'音声が見つかりません。'});
        const file=path.join(audioDir,path.basename(url.pathname)); const {size}=await stat(file);
        const range=parseRange(req.headers.range,size);
        if(range===false){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}
        const start=range?.start||0,end=range?.end??size-1;
        const headers={'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Length':end-start+1,'Cache-Control':'private, max-age=3600'};
        if(range) headers['Content-Range']=`bytes ${start}-${end}/${size}`;
        res.writeHead(range?206:200,headers);
        if(req.method==='HEAD') return res.end();
        const stream=createReadStream(file,{start,end}); stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);return;
      }
      if(req.method==='GET' && url.pathname==='/feed.xml') {
        const base='http://'+host;
        const items=episodes.map(e=>`<item><title>${xml(e.title)}</title><description>${xml(e.description)}</description><guid isPermaLink="false">${xml(e.id)}</guid><pubDate>${new Date(e.date).toUTCString()}</pubDate><enclosure url="${xml(base+e.audio)}" length="${e.size}" type="audio/mpeg"/></item>`).join('');
        res.writeHead(200,{'Content-Type':'application/rss+xml; charset=utf-8'});return res.end(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ながら放送</title><link>${base}</link><description>いつもの時間に、気ままな声を。</description><language>ja</language>${items}</channel></rss>`);
      }
      const files={'/':'index.html','/app.js':'app.js','/player-model.js':'player-model.js','/flowbite.js':'flowbite.js','/styles.css':'styles.css','/favicon.svg':'favicon.svg'};
      if(['GET','HEAD'].includes(req.method) && files[url.pathname]) {
        const body=await readFile(path.join(root,'public',files[url.pathname]));
        const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'}[path.extname(files[url.pathname])];
        res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?undefined:body);
      }
      json(404,{error:'見つかりません。'});
    } catch(e) {console.error(e.message);if(!res.headersSent)json(500,{error:'読み込みに失敗しました。'});else res.destroy();}
  });
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||4317);
  const server=await createApp();server.listen(port,'127.0.0.1',()=>console.log(`ながら放送 → http://127.0.0.1:${port}`));
}
