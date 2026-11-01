import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'data');await mkdir(path.join(dir,'audio'),{recursive:true});
let existing=[];try{existing=JSON.parse(await readFile(path.join(dir,'episodes.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const samples=[
 {channel:'tech',title:'AIと暮らす、ちょっと先のふつう。',description:'新しい技術も、コーヒー片手に。AIとの付き合い方を考えるオリジナル試聴サンプル。',text:'おはようございます。ながら放送、明日の手ざわりです。この音声は、サイトの再生を試すための短いサンプルです。今日のテーマは、AIと暮らす、ちょっと先のふつう。新しい道具が増えると、何ができるかを探したくなりますよね。でも、朝の準備をしながら聞きたい話を選ぶ。そんな小さな使い方にも、技術の面白さがあると思います。あなたなら、毎日のどんな時間にAIを使ってみたいですか。それでは、今日もよいよりみちを。'},
 {channel:'life',title:'いつもの道を、ひとつ曲がってみる。',description:'遠回りした朝に見つけたもの。散歩とコーヒーについての、短い試聴サンプル。',text:'おはようございます。ながら放送、いつもの、よりみちです。これは再生を体験するための短いサンプルです。今日は、いつもの道をひとつ曲がってみるお話。毎日同じ道を歩いていると、街を知っている気になります。でも、角をひとつ変えるだけで、小さな花屋や、知らなかったベンチに出会うことがあります。遠くまで行かなくても、旅は始められるんですね。コーヒーを買ったら、今日は少しだけ遠回り。そんな朝も、いいかもしれません。'},
 {channel:'comedy',title:'冷蔵庫の前で、何を忘れたんだっけ。',description:'日常の小さな「あるある」を面白がる。オリジナルの短い試聴サンプル。',text:'おはようございます。ながら放送、余白のわらいです。この音声は短い試聴用のサンプルです。冷蔵庫を開けて、何を取りに来たか忘れること、ありませんか。冷たい空気を浴びながら、真剣に考える。私は何を求めてここに来たのか。急に哲学みたいになるんです。でも閉めて、部屋に戻ると思い出すんですよね。そうだ、牛乳だ。もう一度開けたら、今度はプリンが目に入る。目的を忘れても、よりみちは続きます。今日も、ほどほどにいきましょう。'},
 {channel:'news',title:'ニュースを読む前に、ひと呼吸。',description:'見出しの先にある背景を考える。時事速報ではなく、ニュースの読み方を話す試聴サンプル。',text:'おはようございます。ながら放送、世の中のとなりです。これは最新ニュースの配信ではなく、サイトのための短い試聴サンプルです。今日は、ニュースを読む前に、ひと呼吸というお話。気になる見出しを見たら、まず日付と出典を確かめてみる。そして、起きたことと、誰かの意見を分けて考えてみる。同じ出来事も、違う視点から見ると、新しい疑問が見つかります。すぐに結論を出さず、背景を少し調べてみる。それも、ひとつのよりみちですね。'}
];
for(let i=0;i<samples.length;i++){
 const s=samples[i],id='demo-'+s.channel;if(existing.some(e=>e.id===id)){console.log('Already exists:',id);continue;}
 const script=path.join(dir,id+'.txt'),aiff=path.join(dir,id+'.aiff'),mp3=path.join(dir,'audio',id+'.mp3');
 await writeFile(script,s.text);
 execFileSync('say',['-v','Kyoko','-r','210','-f',script,'-o',aiff]);
 execFileSync('/opt/homebrew/bin/ffmpeg',['-y','-hide_banner','-loglevel','error','-i',aiff,'-codec:a','libmp3lame','-b:a','64k','-ar','24000','-ac','1',mp3]);
 const duration=Number(execFileSync('/opt/homebrew/bin/ffprobe',['-v','quiet','-show_entries','format=duration','-of','csv=p=0',mp3],{encoding:'utf8'}).trim());
 existing.push({id,channel:s.channel,title:s.title,description:s.description,duration,size:(await stat(mp3)).size,date:new Date(Date.now()-i*3600000).toISOString(),audio:'/audio/'+id+'.mp3',source:'',demo:true});
 console.log(id,duration.toFixed(1)+'s');
}
await writeFile(path.join(dir,'episodes.json'),JSON.stringify(existing,null,2));
