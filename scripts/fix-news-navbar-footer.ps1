# news記事詳細ページのナビバー・フッター設定を一括削除するスクリプト

$files = Get-ChildItem -Path "news" -Recurse -Filter "index.html"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # ナビバー・フッター設定を削除（複数行パターン）
    $patterns = @(
        # .navbar, footer から .copyright まで
        '(?s)\.navbar, footer \{[^}]*\}.*?\.copyright \{[^}]*\}',
        # フッターが浮かないようにする設定（footer部分のみ）
        '(?s)footer \{[^}]*margin-top: auto;[^}]*width: 100%;[^}]*\}'
    )
    
    # より確実な方法：特定のブロックを削除
    # 1. .navbar, footer から .copyright までのブロック
    $content = $content -replace '(?s)    \.navbar, footer \{[^}]*\}\s*\n\s*\.navbar \.container-fluid \{[^}]*\}\s*\n\s*\.navbar-brand \{[^}]*\}\s*\n\s*\.navbar-nav \{[^}]*\}\s*\n\s*\.navbar-nav \.nav-item \{[^}]*\}\s*\n\s*\.navbar-nav \.nav-link \{[^}]*\}\s*\n\s*/\* Bootstrap[^*]*\*/\s*\n\s*html body \.navbar-nav \.nav-link \{[^}]*\}\s*\n\s*html body \.navbar-nav \.nav-item \{[^}]*\}\s*\n\s*\.nav-link::after \{[^}]*\}\s*\n\s*\.nav-link:hover::after \{[^}]*\}\s*\n\s*\.nav-link:hover \{[^}]*\}\s*\n\s*\.nav-link\.active \{[^}]*\}\s*\n\s*\.nav-link\.active::after \{[^}]*\}\s*\n\s*/\* 言語切り替え[^*]*\*/\s*\n\s*\.language-switcher \{[^}]*\}\s*\n\s*\.language-switcher button \{[^}]*\}\s*\n\s*\.language-switcher button\.active \{[^}]*\}\s*\n\s*/\* モバイル対応[^*]*\*/\s*\n\s*@media[^}]*\}\s*\n\s*footer \{[^}]*\}\s*\n\s*footer \.nav \{[^}]*\}\s*\n\s*footer \.nav-link \{[^}]*\}\s*\n\s*footer \.nav-link::after \{[^}]*\}\s*\n\s*footer \.nav-link:hover::after \{[^}]*\}\s*\n\s*\.social-links \{[^}]*\}\s*\n\s*\.social-links a \{[^}]*\}\s*\n\s*\.social-links a:hover \{[^}]*\}\s*\n\s*\.copyright \{[^}]*\}', '    /* ナビバーとフッターの設定はcss/style.cssで統一管理（index.htmlと同じ） */'
    
    # 2. フッターが浮かないようにする設定内のfooter部分を削除
    $content = $content -replace '(?s)    footer \{[^}]*margin-top: auto;[^}]*width: 100%;[^}]*\}', ''
    
    # 3. bodyにpadding-topを追加（まだない場合）
    if ($content -notmatch 'padding-top:\s*80px') {
        $content = $content -replace '(?s)(body \{[^}]*display:\s*flex;[^}]*min-height:\s*100vh;[^}]*)(\})', '$1      padding-top: 80px; /* 固定ヘッダー分の余白（index.htmlと同じ） */$2'
    }
    
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
    Write-Output "Updated: $($file.FullName)"
}

