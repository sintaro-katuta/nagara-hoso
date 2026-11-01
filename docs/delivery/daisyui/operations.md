# 編集と復旧

起動は従来どおり`npm start`。配信されるCSSはビルド済みの`public/styles.css`。

初回編集時に`npm ci`、その後`npm run build`。開発中は別ターミナルで`npm run dev:css`。HTMLまたはJSに新しいTailwind/daisyUIクラスを追加した場合もCSSを再生成する。ソースを変更してビルドを忘れたときは、見た目が更新されないのでビルド後にページを再読み込みする。

`public/styles.css`を直接編集しない。テーマの値は`src/styles.css`、選択肢と保存処理はHTML/JS。テーマ保存先はブラウザ内の`yr:theme`。サーバーのデータ移行はない。

移行前の画面ソースはこのフォルダーの`before.html` / `before.css` / `before.js`に保存した。画面だけを元に戻すときは、それぞれpublic/index.html / styles.css / app.jsへコピーする。音声データは触らない。復旧後にCSSビルドすると新デザインへ戻るため、元の画面を使う間は再ビルドしない。

Blueprint MCPは未導入。既存のCodex設定、ライセンス、Figmaの認証情報に変更はない。必要になった時点でユーザーのライセンスを使用して公式のCodex向け手順に従う。キーをソース・ログ・コミットへ残さない。
