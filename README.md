# ReStandard

## BASE連携の商品ページ（公開前）

ユーザー指定の公開ストアから71商品・523画像を取得し、商品一覧・詳細とブランド・カテゴリー一覧へ展開しました。本番公開の承認待ちです。現在の確認用デザインはユーザー了承済みです。

- `npm run sync:public`：公開ストア全件を再取得し、固定URLを維持して更新。Python 3とNode.jsを使用。
- `npm run validate:catalog`：全商品の情報・内部リンク・画像URLを検証し、対応表を生成。
- `npm run build:catalog`：全件のnoindex確認ページを `.catalog-preview/` に生成。
- `npm run build:catalog:site`：検証済みデータから `.catalog-dist/` に本番用ファイルを生成。これだけでは公開されません。
- `npm run preview:catalog`：`http://127.0.0.1:4173/products/` で動作確認。絞り込みも使えます。
- `npm run test:catalog`：同期失敗・削除・在庫0・構造化データなどのテスト。
- `npm run test:catalog:browser`：ChromeとPlaywrightでレスポンシブ・画像・実タッチ・JS無効を検証。
- `npm run sync:catalog`：`BASE_API_TOKEN`（items.read / user.read）を設定後、公式全件データを取得。BASEへの書込みは行いません。

現在は認証不要の公開ストア方式で、更新は手動同期です。価格・売り切れ表示は確認時点として表示し、24時間後にBASEでの確認案内へ切り替えます。正確な在庫数・非公開商品の情報は未取得です。API方式へ移行する場合は秘密情報を環境変数に設定し、`.env.example`を参照してください（.envの自動読込みは行いません）。

Netlifyの公開先は `.catalog-dist/` に限定し、商品ルートを `_infra/catalog-functions/catalog.mjs` が処理します。管理用の `.catalog-private/` やソースコードは公開フォルダーへコピーしません。本番GitHub mainへの反映はユーザーの承認後に実施します。

取得方法・SEO・制限・検証結果は [実装記録](docs/catalog-implementation.md)、71件の対応表は [全商品一覧](docs/catalog-all-products.md) を参照してください。

## Collection / Lookbook

- 最新の指定に従い、写真はBASEの対応商品へ直接遷移します。独立した商品一覧は共通ナビゲーションの「Products」から開きます。
- 商品写真24枚・着用写真8枚は、2026-10-15に公開中のBASE商品ページで確認したものです。
- `assets/base-products.json` に商品URL・画像の取得元・サイズ・掲載順を記録しています。
- `image/base-products/` のWebP画像をサイトから配信します。BASEの更新が自動で反映される仕組みではありません。
- 商品を更新するときは、画像と上記JSONを更新して `npm run render:products` を実行します。`index.html` の対象2セクションのみを再生成します。
- ループとドラッグは `js/product-marquee.js`、画像サイズは `css/product-marquee.css` が管理します。旧セクション別マーキー・操作スクリプトを同時に読み込まないでください。
- 通常は連続スクロールし、ドラッグ解除・中断・画面復帰後も再開します。OSの「視差効果を減らす」設定では自動移動を止め、横スクロールで閲覧できます。キーボード操作中は対象リンクを見える位置に保ちます。

### 動作確認

`npm install` 後、Chromeをインストールした環境で `npm run test:marquee` を実行します。
320〜3840pxの8段階、全商品の画像とリンク、ループ境界、ドラッグと中断、タップ、画面復帰、モーション抑制、画像読み込み失敗、JavaScript無効時の閲覧を検証します。

## 既存ページの共通デザイン

`css/editorial.css` と `js/editorial.js` を既存ページ・記事テンプレートに適用しています。`npm run test:editorial` で主要ページ5画面幅・記事・メニュー・言語切替を検証します。詳細は [更新報告](docs/editorial-update.md) を参照してください。
