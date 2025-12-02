/**
 * ReStandard テキスト演出 - 競合に勝つ高優先度実装
 * 診断ログ付きで確実に反映されるテキストアニメーション
 */

function initReveal(root = document) {
  const url = new URL(window.location.href);
  const debug = url.searchParams.get('reveal-debug') === '1';
  const force = url.searchParams.get('reveal-force') === '1';

  const log = (...args) =>
    debug && console.log('%c[reveal]', 'color:#7c3aed;font-weight:bold;', ...args);

  // 最終フォールバック：強制静止表示モード
  if (force) {
    log('FORCE MODE: 全要素を即時表示');
    // reveal関数が定義される前に呼び出されるため、直接スタイルを適用
    // 下→上方向に統一: translateY(0)を使用
    document.querySelectorAll('.rs-reveal[data-reveal]').forEach((el) => {
      el.classList.add('is-visible');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('transform', 'translateY(0)', 'important');
      
      // wipeの場合はmask-sizeも適用
      if (el.dataset.reveal === 'wipe') {
        (el.style).setProperty('-webkit-mask-size', '100% 100%', 'important');
        (el.style).setProperty('mask-size', '100% 100%', 'important');
      }
    });
    return;
  }

  // 競合検知：スタイルが反映されない要因のチェック
  function probe(el) {
    const cs = getComputedStyle(el);
    log('probe:', {
      opacity: cs.opacity,
      transform: cs.transform,
      transition: cs.transitionDuration,
      maskSize: (cs).webkitMaskSize || cs.maskSize
    });
  }

  // テキスト分割（多重適用防止）
  function splitChars(el) {
    if (el.dataset.rsSplit === 'char') return;
    const raw = el.textContent ?? '';
    el.setAttribute('aria-label', raw.trim());
    el.setAttribute('role', 'text');
    el.textContent = '';
    Array.from(raw).forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'rs-char';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--i', String(i));
      span.textContent = ch;
      el.appendChild(span);
    });
    el.dataset.rsSplit = 'char';
  }

  function splitLines(el) {
    if (el.dataset.rsSplit === 'line') return;
    const parts = (el.innerHTML).split(/<br\s*\/?>|\n/);
    el.innerHTML = '';
    parts.forEach((html, i) => {
      const line = document.createElement('span');
      line.className = 'rs-line';
      line.style.setProperty('--i', String(i));
      line.innerHTML = html;
      el.appendChild(line);
      if (i < parts.length - 1) el.appendChild(document.createElement('br'));
    });
    el.dataset.rsSplit = 'line';
  }

  // 初期適用：インラインstyleで"初期状態"を強制（競合に勝つ）
  // 下→上方向に統一: translateYを使用
  function prime(el) {
    const mode = el.dataset.reveal;
    
    // クラスが既に適用されている場合はスキップ
    if (el.classList.contains('rs-reveal')) return;
    
    el.classList.add('rs-reveal');
    
    // 初期状態を即座に適用（視覚的なちらつきを防ぐ）
    // 下→上方向: translateYを使用
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('transform', `translateY(var(--rs-reveal-shift-y, 12px))`, 'important');

    if (mode === 'char' && !el.querySelector('.rs-char')) splitChars(el);
    if (mode === 'line' && !el.querySelector('.rs-line')) splitLines(el);

    probe(el);
  }

  // 表示化：is-visible と同時にインラインstyleでも最終状態を指示
  // 下→上方向に統一: translateY(0)を使用
  function reveal(el) {
    const node = el;
    node.classList.add('is-visible');
    node.style.setProperty('opacity', '1', 'important');
    node.style.setProperty('transform', 'translateY(0)', 'important');

    // wipeの場合はmask-sizeをインラインで後押し（下→上方向）
    if (node.dataset.reveal === 'wipe') {
      (node.style).setProperty('-webkit-mask-size', '100% 100%', 'important');
      (node.style).setProperty('mask-size', '100% 100%', 'important');
    }
  }

  // 監視：IntersectionObserver + MutationObserver
  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (e.isIntersecting) {
        reveal(e.target);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

  function boot(ctx) {
    const targets = ctx.querySelectorAll('.rs-reveal[data-reveal]:not([data-rs-ready])');
    targets.forEach((el) => {
      prime(el);
      el.dataset.rsReady = '1';
      io.observe(el);
    });
    log('boot targets:', targets.length);
    
    // デバッグ：要素の状態を確認
    if (debug && targets.length > 0) {
      log('First target state:', {
        element: targets[0],
        opacity: targets[0].style.opacity,
        transform: targets[0].style.transform,
        classes: targets[0].className
      });
    }
  }

  // 初回起動
  boot(root);

  // 少し遅延させてから初期化を実行（DOMの完全な準備を待つ）
  setTimeout(() => {
    boot(root);
  }, 100);

  // ルーティングや動的描画に対応
  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => {
      m.addedNodes.forEach((n) => {
        if (n instanceof HTMLElement) boot(n);
      });
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // フェイルセーフ：1.2s後に可視化（特にabout/brandsを確実に）
  setTimeout(() => {
    const sections = ['#about', '#brands'];
    sections.forEach((sel) => {
      document.querySelectorAll(`${sel} .rs-reveal[data-reveal]`).forEach((el) => {
        const node = el;
        if (!node.classList.contains('is-visible')) {
          node.classList.add('is-visible');
          node.style.setProperty('opacity', '1', 'important');
          node.style.setProperty('transform', 'none', 'important');
          (node.style).setProperty('-webkit-mask-size', '100% 100%', 'important');
          (node.style).setProperty('mask-size', '100% 100%', 'important');
        }
      });
    });
    
    // さらに強力なフェイルセーフ：about/brands内の全要素を強制可視化
    sections.forEach((sel) => {
      const section = document.querySelector(sel);
      if (section) {
        section.style.setProperty('opacity', '1', 'important');
        section.style.setProperty('visibility', 'visible', 'important');
        section.style.setProperty('display', 'block', 'important');
      }
    });
    
    log('フェイルセーフ実行完了');
  }, 1200);

  // デバッグ：任意の1要素を強制即時表示（?reveal-debug=1）
  if (debug) {
    setTimeout(() => {
      const sample = document.querySelector('.rs-reveal[data-reveal]');
      if (sample) {
        log('force reveal sample');
        reveal(sample);
        probe(sample);
      } else {
        log('no sample found');
      }
    }, 600);
  }
}

// グローバル関数としても利用可能（既存コードとの互換性）
if (typeof window !== 'undefined') {
  window.initReveal = initReveal;
} 
