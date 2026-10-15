# ReStandard

## Collection / Lookbook

- 商品写真24枚・着用写真8枚は、2026-10-15に公開中のBASE商品ページで確認したものです。
- `assets/base-products.json` に商品URL・画像の取得元・サイズ・掲載順を記録しています。
- `image/base-products/` のWebP画像をサイトから配信します。BASEの更新が自動で反映される仕組みではありません。
- 商品を更新するときは、画像と上記JSONを更新して `npm run render:products` を実行します。`index.html` の対象2セクションのみを再生成します。
- ループとドラッグは `js/product-marquee.js`、画像サイズは `css/product-marquee.css` が管理します。旧セクション別マーキー・操作スクリプトを同時に読み込まないでください。
- 通常は連続スクロールし、ドラッグ解除・中断・画面復帰後も再開します。OSの「視差効果を減らす」設定では自動移動を止め、横スクロールで閲覧できます。キーボード操作中は対象リンクを見える位置に保ちます。

### 動作確認

`npm install` 後、Chromeをインストールした環境で `npm run test:marquee` を実行します。
320〜3840pxの8段階、全商品の画像とリンク、ループ境界、ドラッグと中断、タップ、画面復帰、モーション抑制、画像読み込み失敗、JavaScript無効時の閲覧を検証します。
