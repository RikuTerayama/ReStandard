/* =========================================================
   Marquee initializer (Collection / Lookbook 共通) 2025-01-18
   ========================================================= */

/** 子要素をクローンして 300% 幅以上にし、無限ループを成立させる */
function ensureLoopWidth(track) {
  const maxLoopWidth = track.parentElement.offsetWidth * 3; // 300%
  let total = Array.from(track.children).reduce((w, el) => w + el.getBoundingClientRect().width, 0);

  // 画像が未ロードだと幅が 0 になるので暫定で幅推定
  if (total === 0) {
    const fallback = track.children.length * 200;
    total = fallback;
  }

  let guard = 0;
  while (total < maxLoopWidth && guard < 40) {
    const clones = Array.from(track.children).map((n) => n.cloneNode(true));
    clones.forEach((c) => track.appendChild(c));
    total = Array.from(track.children).reduce((w, el) => w + el.getBoundingClientRect().width, 0);
    guard++;
  }
}

/** スクロールをドラッグ/スワイプ/ホイールで手動制御できるようにする（8px閾値でクリック両立） */
function attachManualControls(track) {
  let isDown = false;
  let startX = 0;
  let currentX = 0;
  let moved = 0;
  let startTx = 0;

  const getTx = () => {
    const m = /translateX\((-?\d+(\.\d+)?)px\)/.exec(track.style.transform || "");
    return m ? parseFloat(m[1]) : 0;
  };
  const setTx = (px) => { track.style.transform = `translateX(${px}px)`; };

  const pause = () => {
    track.style.animationPlayState = 'paused';
    track.classList.add('dragging');
  };
  const play = () => {
    track.style.animationPlayState = 'running';
    track.classList.remove('dragging');
  };

  // --- ユーザー明示停止フラグ（IOが勝手に再生しないように） ---
  const setUserPaused = (v) => {
    if (v) { track.dataset.userPaused = '1'; }
    else   { delete track.dataset.userPaused; }
  };

  // マウス/タッチ
  const down = (e) => {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    startX = currentX = x;
    moved = 0;
    isDown = true;
    startTx = getTx();
    pause();
  };

  const move = (e) => {
    if (!isDown) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = x - currentX;
    currentX = x;
    moved += Math.abs(dx);
    setTx(startTx + (x - startX));
  };

  // Up：ドラッグ後は「止めた位置から」再始動（先頭へ戻さない）
  const up = (e) => {
    if (!isDown) return;
    isDown = false;

    const getLoopDistance = () => {
      // アニメが 0%→-50% の往復なので「トラック幅の半分」が1ループ距離
      return track.scrollWidth * 0.5;
    };
    const getDurationSec = () => {
      // Collection は setupMarquee で明示設定、Lookbook は CSS から取得
      const dur = parseFloat(getComputedStyle(track).animationDuration);
      return isNaN(dur) || dur <= 0 ? 55 : dur; // フォールバック
    };
    const resumeFromHere = () => {
      const loop = getLoopDistance();
      const cur = Math.abs(getTx());       // 現在の移動量(px)
      const prog = loop > 0 ? (cur % loop) / loop : 0; // 0..1
      const dur  = getDurationSec();

      // ここが肝：現在位置に相当する「経過時間」を負の delay で与える
      track.style.animationDelay = `-${prog * dur}s`;
      track.style.animationPlayState = 'running';
      track.classList.remove('dragging');
      delete track.dataset.userPaused;     // 明示停止フラグは下ろす（IOにも再生を許可）
    };

    // 8px未満=クリック（リンク遷移を邪魔しない: 自動再開も従来どおり継続）
    if (moved < 8) {
      // ここではフラグを立てない＝自動スクロールは継続
      play();
      return;
    }

    // 8px以上=ドラッグ → 現在位置から自動再開
    e.preventDefault();
    e.stopPropagation();
    resumeFromHere();
  };

  // マウス・タッチ両対応
  track.addEventListener('mousedown', down);
  track.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  track.addEventListener('touchstart', down, { passive: true });
  track.addEventListener('touchmove', move, { passive: true });
  track.addEventListener('touchend', up);

  // ホイール横スクロール：位置反映＆その位置から自動再開
  track.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return; // 横スクロール中心のときだけ
    pause();
    setTx(getTx() - e.deltaX);
    
    // ホイール操作後も現在位置から再開
    clearTimeout(track._wheelTimer);
    track._wheelTimer = setTimeout(() => {
      const loop = track.scrollWidth * 0.5;
      const cur = Math.abs(getTx());
      const prog = loop > 0 ? (cur % loop) / loop : 0;
      const dur = parseFloat(getComputedStyle(track).animationDuration) || 55;
      
      track.style.animationDelay = `-${prog * dur}s`;
      track.style.animationPlayState = 'running';
      track.classList.remove('dragging');
      delete track.dataset.userPaused;
    }, 300);
  }, { passive: true });

  // 重複するホイールイベントリスナーは上記で統合済み
}

