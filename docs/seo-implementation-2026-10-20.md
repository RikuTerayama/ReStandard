# ReStandard SEO改善実装・公開前検証（2026-10-20）

対象: https://restandard-2025.netlify.app/ 。開始時のGitHub mainは `8f5ffa6412de660aba6a9ec57820cef3972ca676`。Netlifyの既存設定は `npm run build:catalog:site` → `.catalog-dist`、商品ページは既存のFunction。デザイン、商品データ、画像、価格、4分類フッター、GPTBotの方針は変更しない。

## 発見と修正

| 発見 | 実施内容 |
| --- | --- |
| NewsのJSON-LD構文エラー | 既知4記事に加え、サイトマップ未掲載のHarley記事にも発見。計5記事・6ブロックを修復。全18記事のJSON-LDを安全なJSONシリアライズで生成する方式に統一。 |
| JSONと本文の不一致 | Articleのheadlineを実際のH1、descriptionをページの説明、公開日を本文の表示日、URLをcanonicalに一致。未確認のdateModified・画像寸法・ロゴ参照を削除。 |
| 仮の会社情報 | トップの `+81-3-1234-5678`、未確認の営業時間、LocalBusiness/priceRange、BrandをOfferとして記載した不適切な定義を除去。Organizationは名称・URL・既存フッターの公式SNSリンクに限定。 |
| 未実装の検索機能 | WebSiteのSearchActionを削除。検索機能を新設したとは記載しない。 |
| SNS参照の不一致 | OrganizationのFacebook・X等を既存フッターのリンクと一致させた。本文は変更していない。 |
| 重複するNews検索用タイトル、二重エンティティ | 検索用title・OG/Twitterの見出しを既存のH1から生成。記事本文・商品名は変更しない。 |
| サイトマップ欠落 | `/news/harley-of-scotland/`、`/news/untitled/` を追加。 |
| News一覧のURL重複 | 正規URLを `/news.html` に統一。内部リンク・パンくず・サイトマップを一致。`/news` と `/news/` は正規URLへ301転送。ほかの既存静的ページの拡張子なし別名も同様に統一。 |
| 24件の固定lastmod | 2025-01-20は記事の掲載日より前で、現在の更新状況を示せない。正確な重要更新履歴がないため省略。ビルド日時・ファイル更新日時・記事公開日を代用しない。 |
| 手動管理のサイトマップ | 公開対象の静的ページと実在するNews記事からビルド時に生成。商品・ブランド・カテゴリーは既存の公開カタログから生成。noindexを除外し、重複・欠落・非正規URLでビルドを停止。 |
| News一覧のJavaScript依存 | 既存カードの画像・文言・並び・日付・デザインを維持して事前HTML化。JSを無効にしても記事リンクを取得可能。JSによる二重追加を防止。 |
| 壊れた内部リンク | Rockmount記事のトップURL末尾に混入した不可視文字と絵文字を除去。表示テキストは変更しない。 |
| モバイルで言語切り替え時のJS例外 | Contact・Locationに残っていた旧Bootstrapメニューのクリック処理を削除。共通ヘッダーの処理は維持。 |

## 検証範囲と結果

`docs/seo-validation.json` に119ページそれぞれのURL・title・description・canonical・index方針・H1・画像数・schema種別・エラーを記録。検索対象118ページ、404案内1ページはnoindex。サイトマップは静的26 + カタログ92 = **118 URL**。

自動監査はtitle/description/canonicalの有無と重複、robots、H1、viewport、JA/EN操作部品、4分類フッター、altの欠落、全JSON-LDの構文と主要プロパティ、商品画像の順序、記事の表示との一致、内部リンク先とフラグメント、ローカル画像ファイル、孤立ページ、サイトマップ全件一致を確認する。代替テキストの意味・文章の質など、人の判断が必要な項目まで自動的に保証するものではない。

Productは71商品に実装済み。公開ストアからの手動取得データでは最新在庫を確認できないため、既存設計どおりOfferを出さない。実在しないレビュー・評価・GTIN・価格・在庫は追加しない。API取得時のOfferについては価格・JPY・在庫0・BASE購入URL・期限切れ時の非表示を既存単体テストで検証。Productの構文が正しくても、Offer/review/aggregateRatingのない現状はGoogleの商品リッチリザルト要件を満たさない。外部BASEで購入するため、自サイトで直接購入できることを条件とする販売者リスティングを目標にしない。

検証はローカルのJSON/schema主要条件・表示一致検証であり、Googleによる掲載認定ではない。Rich Results TestとSearch Consoleの再クロール結果は別途確認する。

