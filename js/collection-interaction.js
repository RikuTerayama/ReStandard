// (deprecated) logic moved to init-sections.js on 2025-01-18
// Collection 無限ループ・ドラッグ双方向・空白防止・慣性実装

(() => {
  const rows = [
    { el: document.querySelector('#collection-row-top'),  speed: 0.08, dir: -1 },    // 速度半減
    { el: document.querySelector('#collection-row-bottom'), speed: 0.06, dir:  1 },  // 速度半減
  ].filter(r => r.el);

  // コンテンツを画面幅の2.2倍以上に複製 → 空白見え防止
  const ensureFilled = track => {
    const minWidth = window.innerWidth * 2.2;
    let w = track.scrollWidth;
    while (w < minWidth) {
      track.innerHTML += track.innerHTML;
      w = track.scrollWidth;
    }
  };

  // 複製前に画像サイズ正規化
  const normalizeImageSizes = (track) => {
    track.querySelectorAll('img').forEach(img => {
      img.style.maxHeight = '160px';
      img.style.width = 'auto';
      img.style.height = 'auto';
    });
  };

  rows.forEach(({ el }) => {
    ensureFilled(el);
    normalizeImageSizes(el);
  });

  // アニメーション（requestAnimationFrame）
  let rafId;
  const state = rows.map(({ el, speed, dir }) => ({
    track: el, x: 0, speed, dir, dragging: false, lastX: 0, vx: 0
  }));

  const step = () => {
    state.forEach(s => {
      s.x += (s.speed * s.dir) + s.vx;
      // wrap
      const w = s.track.scrollWidth / 2; // 複製前の1セット分相当
      if (s.x <= -w) s.x += w;
      if (s.x >= 0)   s.x -= w;
      s.track.style.transform = `translateX(${s.x}px)`;
      // 摩擦で徐々に停止
      s.vx *= 0.94;
      if (Math.abs(s.vx) < 0.01) s.vx = 0;
    });
    rafId = requestAnimationFrame(step);
  };

  rafId = requestAnimationFrame(step);

  // ドラッグ/スワイプ（左右どちらにも）
  const onDown = (s, clientX) => {
    s.dragging = true; s.lastX = clientX;
  };
  const onMove = (s, clientX) => {
    if (!s.dragging) return;
    const dx = clientX - s.lastX;
    s.lastX = clientX;
    s.vx = dx;               // 慣性
  };
  const onUp = s => { s.dragging = false; };

  state.forEach(s => {
    const row = s.track.parentElement; // .collection-row
    row.addEventListener('pointerdown', e => { row.setPointerCapture(e.pointerId); onDown(s, e.clientX); });
    row.addEventListener('pointermove',  e => onMove(s, e.clientX));
    row.addEventListener('pointerup',    () => onUp(s));
    row.addEventListener('pointercancel',() => onUp(s));
    row.addEventListener('wheel', e => { s.vx += (e.deltaY || e.deltaX) * -0.1; }); // ホイールで横移動
  });

  // リサイズで再充填
  window.addEventListener('resize', () => rows.forEach(({ el }) => ensureFilled(el)));
})();
