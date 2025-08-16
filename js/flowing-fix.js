/* ========================================
   Flowing Images Height Fix
   ======================================== */

export function ensureFlowingHeight() {
  const sec = document.getElementById('flowing-images') || document.querySelector('.section-flowing');
  if (!sec) return;
  
  // 子要素の最大高さを測って min-height を上書き（親高0対策）
  const kids = Array.from(sec.children);
  const maxH = Math.max( ...kids.map(k => k.getBoundingClientRect().height), 0 );
  const base = Math.max(maxH, 280);   // 最低280pxを確保
  
  sec.style.minHeight = base + 'px';
  
  // デバッグログ
  console.log('Flowing height fix applied:', {
    section: sec.id || sec.className,
    maxChildHeight: maxH,
    appliedMinHeight: base,
    currentStyle: sec.style.minHeight
  });
}

// ブラウザ環境でのみ実行
if (typeof window !== 'undefined') {
  const run = () => ensureFlowingHeight();
  
  // ページ読み込み完了後に実行
  window.addEventListener('load', run, { once: true });
  
  // リサイズ時にも実行
  window.addEventListener('resize', run);
  
  // DOMContentLoadedでも実行（早期対応）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run(); // 既に読み込み完了している場合
  }
} 