## Search Console

- 既存のGoogle所有権確認metaと `google13cb3392ef4a2c51.html` を維持。これらの存在だけでは、どのGoogleアカウントで確認済みかは判定できない。
- 公開DNSのTXT問い合わせでは、当該ホストの確認用TXTを取得できなかった。DNS管理画面やSearch Console内部の登録状態は操作・確認していない。
- robots.txtはそのまま維持。Googlebot・OAI-SearchBot・GPTBotは `User-agent: *` の許可を継承し、公開ページを妨げるDisallowはない。Crawl-delayはGooglebotの制御としては機能しないが、学習方針を含む既存ポリシー変更を避けて今回は保持。
- 所有権確認には、Netlify共有ドメイン全体のDNSを対象とする方法より、`https://restandard-2025.netlify.app/` の「URLプレフィックス」プロパティが適切。

ユーザーの操作:
1. Search Consoleで上記URLプレフィックスの既存プロパティを開く。なければ追加する。
2. 所有権が未確認ならHTMLタグまたはHTMLファイル方式を選ぶ。既存値で確認できない場合は、新しく発行された確認値を共有する。確認値を推測して置換しない。
3. サイトマップに `sitemap.xml` を送信し、取得成功を確認する。子サイトマップを別々に送信する必要はない。
4. ホーム・News一覧・修正した5記事・代表商品をURL検査し、公開URLテストと必要な再登録リクエストを実施する。
5. 数日〜数週間後にページのインデックス登録、重複/正規URL、構造化データの解析エラー、ウェブに関する主な指標を確認する。クロール・掲載・順位は保証されない。

## AI検索

GoogleのAI Overviews/AI Modeには通常の検索に必要な技術要件を整える。今回、壊れたJSON-LDを修復し、News一覧をHTML化し、主要ページへの通常リンクを確認した。専用のAI用schemaやllms.txtは追加しない。OAI-SearchBotは検索、GPTBotは学習用途として別に扱い、GPTBotの既存設定は変更していない。公開robotsと通常のHTTP応答が正常でも、実際のクローラーIPに対するCDN判定やAI回答への採用までは保証できない。

## 英語SEOの次段階

現在のENは `?lang=en` とブラウザ保存値によるJS翻訳。初期HTMLは日本語で、canonicalは日本語URL。Newsにはja/x-defaultの自己参照があるが、独立した英語URLのhreflangはない。商品一覧・ブランド/カテゴリー絞り込みページはパラメーター付きURLをnoindexにしており、`?lang=en` も含む。利用者向け切り替えは機能するが、英語検索用ページを安定して提供する設計にはなっていない。

提案: `/en/`、`/en/about.html`、`/en/products/<slug>/` などを作り、本文・title・description・JSON-LDを英語で事前生成/サーバー生成する。JAとENを相互hreflang、各言語を自己canonical、x-defaultを既定の日本語へ。英語の正規ページはindex、検索/絞り込みだけnoindexに分離する。JPY表示とBASE購入先は共通。翻訳完了ページだけ公開し、未翻訳ページへ偽のhreflangを付けない。既存ENは対応URLへ通常リンクで切り替える。この変更は別フェーズで実施する。

## 独自コンテンツの提案（公開前に事実確認）

| 対象 | 追加価値 | 必要な確認 |
| --- | --- | --- |
| ブランド紹介10ページ | ブランドの背景、ReStandardが取り扱うライン、関連記事→現行BASE掲載商品→取引相談 | 公式情報・代理店/取扱範囲・掲載許諾 |
| 素材・特徴のガイド | ラムウール、シェットランド、コットン等の選び方を既存商品の素材表記に結び付ける | メーカー資料、実際の仕様。独自の性能断定はしない |
| お取引の流れ | 問い合わせ→確認→資料/商談→注文という実際の手順を具体化 | 対象業態・地域・最低発注・納期・支払条件を担当者に確認 |
| サンプル・資料相談 | 何を伝えると相談できるか、連絡先、資料形式 | 貸出可否、費用、返却条件、対応範囲 |
| よくある質問 | 新規取引・再入荷・サイズ資料など実際の質問を整理 | 実運用に基づく回答。FAQリッチリザルトを前提にしない |

公開日不一致は7件: `1028-2025aw-eribe-amp-restandardrockmount`、`1021restandard2025aw-harley-of-scotland-amp-rockmount`、`1014restandard2025aw-harley-of-scotland-amp-rockmount`、`107restandard2025aw-harley-of-scotland-amp-rockmount`、`930restandard2025aw-harley-of-scotland-amp-rockmount`、`2025-fw-new-arrival-rockmount`、`untitled`。元記事と照合して日付を確定する必要がある。今回は本文の表示日をArticleに反映し、一覧表示の既存日付は変更していない。

