# 設計

Node標準HTTP + HTML/JS。Flowbite移行後のCSSは `src/styles.css` をTailwind CLIで `public/styles.css` にビルドする。FlowbiteとTailwindは開発依存のみ。起動はビルド済みCSSを使い、外部CDNやフォント取得は不要。詳細は `../flowbite/design.md`。

配色：Ink #292c3e、Paper #fafbfe、Radio Violet #5048ba、Lavender #edecf7、Sage #477d69、Amber #b77735。見出しはAvenir Next / Hiragino、本文はHiragino Sans、日付と再生時間はSFMono。ラベンダー色の卓上ラジオをCSSで描き、番組棚は静かな一覧で構成。固定プレーヤーでページ内移動中の再生を維持。

画面 → POST /api/episodes（MP3本体、URLクエリで番組情報） → data/audioのUUIDファイル → 一時JSONのatomic rename → GET /api/episodesで一覧更新。JSON保存を直列化し並行追加の取りこぼしを防ぐ。音声はRangeリクエストに対応。

100 MiB上限、空タイトル・未知のチャンネル・不正な再生時間・出典スキームを拒否。MP3は先頭ヘッダーを簡易確認し、画面追加時はブラウザでもデコード可能性と長さを確認。API単体は完全なMP3デコード検証をしない。CSP、表示テキストのエスケープ、RSSのXMLエスケープ、localhostのHost/Origin制限を使用。認証はないため公開運用は対象外。localhost内の別プロセスによる操作は防がない。

仕様と対応：要件1→一覧/フィルター、2→保存API/ingest、3→HTMLAudioElement、4→localStorage、5→容量画面、6→demo生成/RSS/レスポンシブCSS、7→README/運用文書。
