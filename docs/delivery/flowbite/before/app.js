const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k))??fallback;}catch{return fallback;}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
const themes=['yorimichi','dim','nord'];
const preferredTheme=read('yr:theme','yorimichi');
document.documentElement.dataset.theme=themes.includes(preferredTheme)?preferredTheme:'yorimichi';
$('theme-select').value=document.documentElement.dataset.theme;
$('theme-select').onchange=e=>{const theme=e.target.value;if(themes.includes(theme)){document.documentElement.dataset.theme=theme;write('yr:theme',theme);}};
let saved=read('yr:saved',[]),history=read('yr:history',[]),positions=read('yr:positions',{});
if(!Array.isArray(saved))saved=[];if(!Array.isArray(history))history=[];if(!positions||typeof positions!=='object')positions={};
let episodes=[],channels=[],view='home',filter='all',query='',current=null,queue=[],selectedFile=null;
let toastTimer,lastPositionWrite=0,switching=false;
const audio=$('audio');audio.volume=.8;
const channel=id=>channels.find(c=>c.id===id);
const time=s=>{if(!Number.isFinite(Number(s)))return '0:00';s=Math.max(0,Math.floor(Number(s)));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
const bytes=n=>n>=1e9?`${(n/1e9).toFixed(2)} GB`:n>=1e6?`${(n/1e6).toFixed(1)} MB`:`${(n/1000).toFixed(0)} KB`;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3400);}
const day=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'long',year:'numeric'}).format(new Date());
$('date-label').textContent=day.toUpperCase()+'  /  YOUR DAILY DETOUR';
async function load(){
  const r=await fetch('/api/episodes');if(!r.ok)throw new Error('エピソードを読み込めませんでした。');
  const data=await r.json();episodes=data.episodes;channels=data.channels;
  $('channel-nav').innerHTML=channels.map(c=>`<button class="nav-button ${c.id}" data-channel="${c.id}"><span class="channel-dot"></span>${escape(c.name)}</button>`).join('');
  $('channel-cards').innerHTML=channels.map(c=>`<button class="card channel-card ${c.id}" data-channel="${c.id}"><span class="channel-icon">${c.symbol}</span><span class="channel-arrow">↗</span><h3>${escape(c.name)}</h3><p>${escape(c.description)}</p><small>${String(episodes.filter(e=>e.channel===c.id).length).padStart(2,'0')} EPISODES</small></button>`).join('');
  $('filters').innerHTML=`<button data-filter="all" class="tab">すべて</button>`+channels.map(c=>`<button data-filter="${c.id}" class="tab">${escape(c.name)}</button>`).join('');
  $('upload-channel').innerHTML=channels.map(c=>`<option value="${c.id}">${escape(c.name)}</option>`).join('');
  const demo=episodes.find(e=>e.id==='demo-tech');$('hero-play').disabled=!demo;
  $('hero-duration').textContent=demo?time(demo.duration):'サンプル準備中';
  $('actual-storage').textContent=bytes(data.storageBytes);
  $('storage-detail').textContent=`${episodes.length}本の音声を保存中 · 保存先：data/audio/`;
  render();calculate();
}
function list(){
  let a=episodes.filter(e=>(filter==='all'||e.channel===filter));
  if(view==='saved')a=a.filter(e=>saved.includes(e.id));
  if(view==='history')a=a.filter(e=>history.includes(e.id));
  if(query)a=a.filter(e=>(e.title+' '+e.description+' '+channel(e.channel)?.name).toLowerCase().includes(query.toLowerCase()));
  const sort=$('sort').value;
  if(view==='history')a.sort((a,b)=>history.indexOf(a.id)-history.indexOf(b.id));
  else a.sort((a,b)=>sort==='short'?a.duration-b.duration:sort==='old'?new Date(a.date)-new Date(b.date):new Date(b.date)-new Date(a.date));
  return a;
}
function render(){
  const names={home:'ホーム',saved:'あとで聴く',history:'再生履歴',storage:'保存容量'};
  $('breadcrumb').textContent=filter!=='all'&&view==='home'?channel(filter)?.name:names[view];
  const isHome=view==='home'&&filter==='all'&&!query;
  $('home-content').hidden=!isHome;
  $('episodes-section').hidden=view==='storage';$('storage-section').hidden=view!=='storage';
  $('page-title').textContent=view==='storage'?'小さく始めて、長く聴こう。':view==='saved'?'気になる話を、とっておこう。':view==='history'?'あの話の、つづきから。':filter!=='all'?channel(filter)?.label:query?'気になる話を、見つけよう。':'おはよう、今日もよりみち。';
  $('page-description').textContent=view==='storage'?'ラジオ棚の容量と、これからの見通し。':view==='saved'?'いまは忙しくても、聴きたい気持ちは忘れずに。':view==='history'?'聴いたエピソードと、前回の再生位置を覚えています。':filter!=='all'?channel(filter)?.description:'いつもの時間に、いつもと違う話を。';
  $('list-title').textContent=view==='history'?'最近聴いたエピソード':view==='saved'?'あとで聴くエピソード':query?`「${query}」の検索結果`:'エピソード';
  document.querySelectorAll('[data-view]').forEach(el=>{const active=el.dataset.view===view&&filter==='all';el.classList.toggle('active',active);el.classList.toggle('menu-active',active&&el.classList.contains('nav-button'));el.classList.toggle('tab-active',active&&el.classList.contains('tab'));if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  document.querySelectorAll('[data-channel]').forEach(el=>el.classList.toggle('active',el.dataset.channel===filter));
  document.querySelectorAll('[data-filter]').forEach(el=>{const active=el.dataset.filter===filter;el.classList.toggle('tab-active',active);el.setAttribute('aria-pressed',String(active));});
  $('saved-count').textContent=saved.filter(id=>episodes.some(e=>e.id===id)).length;
  const a=list();$('episode-count').textContent=`${a.length} EPISODES`;
  $('episode-list').innerHTML=a.length?a.map(e=>{
    const c=channel(e.channel),active=current?.id===e.id;
    const date=new Date(e.date).toLocaleDateString('ja-JP',{month:'2-digit',day:'2-digit'});
    return `<article class="list-row episode-row ${c.id} ${active?'current':''}"><div class="episode-art" aria-hidden="true">${c.symbol}</div><div class="episode-text"><div class="episode-meta"><span class="channel-name">${escape(c.name)}</span><span>${date}</span>${e.demo?'<span class="badge badge-ghost badge-xs">試聴サンプル</span>':''}${e.source?`<a class="source-link" href="${escape(e.source)}" target="_blank" rel="noreferrer">出典 ↗</a>`:''}</div><button class="episode-title" data-play="${e.id}">${escape(e.title)}</button><p class="episode-description">${escape(e.description)}</p></div><div class="episode-actions"><span class="duration">${time(e.duration)}</span><a class="download" href="${e.audio}" download="${escape(e.title)}.mp3" aria-label="${escape(e.title)}をダウンロード">↓</a><button class="btn btn-ghost btn-square btn-sm icon-button ${saved.includes(e.id)?'saved':''}" data-save="${e.id}" aria-label="${escape(e.title)}を${saved.includes(e.id)?'あとで聴くから外す':'あとで聴くに追加'}" aria-pressed="${saved.includes(e.id)}">${saved.includes(e.id)?'♥':'♡'}</button><button class="btn btn-circle btn-sm ${active?'btn-primary':'btn-soft btn-primary'} row-play" data-play="${e.id}" aria-label="${escape(e.title)}を${active&&!audio.paused?'一時停止':'再生'}">${active&&!audio.paused?'Ⅱ':'▶'}</button></div></article>`;
  }).join(''):`<div class="empty-state"><b>${query?'該当するエピソードがありません':view==='saved'?'気になるエピソードに、♡を。':view==='history'?'まだ聴いていない話が、待っています。':'はじめの1本を、ラジオ棚へ。'}</b>${query?'別の言葉やチャンネルで探してみてください。':view==='saved'?'追加したエピソードは、ここでまとめて聴けます。':view==='history'?'エピソードを再生すると、ここに履歴が残ります。':'「音声を追加」からMP3を選んでください。'}</div>`;
  updatePlayer();
}
function save(id){saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];write('yr:saved',saved);render();}
function updatePlayer(){
  if(!current)return;
  const c=channel(current.channel);
  $('player-title').textContent=current.title;$('player-channel').textContent=c.name+(current.demo?' · 試聴サンプル':'');
  $('player-art').className='mini-art '+c.id;$('player-art').textContent=c.symbol;
  $('player-save').disabled=false;$('toggle-play').disabled=false;
  $('player-save').textContent=saved.includes(current.id)?'♥':'♡';$('player-save').classList.toggle('saved',saved.includes(current.id));
  $('player-save').setAttribute('aria-pressed',String(saved.includes(current.id)));
  $('toggle-play').textContent=audio.paused?'▶':'Ⅱ';$('toggle-play').setAttribute('aria-label',audio.paused?'再生':'一時停止');
}
async function play(id,buildQueue=true){
  const ep=episodes.find(e=>e.id===id);if(!ep)return;
  if(current?.id===id){if(!audio.paused){audio.pause();return;}try{await audio.play();}catch{toast('再生できませんでした。もう一度お試しください。');}return;}
  if(current)persistPosition();
  switching=true;current=ep;
  if(buildQueue){const visible=list();queue=(visible.some(e=>e.id===id)?visible:episodes).map(e=>e.id);}
  audio.src=ep.audio;audio.defaultPlaybackRate=Number($('speed').value);audio.load();audio.playbackRate=Number($('speed').value);render();
  try{await audio.play();}catch(e){if(e.name!=='AbortError')toast('音声を再生できませんでした。MP3を確認してください。');}
}
function persistPosition(){if(!switching&&current&&Number.isFinite(audio.currentTime)){positions[current.id]=audio.ended?0:audio.currentTime;write('yr:positions',positions);}}
function next(){const i=queue.indexOf(current?.id);const id=queue[i+1];if(id)play(id,false);else toast('最後のエピソードです。');}
audio.addEventListener('loadedmetadata',()=>{audio.playbackRate=Number($('speed').value);if(current){const p=Number(positions[current.id]||0);if(Number.isFinite(p)&&p>0&&p<audio.duration-2)audio.currentTime=p;}switching=false;$('total-time').textContent=time(audio.duration);});
audio.addEventListener('play',()=>{if(current){history=[current.id,...history.filter(id=>id!==current.id)].slice(0,200);write('yr:history',history);}render();});
audio.addEventListener('pause',()=>{persistPosition();render();});
audio.addEventListener('error',()=>{toast('音声を読み込めませんでした。ファイルを確認してください。');updatePlayer();});
audio.addEventListener('timeupdate',()=>{$('current-time').textContent=time(audio.currentTime);$('total-time').textContent=time(audio.duration);$('seek').value=audio.duration?audio.currentTime/audio.duration*100:0;if(Date.now()-lastPositionWrite>4000){persistPosition();lastPositionWrite=Date.now();}});
audio.addEventListener('ended',()=>{if(current){positions[current.id]=0;write('yr:positions',positions);}render();if($('auto-next').checked)next();});
window.addEventListener('pagehide',persistPosition);
$('toggle-play').onclick=()=>{if(current)play(current.id);};
$('hero-play').onclick=()=>play('demo-tech');
$('player-save').onclick=()=>{if(current)save(current.id);};
$('back15').onclick=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,audio.currentTime-15);};
$('forward15').onclick=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,audio.currentTime+15);};
$('next').onclick=next;
$('seek').oninput=e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number(e.target.value)/100;};
$('speed').onchange=e=>{audio.defaultPlaybackRate=Number(e.target.value);audio.playbackRate=Number(e.target.value);};
$('volume').oninput=e=>audio.volume=Number(e.target.value);
$('search').oninput=e=>{query=e.target.value;if(view==='storage')view='home';render();};
$('sort').onchange=render;
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-view],[data-channel],[data-filter],[data-play],[data-save]');if(!b)return;
  if(b.dataset.view){view=b.dataset.view;filter='all';query='';$('search').value='';render();}
  else if(b.dataset.channel){filter=b.dataset.channel;view='home';render();}
  else if(b.dataset.filter){filter=b.dataset.filter;render();}
  else if(b.dataset.play)play(b.dataset.play);
  else if(b.dataset.save)save(b.dataset.save);
});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement.tagName)&&!$('upload-dialog').open){if(current){e.preventDefault();play(current.id);}}});
const dialog=$('upload-dialog');
$('open-upload').onclick=()=>{if(!dialog.open)dialog.showModal();};
$('close-upload').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
function selectFile(f){if(!f)return;selectedFile=f;$('file-label').textContent=f.name+' · '+bytes(f.size);if(!$('upload-title').value)$('upload-title').value=f.name.replace(/\.mp3$/i,'');$('upload-error').textContent='';}
$('upload-file').onchange=e=>selectFile(e.target.files[0]);
for(const ev of ['dragenter','dragover'])$('drop-zone').addEventListener(ev,e=>{e.preventDefault();$('drop-zone').classList.add('dragover');});
for(const ev of ['dragleave','drop'])$('drop-zone').addEventListener(ev,e=>{e.preventDefault();$('drop-zone').classList.remove('dragover');if(ev==='drop'){const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);$('upload-file').files=dt.files;selectFile(f);}}});
async function getDuration(file){return new Promise((resolve,reject)=>{const tmp=new Audio();const u=URL.createObjectURL(file);const done=(err)=>{clearTimeout(timer);tmp.removeAttribute('src');tmp.load();URL.revokeObjectURL(u);err?reject(err):resolve(duration);};let duration=0;const timer=setTimeout(()=>done(new Error('音声の長さを取得できませんでした。別のMP3をお試しください。')),15000);tmp.onloadedmetadata=()=>{duration=tmp.duration;done(Number.isFinite(duration)?null:new Error('音声の長さを確認できませんでした。'));};tmp.onerror=()=>done(new Error('MP3を読み込めませんでした。'));tmp.src=u;});}
$('upload-form').onsubmit=async e=>{
  e.preventDefault();$('upload-error').textContent='';
  const file=selectedFile||$('upload-file').files[0];
  if(!file || !/\.mp3$/i.test(file.name)){ $('upload-error').textContent='MP3ファイルを選んでください。';return; }
  if(file.size>100*1024*1024){$('upload-error').textContent='100 MB以下のMP3を選んでください。';return;}
  $('upload-submit').disabled=true;$('upload-submit').textContent='音声を確認・保存しています…';
  try{
    const duration=await getDuration(file);
    const params=new URLSearchParams({title:$('upload-title').value,channel:$('upload-channel').value,description:$('upload-description').value,source:$('upload-source').value,duration:String(duration)});
    const r=await fetch('/api/episodes?'+params,{method:'POST',headers:{'Content-Type':'audio/mpeg'},body:file});
    const data=await r.json();if(!r.ok)throw new Error(data.error);
    await load();view='home';filter='all';query='';$('search').value='';render();dialog.close();$('upload-form').reset();selectedFile=null;$('file-label').textContent='MP3をドロップ、または選択';toast('ラジオ棚にエピソードを追加しました。');
  }catch(err){$('upload-error').textContent=err.message||'保存できませんでした。もう一度お試しください。';}
  finally{$('upload-submit').disabled=false;$('upload-submit').textContent='ラジオ棚に追加する';}
};
function calculate(){const m=Number($('calc-minutes').value),k=Number($('calc-kbps').value),n=Number($('calc-episodes').value),d=Number($('calc-days').value);const per=m*60*k*1000/8,total=per*n*d,days=Math.floor(10e9/(per*n));$('calc-result').innerHTML=`1本あたり ${bytes(per)}。${n}本 / 日を${d}日保存すると<br><strong>${bytes(total)}</strong> / 10 GBの保存容量目安<br><span>${total<=10e9?'容量の目安はR2無料枠内です。':'容量の目安はR2無料枠を超えます。'} 同じペースなら約${days}日分が10 GBに収まります。</span>`;}
document.querySelectorAll('.calculator select').forEach(s=>s.onchange=calculate);
load().catch(e=>{$('episode-list').innerHTML=`<div class="empty-state"><b>${escape(e.message)}</b>サーバーが起動しているか確認し、ページを再読み込みしてください。</div>`;});