## 表示速度の実測と提案

PageSpeed Insights APIはモバイル・PCともHTTP 429（日次割当上限）。代替として公式Lighthouse 13.5.0をローカルChromeから本番URLに実行。各構成1回、標準のモバイル/デスクトップ模擬条件で測定。数値は環境で変動し、実利用者のCrUX 75パーセンタイルではない。詳細は `docs/seo-performance-2026-10-20.json`。

| ページ / 条件 | Performance | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: |
| トップ / モバイル | 46 | 16.7秒 | 0 | 560ms |
| トップ / PC | 64 | 4.0秒 | 0.016 | 0ms |
| 商品詳細（代表1商品）/ モバイル | 68 | 4.4秒 | 0.242 | 0ms |
| Lookbook / モバイル | 93 | 3.0秒 | 0 | 10ms |

トップの転送量は約4.86MB。画像配信の推定削減余地は約2.7MB、未使用CSSは約234KiB。Collectionの表示幅に対して大きい956×1200画像が読み込まれている。見えない旧画像のpreloadも残る。商品ページのCLSは要改善。INPは実測できておらず、TBTをINPの代わりとして「良好」とは判定しない。Search ConsoleのCWVまたはCrUXで実利用者データを確認する。

次の改善順序:
1. 表示幅に合わせたsrcset/sizesと既存Netlify Image CDNを使う。写真内容・色・トリミングは維持する。
2. ヒーロー1枚目を優先し、未使用の旧preloadを除去。Collection/Lookbookはループ直前の画像を先読みし、停止や空白が発生しないことを複数周・実スワイプで再検証する。
3. 商品画像と関連商品の表示領域、フォント切り替えによる移動を特定してCLSを抑える。スワイプ時の上下揺れの検証は継続する。
4. 未使用CSS/JSをページ種別ごとに整理・圧縮する。既存Bootstrap依存を確認してから段階的に除く。
5. 同じ条件で複数回再測定し、改善後の中央値を比較する。今回は速度調査が主目的のため、画像やアニメーションの実装変更は行わない。

## 運用と再発防止

- `npm run build:catalog:site`: ページ生成→SEO修復→サイトマップ生成→全件SEO監査。監査失敗時は終了コード非0となり、本番ビルドを停止。
- `npm run test:seo`: 引用符/HTMLを含むJSON-LD、記事の表示一致、記事追加/noindex除外/lastmod省略の回帰テスト。
- `npm run audit:seo`: ビルド済み成果物の監査。`SEO_ORIGIN` を本番URLに設定するとHTTPで再監査。
- 静的ページ追加は `catalog/static-pages.json` に登録する。Newsは公開フォルダーから自動検出。商品・ブランド・カテゴリーは公開カタログに従う。
- 正確な重要更新履歴を将来管理できるようになった場合のみlastmodを再導入する。
- 既存の所有権確認ファイル/metaとrobotsを保持。ニュース生成処理からrobotsの自動上書きを除去。

## 主な変更ファイル

`scripts/seo-pages.cjs`、`scripts/prerender-news.cjs`、`scripts/audit-seo.cjs`、`scripts/test-seo.cjs`、`scripts/build-catalog-site.cjs`、`scripts/build-news-pages.mjs`、`scripts/test-language.cjs`、`catalog/static-pages.json`、`templates/news_base.html`、`js/news.js`、`package.json`、`sitemap.xml`、ルートHTML9件、News HTML18件。CSS・商品マスタ・画像・robots.txtは未変更。全変更ファイルとデプロイ後の確認は公開記録に記載する。

## 公式資料

- [Google: サイトマップ生成とlastmod](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: Article](https://developers.google.com/search/docs/appearance/structured-data/article)、[Organization](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [schema.org: Article](https://schema.org/Article)、[Product](https://schema.org/Product)
- [Google: Productスニペット](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)、[販売者リスティング](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- [Google: AI機能とサイト](https://developers.google.com/search/docs/appearance/ai-features)
- [OpenAI: 検索用・学習用クローラー](https://developers.openai.com/api/docs/bots)
- [Google: 多言語サイト](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Search Console: 所有権確認](https://support.google.com/webmasters/answer/9008080)
- [Chrome: Lighthouse](https://developer.chrome.com/docs/lighthouse/overview)、[Web Vitals](https://web.dev/articles/vitals)
