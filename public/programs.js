export const programs=[
 {name:'気持ちのひとしお',image:'sunday',cast:'汐見 凪・橘 悠介'},
 {name:'何でもマンデー',image:'monday',cast:'長谷川 歩・真鍋 紬'},
 {name:'熱血にぃやん',image:'tuesday',cast:'新田 大地'},
 {name:'ミュージック・アワー',image:'wednesday',cast:'音羽 律・朝比奈 灯'},
 {name:'テック・モック',image:'thursday',cast:'久世 理人・相原 澪'},
 {name:'ゴールデンショウタイム',image:'friday',cast:'三崎 千尋・小野寺 岳'},
 {name:'せっかくなんでゆっくりしていきまへんか',image:'saturday',cast:'大槻 源一'}
];
export function episodeProgram(episode){
 if(Number.isInteger(episode.program)&&episode.program>=0&&episode.program<7)return programs[episode.program];
 const match=/^daily-(\d{4}-\d{2}-\d{2})$/.exec(episode.id||'');
 if(match){const date=new Date(match[1]+'T00:00:00Z');if(!Number.isNaN(date.valueOf()))return programs[date.getUTCDay()];}
 return programs.find(p=>episode.title?.startsWith(p.name+'｜'));
}
export function episodeTitle(episode){
 const program=episodeProgram(episode);
 if(program&&episode.title?.startsWith(program.name+'｜'))return episode.title.split('｜').slice(2).join('｜')||episode.title;
 return episode.title;
}
