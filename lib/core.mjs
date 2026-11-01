export const channels = [
  {id:'tech', name:'テクノロジー', label:'明日の手ざわり', color:'#5048ba', symbol:'⌘', description:'技術の話を、少しやわらかく。'},
  {id:'life', name:'日常・暮らし', label:'いつもの、よりみち', color:'#477d69', symbol:'☕', description:'答えのない話が、ちょうどいい。'},
  {id:'comedy', name:'コメディ', label:'余白のわらい', color:'#b77735', symbol:'☺', description:'なんでもないことを、面白がる。'},
  {id:'news', name:'ニュース', label:'世の中のとなり', color:'#507c9c', symbol:'◎', description:'立ち止まって、背景から考える。'}
];
export function parseRange(value, size) {
  if (!value) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!m || (!m[1] && !m[2])) return false;
  let start, end;
  if (!m[1]) { const suffix=Number(m[2]); if(!suffix) return false; start=Math.max(0,size-suffix); end=size-1; }
  else { start=Number(m[1]); end=m[2] ? Math.min(Number(m[2]),size-1) : size-1; }
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start>=0 && start<size && end>=start ? {start,end} : false;
}
export function metadata(params) {
  const title=(params.get('title')||'').trim();
  const channel=params.get('channel');
  const duration=Number(params.get('duration')||0);
  if (!title || title.length>160) throw new Error('タイトルを1〜160文字で入力してください。');
  if (!channels.some(c=>c.id===channel)) throw new Error('チャンネルを選んでください。');
  if (!Number.isFinite(duration) || duration<0 || duration>86400) throw new Error('再生時間が正しくありません。');
  const source=params.get('source')||'';
  if (source && !/^https?:\/\//i.test(source)) throw new Error('出典は http または https のURLを入力してください。');
  if (source.length>2000) throw new Error('出典URLが長すぎます。');
  return {title,channel,duration,description:(params.get('description')||'').slice(0,3000),source};
}
export const xml = v => String(v).replace(/[<>&"']/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
export function storageEstimate({minutes=30,kbps=64,episodes=4,days=90}) {
  const bytesPerEpisode=minutes*60*kbps*1000/8;
  return {bytesPerEpisode,totalBytes:bytesPerEpisode*episodes*days,daysWithin10GB:Math.floor(10e9/(bytesPerEpisode*episodes))};
}
