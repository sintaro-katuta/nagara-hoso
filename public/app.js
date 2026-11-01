import {buildQueue,nextIds} from '/player-model.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k))??fallback;}catch{return fallback;}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
const paths={
 play:'<path d="m9 5 11 7-11 7V5Z" fill="currentColor" stroke="none"/>',
 pause:'<path d="M8 5v14M16 5v14" stroke-width="4"/>',
 bookmark:'<path d="M6 20V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16l-6-4-6 4Z"/>',
 bookmarkFill:'<path d="M6 20V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16l-6-4-6 4Z" fill="currentColor"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 upload:'<path d="M12 4v11m-4-7 4-4 4 4M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 next:'<path d="m6 5 10 7-10 7V5Z" fill="currentColor" stroke="none"/><path d="M19 5v14"/>',
 rewind:'<path d="M5 9a8 8 0 1 1-1 7M5 4v5h5"/>',
 forward:'<path d="M19 9a8 8 0 1 0 1 7M19 4v5h-5"/>',
 volume:'<path d="m11 4-6 5H2v6h3l6 5V4Zm5 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 headphones:'<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 13H3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h3v-7H4Zm16 0h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-3v-7h2Z"/>',
 queue:'<path d="M4 6h16M4 11h12M4 16h8m5-2 5 4-5 4v-8Z"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>'
};
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.play}</svg>`;
const art=(id)=>{
 const shapes={
 tech:'<circle cx="64" cy="64" r="46"/><ellipse cx="64" cy="64" rx="22" ry="46" transform="rotate(-40 64 64)"/><ellipse cx="64" cy="64" rx="22" ry="46" transform="rotate(40 64 64)"/><circle cx="64" cy="64" r="7" fill="currentColor"/>',
 life:'<path d="M64 108V22M64 67C22 70 12 43 22 17c31 0 45 16 42 50Zm0 17c42 3 52-24 42-50-31 0-45 16-42 50Z"/><path d="M29 28 58 59m41-14L70 77"/>',
 comedy:'<circle cx="64" cy="64" r="45"/><path d="M39 72c5 22 45 22 50 0M40 43v9m47-9v9" stroke-width="5"/><circle cx="107" cy="19" r="8" fill="currentColor" stroke="none"/>',
 news:'<circle cx="64" cy="64" r="45"/><ellipse cx="64" cy="64" rx="22" ry="45"/><path d="M20 64h88M27 40h74M27 88h74"/>'
 };
 return `<svg class="art-symbol" viewBox="0 0 128 128" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[id]||shapes.tech}</svg>`;
};
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const appearance=['light','dark','system'];
const preference=read('yr:appearance','light');
$('theme-select').value=appearance.includes(preference)?preference:'light';
const systemTheme=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){const value=$('theme-select').value;const dark=value==='dark'||value==='system'&&systemTheme.matches;document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';document.querySelector('meta[name="theme-color"]').content=dark?'#070f24':'#ffffff';}
$('theme-select').onchange=()=>{write('yr:appearance',$('theme-select').value);applyTheme();};systemTheme.addEventListener('change',applyTheme);applyTheme();
let saved=read('yr:saved',[]),history=read('yr:history',[]),positions=read('yr:positions',{});
if(!Array.isArray(saved))saved=[];if(!Array.isArray(history))history=[];if(!positions||typeof positions!=='object')positions={};
let episodes=[],channels=[],view='home',filter='all',query='',current=null,queue=[],featured=null,selectedFile=null;
let switching=false,lastPositionWrite=0,toastTimer,automaticTitle='';
const audio=$('audio');audio.volume=.8;
const channel=id=>channels.find(c=>c.id===id);
const english={tech:'TECH',life:'LIFE',comedy:'OFFBEAT',news:'WORLD'};
const time=s=>{if(!Number.isFinite(Number(s)))return '0:00';s=Math.max(0,Math.floor(Number(s)));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
const bytes=n=>n>=1e9?`${(n/1e9).toFixed(2)} GB`:n>=1e6?`${(n/1e6).toFixed(1)} MB`:`${(n/1000).toFixed(0)} KB`;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3400);}
$('date-label').textContent=new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
async function load(){
 const r=await fetch('/api/episodes');if(!r.ok)throw new Error('エピソードを読み込めませんでした。');
 const data=await r.json();episodes=data.episodes;channels=data.channels;
 const ordered=[...episodes].sort((a,b)=>new Date(b.date)-new Date(a.date));
 featured=ordered.find(e=>!e.demo)||ordered[0]||null;
 $('channel-cards').innerHTML=channels.map(c=>`<button class="channel-tile ${c.id}" data-channel="${c.id}" aria-label="${esc(c.name)}のエピソードを見る"><div class="channel-art"><span>${english[c.id]}</span>${art(c.id)}</div><div class="channel-text"><div><h3>${esc(c.name)}</h3><p>${episodes.filter(e=>e.channel===c.id).length}エピソード</p></div><span aria-hidden="true">↗</span></div></button>`).join('');
 $('filters').innerHTML=`<button class="filter-tab" data-filter="all">すべて</button>`+channels.map(c=>`<button class="filter-tab" data-filter="${c.id}">${esc(c.name)}</button>`).join('');
 $('upload-channel').innerHTML=channels.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
 $('actual-storage').textContent=bytes(data.storageBytes);$('rail-storage').textContent=bytes(data.storageBytes);
 $('storage-detail').textContent=`${episodes.length}本の音声を保存しています`;
 document.querySelector('.feature-card').hidden=!featured;$('hero-play').disabled=!featured;$('feature-save').disabled=!featured;$('start-listening').disabled=!featured;
 if(featured){const c=channel(featured.channel);$('feature-title').textContent=featured.title;$('feature-category').textContent=c.name;$('feature-description').textContent=featured.description||c.description;$('feature-meta').textContent=`${new Date(featured.date).toLocaleDateString('ja-JP')}　/　${time(featured.duration)}`;$('feature-demo').hidden=!featured.demo;$('feature-art-channel').textContent=c.name;$('feature-art-duration').textContent='▶ '+time(featured.duration);}
 render();calculate();
}
function list(){
 let result=episodes.filter(e=>filter==='all'||e.channel===filter);
 if(view==='saved')result=result.filter(e=>saved.includes(e.id));
 if(view==='history')result=result.filter(e=>history.includes(e.id));
 if(query)result=result.filter(e=>(e.title+' '+e.description+' '+channel(e.channel)?.name).toLowerCase().includes(query.toLowerCase()));
 const sort=$('sort').value;
 if(view==='history')result.sort((a,b)=>history.indexOf(a.id)-history.indexOf(b.id));
 else result.sort((a,b)=>sort==='short'?a.duration-b.duration:sort==='old'?new Date(a.date)-new Date(b.date):new Date(b.date)-new Date(a.date));
 return result;
}
function render(){
 const focused=document.activeElement;
 const listFocus=focused?.closest('#episode-list')&&focused.closest('[data-save],[data-play]');
 const focusKey=listFocus?.hasAttribute('data-save')?'save':'play';
 const focusId=listFocus?.dataset[focusKey];
 const focusIndex=listFocus?[...$('episode-list').querySelectorAll('.episode-row')].indexOf(listFocus.closest('.episode-row')):-1;
 const isHome=view==='home'&&filter==='all'&&!query&&episodes.length>0;
 $('home-content').hidden=!isHome;$('browse-layout').hidden=view==='storage';$('storage-section').hidden=view!=='storage';
 $('main').classList.toggle('is-home',isHome);
 $('page-title').textContent=view==='storage'?'保存容量':view==='saved'?'あとで聴く':view==='history'?'再生履歴':filter!=='all'?channel(filter)?.name:query?'エピソードを検索':isHome?'いつもの毎日に、\nながら放送。':'エピソードを見つける';
 $('page-description').textContent=view==='storage'?'保存している音声と、今後の容量の目安を確認できます。':view==='saved'?'しおりを押して追加したエピソードです。':view==='history'?'前回の続きから聴けます。':filter!=='all'?channel(filter)?.description:isHome?'まだ知らない話に、耳をすませよう。\n技術から日常まで、気ままに聴けるラジオ。':'気になるエピソードを選んで、聴いてみよう。';
 $('list-title').textContent=view==='saved'?'あとで聴くエピソード':view==='history'?'最近聴いたエピソード':query?`「${query}」の検索結果`:filter!=='all'?channel(filter)?.name+'のエピソード':'エピソードを見つける';
 document.querySelectorAll('[data-view]').forEach(el=>{const active=el.dataset.view===view;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 document.querySelectorAll('[data-filter]').forEach(el=>{const active=el.dataset.filter===filter;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
 $('saved-count').textContent=saved.filter(id=>episodes.some(e=>e.id===id)).length;
 const visible=list();$('episode-count').textContent=visible.length+'本';
 $('sort').closest('label').hidden=view==='history';
 $('sort').disabled=view==='history';
 $('sort').title=view==='history'?'最近聴いた順に表示しています':'並び順';
 $('episode-list').innerHTML=visible.length?visible.map(e=>{
  const c=channel(e.channel),active=current?.id===e.id;
  return `<article class="episode-row ${c.id} ${active?'current':''}"><div class="episode-cover">${art(c.id)}</div><div class="episode-body"><div class="episode-meta"><span class="channel-name">${esc(c.name)}</span><span>${new Date(e.date).toLocaleDateString('ja-JP',{month:'2-digit',day:'2-digit'})}</span><span class="episode-duration-inline">${time(e.duration)}</span>${e.demo?'<span class="sample-label">試聴サンプル</span>':''}${e.source?`<a class="source-link" href="${esc(e.source)}" target="_blank" rel="noreferrer">出典 ↗</a>`:''}</div><button class="episode-title" data-play="${e.id}">${esc(e.title)}</button><p class="episode-description">${esc(e.description)}</p></div><div class="episode-actions"><span class="episode-duration">${time(e.duration)}</span><a class="icon-button download-action" href="${e.audio}" download="${esc(e.title)}.mp3" aria-label="${esc(e.title)}をダウンロード">${icon('download')}</a><button class="icon-button ${saved.includes(e.id)?'saved':''}" data-save="${e.id}" aria-label="${esc(e.title)}を${saved.includes(e.id)?'あとで聴くから外す':'あとで聴くに追加'}" aria-pressed="${saved.includes(e.id)}">${icon(saved.includes(e.id)?'bookmarkFill':'bookmark')}</button><button class="episode-play" data-play="${e.id}" aria-label="${esc(e.title)}を${active&&!audio.paused?'一時停止':'再生'}">${icon(active&&!audio.paused?'pause':'play')}</button></div></article>`;
 }).join(''):emptyState();
 if(listFocus){const replacement=$('episode-list').querySelector(`[data-${focusKey}="${CSS.escape(focusId)}"]`)||$('episode-list').querySelectorAll('.episode-row')[Math.max(0,Math.min(focusIndex,visible.length-1))]?.querySelector(`[data-${focusKey}]`)||$('episode-list').querySelector('button');replacement?.focus({preventScroll:true});}
 if(featured){const active=current?.id===featured.id&&!audio.paused;$('hero-play').querySelector('[data-icon]').innerHTML=icon(active?'pause':'play');$('start-listening').querySelector('[data-icon]').innerHTML=icon(active?'pause':'play');$('start-listening-label').textContent=active?'一時停止':'最新のエピソードを聴く';$('feature-action-label').textContent=active?'一時停止':'エピソードを聴く';$('feature-save').innerHTML=icon(saved.includes(featured.id)?'bookmarkFill':'bookmark');$('feature-save').setAttribute('aria-pressed',String(saved.includes(featured.id)));$('feature-save').setAttribute('aria-label',`最新エピソードを${saved.includes(featured.id)?'あとで聴くから外す':'あとで聴くに追加'}`);}
 renderQueue();updatePlayer();
}
function emptyState(){
 const filtered=query||filter!=='all';
 const title=filtered?'条件に合うエピソードがありません':view==='saved'?'あとで聴くエピソードはありません':view==='history'?'まだ再生履歴がありません':'エピソードはまだありません';
 const description=filtered?'検索の言葉やチャンネルを変えてみてください。':view==='saved'?'エピソードのしおりを押すと、ここに追加できます。':view==='history'?'エピソードを再生すると、ここに表示されます。':'MP3ファイルを追加すると、ここから聴けます。';
 const action=filtered?'clear-filters':view==='saved'||view==='history'?'browse':'add-audio';
 const label=filtered?'検索・絞り込みを解除':action==='browse'?'エピソードを探す':'音声を追加';
 return `<div class="empty-state"><b>${title}</b><p>${description}</p><button class="text-action" data-action="${action}">${label} <span aria-hidden="true">→</span></button></div>`;
}
function renderQueue(){
 const ids=current?nextIds(queue,current.id):list().map(e=>e.id);
 const upcoming=ids.map(id=>episodes.find(e=>e.id===id)).filter(Boolean);
 $('queue-description').textContent=current?`このあとの再生予定：${upcoming.length}本`:'選んだエピソードから順番に再生します。';
 $('queue-list').innerHTML=upcoming.slice(0,3).map(e=>`<button class="queue-item ${e.channel}" data-play="${e.id}" data-from-queue="true" aria-label="再生：${esc(e.title)}"><span class="queue-cover">${art(e.channel)}</span><span><b>${esc(e.title)}</b><small>${esc(channel(e.channel)?.name)} · ${time(e.duration)}</small></span><span class="queue-play">${icon('play')}</span></button>`).join('')||`<p class="queue-empty">${current?'次のエピソードはありません。':'エピソードを選ぶと、ここに表示されます。'}</p>`;
}
function save(id){const removing=saved.includes(id);saved=removing?saved.filter(x=>x!==id):[...saved,id];write('yr:saved',saved);render();toast(removing?'あとで聴くから外しました。':'あとで聴くに追加しました。');}
function updatePlayer(){
 const ready=!!current&&Number.isFinite(audio.duration)&&audio.duration>0;
 for(const id of ['back15','forward15','seek'])$(id).disabled=!ready;
 $('next').disabled=!current||nextIds(queue,current.id).length===0;
 if(!current){$('player-art').innerHTML=art('tech');return;}
 const c=channel(current.channel);$('player-art').className='player-cover '+c.id;$('player-art').innerHTML=art(c.id);
 $('player-title').textContent=current.title;$('player-channel').textContent=c.name+(current.demo?' · 試聴サンプル':'');
 $('player-save').disabled=false;$('toggle-play').disabled=false;
 $('player-save').innerHTML=icon(saved.includes(current.id)?'bookmarkFill':'bookmark');$('player-save').classList.toggle('saved',saved.includes(current.id));$('player-save').setAttribute('aria-pressed',String(saved.includes(current.id)));
 $('player-save').setAttribute('aria-label',`再生中のエピソードを${saved.includes(current.id)?'あとで聴くから外す':'あとで聴くに追加'}`);
 $('toggle-play').innerHTML=icon(audio.paused?'play':'pause');$('toggle-play').setAttribute('aria-label',audio.paused?'再生':'一時停止');
}
function persistPosition(){if(!switching&&current&&Number.isFinite(audio.currentTime)){positions[current.id]=audio.ended?0:audio.currentTime;write('yr:positions',positions);}}
async function play(id,build=true){
 const ep=episodes.find(e=>e.id===id);if(!ep)return;
 if(current?.id===id){if(!audio.paused){audio.pause();return;}try{await audio.play();}catch{toast('再生できませんでした。もう一度お試しください。');}return;}
 if(current)persistPosition();switching=true;current=ep;
 if(build||!queue.includes(id))queue=buildQueue(list(),episodes,id);
 audio.src=ep.audio;audio.defaultPlaybackRate=Number($('speed').value);audio.load();audio.playbackRate=Number($('speed').value);$('current-time').textContent='0:00';$('total-time').textContent=time(ep.duration);$('seek').value=0;render();
 try{await audio.play();}catch(e){if(e.name!=='AbortError')toast('音声を再生できませんでした。MP3を確認してください。');}
}
function next(){if(!current)return toast('まずエピソードを選んでください。');const id=nextIds(queue,current.id)[0];if(id)play(id,false);else toast('最後のエピソードです。');}
audio.addEventListener('loadedmetadata',()=>{audio.playbackRate=Number($('speed').value);if(current){const p=Number(positions[current.id]||0);if(Number.isFinite(p)&&p>0&&p<audio.duration-2)audio.currentTime=p;}switching=false;$('total-time').textContent=time(audio.duration);updatePlayer();});
audio.addEventListener('play',()=>{if(current){history=[current.id,...history.filter(id=>id!==current.id)].slice(0,200);write('yr:history',history);}render();});
audio.addEventListener('pause',()=>{persistPosition();render();});
audio.addEventListener('error',()=>{toast('音声を読み込めませんでした。ファイルを確認してください。');updatePlayer();});
audio.addEventListener('timeupdate',()=>{$('current-time').textContent=time(audio.currentTime);$('total-time').textContent=time(audio.duration);$('seek').value=audio.duration?audio.currentTime/audio.duration*100:0;if(Date.now()-lastPositionWrite>4000){persistPosition();lastPositionWrite=Date.now();}});
audio.addEventListener('ended',()=>{if(current){positions[current.id]=0;write('yr:positions',positions);}render();if($('auto-next').checked)next();});
window.addEventListener('pagehide',persistPosition);
$('hero-play').onclick=()=>{if(featured)play(featured.id);};$('feature-save').onclick=()=>{if(featured)save(featured.id);};
$('start-listening').onclick=()=>{if(featured)play(featured.id);};
function closeMenu(){document.querySelector('.site-header').classList.remove('menu-open');$('menu-toggle').setAttribute('aria-expanded','false');$('menu-toggle').setAttribute('aria-label','メニューを開く');}
$('menu-toggle').onclick=()=>{const open=document.querySelector('.site-header').classList.toggle('menu-open');$('menu-toggle').setAttribute('aria-expanded',String(open));$('menu-toggle').setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('menu-toggle').getAttribute('aria-expanded')==='true'){closeMenu();$('menu-toggle').focus();}});
$('toggle-play').onclick=()=>{if(current)play(current.id);};$('player-save').onclick=()=>{if(current)save(current.id);};
$('back15').onclick=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,audio.currentTime-15);};$('forward15').onclick=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,audio.currentTime+15);};$('next').onclick=next;
$('seek').oninput=e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number(e.target.value)/100;};$('speed').onchange=e=>{audio.defaultPlaybackRate=Number(e.target.value);audio.playbackRate=Number(e.target.value);};$('volume').oninput=e=>audio.volume=Number(e.target.value);
$('search').oninput=e=>{query=e.target.value.trim();render();};$('sort').onchange=render;
document.addEventListener('click',e=>{const b=e.target.closest('[data-view],[data-channel],[data-filter],[data-play],[data-save],[data-action]');if(!b)return;
 if(b.dataset.action){if(b.dataset.action==='add-audio'){modal.show();return;}if(b.dataset.action==='retry'){load().catch(showLoadError);return;}if(b.dataset.action==='browse')view='home';filter='all';query='';$('search').value='';render();$('search').focus();}
 else if(b.dataset.view){view=b.dataset.view;filter='all';query='';$('search').value='';closeMenu();render();}
 else if(b.dataset.channel){filter=b.dataset.channel;view='home';query='';$('search').value='';render();$('episodes-section').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
 else if(b.dataset.filter){filter=b.dataset.filter;render();}
 else if(b.dataset.play)play(b.dataset.play,b.dataset.fromQueue!=='true');
 else if(b.dataset.save)save(b.dataset.save);
});
const modalElement=$('upload-dialog');
const modal=new window.Modal(modalElement,{placement:'center',backdrop:'dynamic',closable:true,onShow:()=>{document.querySelector('.skip-link').inert=true;document.querySelector('main').inert=true;document.querySelector('.site-header').inert=true;document.querySelector('.player-bar').inert=true;$('close-upload').focus();},onHide:()=>{document.querySelector('.skip-link').inert=false;document.querySelector('main').inert=false;document.querySelector('.site-header').inert=false;document.querySelector('.player-bar').inert=false;$('open-upload').focus();}},{id:'radio-upload',override:true});
$('open-upload').onclick=()=>modal.show();$('close-upload').onclick=()=>modal.hide();
modalElement.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const focusable=[...modalElement.querySelectorAll('button,input,select,textarea,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(document.activeElement.tagName)&&modal.isHidden()&&current){e.preventDefault();play(current.id);}});
function selectFile(f){if(!f||$('upload-submit').disabled)return;selectedFile=f;$('file-label').textContent=f.name+' · '+bytes(f.size);if(!$('upload-title').value||$('upload-title').value===automaticTitle){automaticTitle=f.name.replace(/\.mp3$/i,'');$('upload-title').value=automaticTitle;}$('upload-error').textContent='';}
$('upload-file').onchange=e=>selectFile(e.target.files[0]);
for(const name of ['dragenter','dragover'])$('drop-zone').addEventListener(name,e=>{e.preventDefault();$('drop-zone').classList.add('dragover');});
for(const name of ['dragleave','drop'])$('drop-zone').addEventListener(name,e=>{e.preventDefault();$('drop-zone').classList.remove('dragover');if(name==='drop'&&!$('upload-submit').disabled){const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);$('upload-file').files=dt.files;selectFile(f);}}});
async function durationOf(file){return new Promise((resolve,reject)=>{const tmp=new Audio(),url=URL.createObjectURL(file);let duration=0,finished=false;const done=error=>{if(finished)return;finished=true;clearTimeout(timer);tmp.onloadedmetadata=null;tmp.onerror=null;tmp.removeAttribute('src');tmp.load();URL.revokeObjectURL(url);error?reject(error):resolve(duration);};const timer=setTimeout(()=>done(new Error('音声の長さを取得できませんでした。別のMP3をお試しください。')),15000);tmp.onloadedmetadata=()=>{duration=tmp.duration;done(Number.isFinite(duration)?null:new Error('音声の長さを確認できませんでした。'));};tmp.onerror=()=>done(new Error('MP3を読み込めませんでした。'));tmp.src=url;});}
$('upload-form').onsubmit=async e=>{e.preventDefault();if($('upload-submit').disabled)return;$('upload-error').textContent='';const file=selectedFile||$('upload-file').files[0];
 if(!file||!/\.mp3$/i.test(file.name)){$('upload-error').textContent='MP3ファイルを選んでください。';return;}if(file.size>100*1024*1024){$('upload-error').textContent='100 MB以下のMP3を選んでください。';return;}
 const details={title:$('upload-title').value,channel:$('upload-channel').value,description:$('upload-description').value,source:$('upload-source').value};
 const fields=[...$('upload-form').querySelectorAll('input,select,textarea')];fields.forEach(field=>field.disabled=true);
 $('upload-submit').disabled=true;$('upload-submit').textContent='音声を確認・保存しています…';
 try{const duration=await durationOf(file);const params=new URLSearchParams({...details,duration:String(duration)});const r=await fetch('/api/episodes?'+params,{method:'POST',headers:{'Content-Type':'audio/mpeg'},body:file});const result=await r.json();if(!r.ok)throw new Error(result.error);view='home';filter='all';query='';$('search').value='';await load();modal.hide();$('upload-form').reset();selectedFile=null;automaticTitle='';$('file-label').textContent='MP3をドロップ、または選択';toast('音声を追加しました。');}catch(error){$('upload-error').textContent=error instanceof TypeError?'保存できませんでした。接続を確認して、もう一度お試しください。':error.message||'保存できませんでした。もう一度お試しください。';}finally{fields.forEach(field=>field.disabled=false);$('upload-submit').disabled=false;$('upload-submit').textContent='音声を追加する';}
};
function calculate(){const m=Number($('calc-minutes').value),k=Number($('calc-kbps').value),n=Number($('calc-episodes').value),d=Number($('calc-days').value),per=m*60*k*1000/8,total=per*n*d;$('calc-result').innerHTML=`1本 ${bytes(per)} × ${n}本 / 日 × ${d}日<br><strong>${bytes(total)}</strong><br><span>追加する音声に必要な容量の目安です。</span>`;}
document.querySelectorAll('.calculator select').forEach(s=>s.onchange=calculate);
function showLoadError(){const message='エピソードを読み込めませんでした。';$('episode-list').innerHTML=`<div class="empty-state"><b>${message}</b><button class="text-action" data-action="retry">もう一度読み込む →</button></div>`;toast(message);}
updatePlayer();
load().catch(showLoadError);
