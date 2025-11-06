# すべてのnews記事詳細ページのナビバー・フッター設定を一括削除

$files = Get-ChildItem -Path "news" -Recurse -Filter "index.html"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $modified = $false
    
    # パターン1: .navbar, footer から .copyright までのブロックを削除
    $pattern1 = '(?s)    \.navbar, footer \{[^}]*\}\s*\n\s*\.navbar \.container-fluid \{[^}]*\}\s*\n\s*\.navbar-brand \{[^}]*\}\s*\n\s*\.navbar-nav \{[^}]*\}\s*\n\s*\.navbar-nav \.nav-item \{[^}]*\}\s*\n\s*\.navbar-nav \.nav-link \{[^}]*\}\s*\n\s*/\* Bootstrap[^*]*\*/\s*\n\s*html body \.navbar-nav \.nav-link \{[^}]*\}\s*\n\s*html body \.navbar-nav \.nav-item \{[^}]*\}\s*\n\s*\.nav-link::after \{[^}]*\}\s*\n\s*\.nav-link:hover::after \{[^}]*\}\s*\n\s*\.nav-link:hover \{[^}]*\}\s*\n\s*\.nav-link\.active \{[^}]*\}\s*\n\s*\.nav-link\.active::after \{[^}]*\}\s*\n\s*/\* 言語切り替え[^*]*\*/\s*\n\s*\.language-switcher \{[^}]*\}\s*\n\s*\.language-switcher button \{[^}]*\}\s*\n\s*\.language-switcher button\.active \{[^}]*\}\s*\n\s*/\* モバイル対応[^*]*\*/\s*\n\s*@media[^}]*\}\s*\n\s*footer \{[^}]*\}\s*\n\s*footer \.nav \{[^}]*\}\s*\n\s*footer \.nav-link \{[^}]*\}\s*\n\s*footer \.nav-link::after \{[^}]*\}\s*\n\s*footer \.nav-link:hover::after \{[^}]*\}\s*\n\s*\.social-links \{[^}]*\}\s*\n\s*\.social-links a \{[^}]*\}\s*\n\s*\.social-links a:hover \{[^}]*\}\s*\n\s*\.copyright \{[^}]*\}'
    
    if ($content -match $pattern1) {
        $content = $content -replace $pattern1, '    /* ナビバーとフッターの設定はcss/style.cssで統一管理（index.htmlと同じ） */'
        $modified = $true
    }
    
    # パターン2: フッターが浮かないようにする設定内のfooter部分を削除し、padding-topを追加
    $pattern2 = '(?s)    /\* フッターが浮かないようにする設定 \*/\s*\n\s*html, body \{[^}]*\}\s*\n\s*body \{[^}]*display:\s*flex[^}]*min-height:\s*100vh[^}]*\}\s*\n\s*main \{[^}]*\}\s*\n\s*footer \{[^}]*margin-top:\s*auto[^}]*width:\s*100%[^}]*\}'
    
    if ($content -match $pattern2) {
        $content = $content -replace $pattern2, '    /* フッター関連の設定はcss/style.cssで統一管理（index.htmlと同じ） */`n    html, body {`n      height: 100%;`n      margin: 0;`n      padding: 0;`n    }`n    `n    body {`n      display: flex;`n      flex-direction: column;`n      min-height: 100vh;`n      padding-top: 80px; /* 固定ヘッダー分の余白（index.htmlと同じ） */`n    }`n    `n    main {`n      flex: 1;`n    }'
        $modified = $true
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Output "Updated: $($file.FullName)"
    } else {
        Write-Output "No changes needed: $($file.FullName)"
    }
}

