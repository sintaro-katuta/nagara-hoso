# Flowbite版の検証結果

2026-10-22 / macOS / Node.js v26.11.0 / Brave。

## ビルドと自動テスト

- `npm run build`：成功。CSSとローカルFlowbiteランタイムを生成。Node 26のmodule.register非推奨警告は出るが、ビルドは正常終了。
- `node --check public/app.js` / `server.mjs` / `scripts/build.mjs`：成功。
- `npm test`：最終状態で8件成功、0件失敗。既存の保存・並行追加・再起動復元・不正入力・RSS・部分配信に加え、Flowbiteとplayer-modelの配信、絞り込みキュー、重複除去、末尾動作を確認。
- Flowbite導入・daisyUI削除時のnpm監査：0 vulnerabilities。
- 実際の導入版：Flowbite 4.0.2、Flowbite MCP 1.1.5、MCP SDK 1.32.1、Tailwind/CLI 4.3.0。

## MCPの接続と利用

- `npm run mcp:context`相当の実行で公式MCPへSTDIO接続。72リソースと2ツールを取得。
- buttons/cards/navbar/modal/forms/tabsの6資料をMCPから読み、mcp/へ保存。
- `generate-theme`を実際に実行し、ブランド配色の応答をmcp/theme-response.jsonへ保存してテーマ設計に利用。
- `codex mcp add flowbite -- /opt/homebrew/bin/node .../flowbite-mcp/build/index.js --mode stdio`：登録成功。
- `codex mcp get flowbite --json`：enabled=true、stdio、APIキー・環境変数なしを確認。
- Figma変換ツールは未実行。

## 実ブラウザ

1. 従来のサイドバー/卓上ラジオから横型ナビ/番組特集/カバー棚へ切り替わり、既存6エピソードを表示。通常音声の28:50の番組を特集することを確認。
2. 既存の試聴音声を実再生し一時停止。途中位置約17.82秒から再開し、右のキューに残り3本を表示。
3. 終端へシークすると次の「いつもの道を、ひとつ曲がってみる。」へ自動移動。playbackRate=1.5が維持され、キューが残り2本へ更新されることを確認。
4. 4318番の隔離した空ライブラリでFlowbite ModalからMP3を選択し、タイトル・チャンネル・説明を入力して保存。成功通知、一覧1本、特集の更新を確認。
5. その音声を再生し、あとで聴くへ追加。再読み込み後も1本とブックマークが残り、duration=30.790667秒のMP3を実再生・一時停止できることを確認。利用中の4317番の音声データは変更していない。
6. 隔離環境のタブとサーバーは停止し、一時データを削除。
7. ダーク表示へ変更して全体が反映され、再読み込み後もダークが保持されることを確認。最終状態はライトへ戻した。
8. viewport 390×844、スクロールバー表示時の実幅375pxでホーム・一覧・プレーヤー・ライブラリを確認。clientWidth=scrollWidth=375pxで横はみ出しなし。スマホでも再生速度を操作可能。
9. ライブラリで音質を128 kbpsに変更し、30分×4本/日×90日の試算が10.37 GBと表示されることを確認。
10. モーダルを開き、閉じるボタンからShift+Tabで最後の追加ボタンへ循環することを確認。Escapeで閉じるとフォーカスが音声を追加ボタンへ戻る。表示中は背景の内容がAXツリーから除外されることを確認。
11. 最後にviewport指定を解除し、ライト表示のホームで引き渡し。ブラウザconsoleのerror/warnは0件。

画面記録：[PC](preview.png) / [スマホ](mobile.png)。

## 要件対応と制限

要件1→MCP接続/登録/資料取得とnpm依存、2→新HTML/CSSと画面記録、3→既存回帰テスト/実ファイル再生、4→特集更新と隔離追加試験、5→キュー単体テスト/自動次曲/倍速、6→モバイル/テーマ/READMEとoperations.md。

公開、日次生成処理の接続、Figma、外部Podcastサービス登録、iOS実機のバックグラウンド再生は未検証・未実施。Codexのこのターンの通常ツール一覧への動的追加は確認していないが、公式MCPとの実プロトコル接続とツール実行、およびCodexへの登録は確認済み。
