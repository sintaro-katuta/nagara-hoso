// Trial assignments agreed in conversation; pronunciations are used in generated speech.
export const weeklyPrograms = [
 {weekday:0,title:'気持ちのひとしお',channel:'life',focus:'一週間の出来事と気持ちを、無理に前向きにまとめず振り返る',cast:[{id:'nagi',name:'汐見 凪',reading:'しおみ なぎ',voice:'みちのくあいり',style:'標準'},{id:'yusuke',name:'橘 悠介',reading:'たちばな ゆうすけ',voice:'すきやき馬太郎',style:'ノーマル'}]},
 {weekday:1,title:'何でもマンデー',channel:'life',focus:'身近な疑問、雑学、最近気になったことから自由に寄り道する',cast:[{id:'ayumu',name:'長谷川 歩',reading:'はせがわ あゆむ',voice:'らせつん',style:'標準'},{id:'tsumugi',name:'真鍋 紬',reading:'まなべ つむぎ',voice:'まい',style:'ノーマル'}]},
 {weekday:2,title:'熱血にぃやん',channel:'life',focus:'仕事や生活の悩み、小さな挑戦を、失敗談を交えて励ます',cast:[{id:'daichi',name:'新田 大地',reading:'にった だいち',voice:'阿井田 茂',style:'ノーマル'}]},
 {weekday:3,title:'ミュージック・アワー',channel:'life',focus:'音楽の思い出、聴き方、音や曲にまつわる発見を話す',cast:[{id:'ritsu',name:'音羽 律',reading:'おとわ りつ',voice:'fumifumi',style:'ノーマル'},{id:'tomoshibi',name:'朝比奈 灯',reading:'あさひな ともしび',voice:'コハク',style:'ノーマル'}]},
 {weekday:4,title:'テック・モック',channel:'tech',focus:'技術や道具の仕組みを身近な具体例から考える',cast:[{id:'rihito',name:'久世 理人',reading:'くぜ りひと',voice:'にせ',style:'ノーマル'},{id:'mio',name:'相原 澪',reading:'あいはら みお',voice:'花音',style:'ノーマル'}]},
 {weekday:5,title:'ゴールデンショウタイム',channel:'life',focus:'買い物、節約、給料、サブスク、貯金など、お金と暮らしを考える',cast:[{id:'chihiro',name:'三崎 千尋',reading:'みさき ちひろ',voice:'まお',style:'ノーマル'},{id:'gaku',name:'小野寺 岳',reading:'おのでら がく',voice:'澤原 玄二郎',style:'ノーマル'}]},
 {weekday:6,title:'せっかくなんでゆっくりしていきまへんか',channel:'life',focus:'おじさんの体験談や生活の小話から脱線を楽しむ',cast:[{id:'genichi',name:'大槻 源一',reading:'おおつき げんいち',voice:'ろてじん（長老ボイス）',style:'ノーマル'}]}
];

export function programForDate(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('日付は YYYY-MM-DD で指定してください。');
 const parsed=new Date(`${date}T00:00:00Z`);
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw new Error('実在する日付を指定してください。');
 return weeklyPrograms[parsed.getUTCDay()];
}
