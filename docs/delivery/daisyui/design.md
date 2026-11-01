# 設計

daisyUI 5.7.50、Tailwind CSSとCLI 4.3.0を開発依存として導入。`package-lock.json`で間接依存も固定する。最新CLIで監査指摘があったため、互換範囲で解消可能な4.3.0に揃え、`npm audit fix`（forceなし）で監査0件にした。

`src/styles.css`を入力とし、`npm run build`で`public/styles.css`を生成。Tailwindの探索対象は`public/index.html`と`public/app.js`だけに限定。既存の静的ファイル配信パスをそのまま使用し、サーバーや保存APIは変更しない。

利用コンポーネント：btn、card、badge、menu、navbar、tabs、list、stats、input、select、textarea、modal/modal-box、range、toggle、alert/toast。独自CSSは配置、文字組、卓上ラジオの絵、チャンネル色、レスポンシブ表示を担当。daisyUIはutilitiesレイヤーを使うため、アプリ固有の配置ルールはレイヤー外に置き、意図した表示を保つ。

テーマ：初版の紫を引き継ぐカスタム`yorimichi`、標準`dim`、標準`nord`。画面上の各色はdaisyUIのセマンティック変数を参照。テーマは許可リストで検証してから`data-theme`へ設定し、localStorage `yr:theme`へ保存する。外部画像・フォント・CDNへのリクエストは増やさない。

モーダルは標準dialogのshowModal/EscapeにdaisyUIの見た目を適用。外側のdialogをクリックすると閉じる。既存のファイル入力、検証、アップロード処理は維持。

Blueprint MCP：指定の公式ページはLICENSE/EMAIL等の設定を案内している。ライセンスキーが提供されていないため設定も実行もしない。daisyUI本体の利用にMCPは必要ない。

要件1→依存/コンポーネント、2→CSSブレークポイント、3→既存JS/APIと回帰テスト、4→build/dev:css/README、5→公式手順の確認とREADMEの状態説明。
