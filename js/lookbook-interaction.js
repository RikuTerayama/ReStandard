// (deprecated) logic moved to init-sections.js on 2025-01-18
// Lookbook 表示修正・右寄り解消・Collection同様挙動

(() => {
  const track = document.querySelector('#lookbook-track');
  if (!track) return;

  const ensureFilled = () => {
    const minWidth = window.innerWidth * 2.0;
    let w = track.scrollWidth;
    while (w < minWidth) {
      track.innerHTML += track.innerHTML;
      w = track.scrollWidth;
    }
  };

  ensureFilled();

  let x = 0, vx = 0;
  const speed = 0.07, dir = -1; // 速度半減

  const step = () => {
    const setW = track.scrollWidth / 2;
    x += speed * dir + vx;
    if (x <= -setW) x += setW;
    if (x >= 0)     x -= setW;
    track.style.transform = `translateX(${x}px)`;
    vx *= 0.94;
    if (Math.abs(vx) < 0.01) vx = 0;
    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);

  const row = track.parentElement; // .lookbook-row
  let dragging = false, lastX = 0;

  const onDown = cx => { dragging = true; lastX = cx; };
  const onMove = cx => { if (!dragging) return; const dx = cx - lastX; lastX = cx; vx = dx; };
  const onUp   = () => { dragging = false; };

  row.addEventListener('pointerdown', e => { row.setPointerCapture(e.pointerId); onDown(e.clientX); });
  row.addEventListener('pointermove',  e => onMove(e.clientX));
  row.addEventListener('pointerup',    onUp);
  row.addEventListener('pointercancel',onUp);
  row.addEventListener('wheel', e => { vx += (e.deltaY || e.deltaX) * -0.1; });

  window.addEventListener('resize', ensureFilled);
})();