/** IntersectionObserver で画面外は自動停止
 *  ただし "ユーザーが止めた（data-user-paused=1）" 場合は何もしない */
function pauseWhenOutOfView(track) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((ent) => {
      if (track.dataset.userPaused === '1') return; // ← 勝手に再生しない
      track.style.animationPlayState = ent.isIntersecting ? 'running' : 'paused';
    });
  }, { threshold: 0.1 });
  io.observe(track);
}

/** 指定トラックに無限ループ & 手動制御 & 自動再生をセットアップ */
function setupMarquee(track, { direction = 'left', speedSec = null } = {}) {
  if (!track) return;

  // 画像ロード後に幅確定
  const imgs = track.querySelectorAll('img');
  let remain = imgs.length;
  const done = () => {
    ensureLoopWidth(track);
    // Collection：画面幅で速度を出し分け（既定 55s）
    if (track.closest('#collection')) {
      const sec = getResponsiveSpeedSec( Number(speedSec || 55) );
      track.style.animation = `${direction === 'left' ? 'scroll-left' : 'scroll-right'} ${sec}s linear infinite`;
    }
    attachManualControls(track);
    pauseWhenOutOfView(track);
  };
  if (remain === 0) done();
  else imgs.forEach((img) => {
    if (img.complete) { if (--remain === 0) done(); }
    else img.addEventListener('load', () => { if (--remain === 0) done(); }, { once: true });
  });
}

// 追加：画面幅から秒数を算出（大→小で少し速く：55s / 45s / 35s）
function getResponsiveSpeedSec(base=55){
  const w = window.innerWidth;
  if (w <= 480) return 35;
  if (w <= 1024) return 45;
  return base; // >=1025
}

/* ===================== init ===================== */
document.addEventListener('DOMContentLoaded', () => {
  // DOM存在確認・querySelector修正
  console.log('[INIT] setupMarquee DOM存在確認開始');
  
  // Collection 上段・下段（新構造対応）
  const tracks = document.querySelectorAll('#collection .collection-track');
  console.log(`[INIT] Collection tracks found: ${tracks.length}`);
  
  tracks.forEach((track, index) => {
    const direction = track.getAttribute('data-direction') || 'left';
    const speed = track.getAttribute('data-speed') || '55';
    setupMarquee(track, { direction, speedSec: speed });
    console.log(`[INIT] Track ${index + 1}: ${direction} (${speed}s)`);
  });

  // Lookbook（右→左、CSS変数で速度管理）
  const lookTrack = document.querySelector('#lookbook .lookbook-track');
  if (lookTrack) {
    setupMarquee(lookTrack, { direction: 'left' }); // speedSec は CSS 変数に委譲
    console.log('[INIT] Lookbook track: 右→左 (CSS変数で速度管理)');
  } else {
    console.warn('[INIT] Lookbook track not found');
  }
  
  // href 未設定（# や空）の a は data-href を使って遷移させる
  document.querySelectorAll('#collection a, #lookbook a').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') {
        const dh = a.dataset.href;
        if (dh) { 
          e.preventDefault(); 
          window.open(dh, '_blank'); 
        }
      }
    });
  });
  
  // 画面幅が変わったら再計算（速度だけアップデート）
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      document.querySelectorAll('#collection .collection-track').forEach(track => {
        const dir = track.getAttribute('data-direction') || 'left';
        const sec = getResponsiveSpeedSec();
        track.style.animation = `${dir === 'left' ? 'scroll-left' : 'scroll-right'} ${sec}s linear infinite`;
      });
    }, 200);
  });
});

// 見出しJSリセット削除 - CSS制御のみに統一
console.log('[INIT] 見出し制御はCSS (.section-title) に完全委譲');
