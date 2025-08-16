/**
 * ReStandard テキスト演出 - パフォーマンス重視のテキストアニメーション
 * 3種の演出モード: wipe, char, line
 */

export function enhanceReveals(root = document) {
  const nodes = root.querySelectorAll('.rs-reveal');

  nodes.forEach((el) => {
    const mode = el.dataset.reveal; // "line" | "char" | "wipe"
    if (!mode) return;

    // 文字/行の分割：既に処理済みならスキップ
    if (mode === 'char' && !el.querySelector('.rs-char')) splitChars(el);
    if (mode === 'line' && !el.querySelector('.rs-line')) splitLines(el);
  });

  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target); // 一度だけ発火
      }
    });
  }, { 
    root: null, 
    threshold: 0.2, 
    rootMargin: '0px 0px -10% 0px' 
  });

  nodes.forEach((el) => io.observe(el));
}

function splitChars(el) {
  // SR用に元テキストはaria-labelへ退避、表示は装飾用spanで
  const text = el.textContent ?? '';
  el.setAttribute('aria-label', text.trim());
  el.setAttribute('role', 'text');
  el.textContent = '';
  
  Array.from(text).forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'rs-char';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--i', String(i));
    span.textContent = ch;
    el.appendChild(span);
  });
}

function splitLines(el) {
  const text = el.innerHTML;
  // 単純改行での行指定（必要なら計測ベースの高度版に差し替え可）
  const parts = text.split(/<br\s*\/?>|\n/);
  el.innerHTML = '';
  
  parts.forEach((html, i) => {
    const line = document.createElement('span');
    line.className = 'rs-line';
    line.style.setProperty('--i', String(i));
    line.innerHTML = html;
    el.appendChild(line);
    if (i < parts.length - 1) el.appendChild(document.createElement('br'));
  });
}

// グローバル関数としても利用可能（既存コードとの互換性）
if (typeof window !== 'undefined') {
  window.enhanceReveals = enhanceReveals;
} 
