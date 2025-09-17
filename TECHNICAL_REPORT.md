# Collection・Brands レイアウト問題 技術レポート

## 1. Cascade/Specificity レポート

### Collection セクション

| 要素 | セレクタ | ファイル | Specificity | プロパティ | 勝っている理由 |
|------|----------|----------|-------------|------------|---------------|
| .collection-title | .collection-title | css/style.css | (0,1,0) | margin-bottom: var(--title-to-top) | 正常動作 |
| .collection-rows-wrapper | .collection-rows-wrapper | css/style.css | (0,1,0) | background: rgba(255,255,255,0.1) | 正常動作 |
| .collection-row-top | .collection-row-top | css/style.css | (0,1,0) | background: transparent, margin-bottom: var(--top-to-bottom) | 正常動作 |
| .collection-row-bottom | .collection-row-bottom | css/style.css | (0,1,0) | background: transparent, margin-bottom: 0 | 正常動作 |

### Brands セクション

| 要素 | セレクタ | ファイル | Specificity | プロパティ | 勝っている理由 |
|------|----------|----------|-------------|------------|---------------|
| .brands-grid | .brands-grid | css/style.css | (0,1,0) | display: grid !important | !important付き |
| .brands-grid | .brands-grid | css/style.css | (0,1,0) | grid-template-columns: repeat(5, 1fr) | !important付き |
| .brand-card | .brand-card | css/style.css | (0,1,0) | height: 150px, display: flex | !important付き |
| .brand-logo | .brand-logo | css/style.css | (0,1,0) | max-height: 80px, opacity: 1 | !important付き |
| ★.brandlogo | .brandlogo | css/style.css | (0,1,0) | opacity: 0 | **競合元凶** |

## 2. 競合一覧

### Collection セクション
- **現在問題なし**: 行間ギャップと背景統一が正常に動作

### Brands セクション
- ★**`.brandlogo { opacity: 0; }`** (css/style.css:1264) - **無効化している元凶**
- ★**古いアニメーション設定** (css/style.css:1269-1284) - **競合の原因**

## 3. 修正方針

### 即座に削除すべき競合元
1. **css/style.css 1264行目**: `.brandlogo { opacity: 0; }` → 削除
2. **css/style.css 1269-1284行目**: 古いアニメーション設定 → 削除
3. **css/collection-overrides.css**: 全ファイル → 削除済み

### 単一管理箇所への統合
1. **Collection**: 既にstyle.cssのsections専用ブロックで正常管理中
2. **Brands**: style.cssのsections専用ブロックで管理、古い設定は完全削除

## 4. 検証結果

### 診断用アウトライン結果
- **Collection**: 赤枠(title)、青枠(wrapper)、緑枠(top)、オレンジ枠(bottom)、紫枠(images) - 正常表示
- **Brands**: シアン枠(grid)、黄枠(card)、マゼンタ枠(logo) - ロゴが非表示

### レスポンシブ確認
- **360px**: Collection正常、Brands 2列予定だがロゴ非表示
- **768px**: Collection正常、Brands 3列予定だがロゴ非表示  
- **1024px**: Collection正常、Brands 4列予定だがロゴ非表示
- **1440px**: Collection正常、Brands 5列予定だがロゴ非表示

## 5. 根本原因

### Collection セクション
- **問題なし**: 既に適切に動作中

### Brands セクション  
- **根本原因**: 古い`.brandlogo { opacity: 0; }`設定が残存
- **影響**: 新しい`.brand-logo`設定が正常でも、古い`.brandlogo`が上書き
- **解決策**: 古い`.brandlogo`設定を完全削除

## 6. 修正後の管理体制

### 単一管理箇所
1. **Collection行間**: `.collection-row-gap` (css/style.css)
2. **セクション間隔**: `.section-spacing` (css/style.css)  
3. **Brandsグリッド**: `.brands-grid` (css/style.css)
4. **背景管理**: `.collection-rows-wrapper`, `.section-overlay--frost` (css/style.css)

### 禁止事項
- HTMLでのインラインスタイル追加
- 複数ファイルでの同一セレクタ定義
- 古いクラス名の使用継続
