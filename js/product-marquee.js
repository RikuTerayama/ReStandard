/* One owner for Collection and Lookbook layout, looping and pointer gestures. */
(() => {
  'use strict';
  const selector = '[data-product-marquee]';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rows = [];
  const wrap = (value, width) => ((value % width) + width) % width;
  let frame = 0;
  let lastTime = 0;

  function paint(row) {
    row.track.style.transform = `translate3d(${-row.offset}px, 0, 0)`;
  }

  function measure(row) {
    row.needsMeasure = false;
    const width = row.group.getBoundingClientRect().width;
    if (!width || !row.viewport.clientWidth) return;
    const progress = row.width ? row.offset / row.width : 0;
    row.width = width;
    row.offset = wrap(progress * width, width);
    // Each group includes its trailing gap. Repeat whole groups far enough to
    // cover the viewport even at the very end of a cycle, including ultrawide.
    const copies = Math.ceil(row.viewport.clientWidth / width);
    while (row.track.children.length > copies + 1) row.track.lastElementChild.remove();
    while (row.track.children.length < copies + 1) {
      const clone = row.group.cloneNode(true);
      clone.dataset.marqueeClone = '';
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      clone.querySelectorAll('a').forEach(a => a.tabIndex = -1);
      row.track.appendChild(clone);
    }
    row.track.dataset.marqueeReady = 'true';
    paint(row);
  }

  function tick(time) {
    frame = 0;
    const seconds = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    for (const row of rows) {
      if (row.needsMeasure) measure(row);
      if (row.width && !reducedMotion.matches && !row.drag?.active && !row.focused) {
        row.offset = wrap(row.offset + row.direction * row.speed * seconds, row.width);
        paint(row);
      }
    }
    if (!document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (!frame && !document.hidden) {
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  function finishDrag(row, event) {
    if (!row.drag || (event?.pointerId != null && event.pointerId !== row.drag.id)) return;
    const id = row.drag.id;
    row.drag = null;
    row.track.classList.remove('is-dragging');
    if (row.track.hasPointerCapture(id)) row.track.releasePointerCapture(id);
    wake();
  }

  function init(track) {
    if (track.dataset.marqueeInitialized) return;
    const items = [...track.children];
    if (!items.length) return;
    track.dataset.marqueeInitialized = 'true';
    const group = document.createElement('div');
    group.className = 'marquee-group';
    items.forEach(item => group.appendChild(item));
    track.appendChild(group);
    const row = {
      track, group, viewport: track.parentElement, width: 0, offset: 0,
      direction: track.dataset.direction === 'right' ? -1 : 1,
      speed: Number(track.dataset.pixelsPerSecond) || 32,
      needsMeasure: true, drag: null, focused: false, suppressClick: false
    };
    rows.push(row);
    row.viewport.dataset.marqueeViewport = '';
    const resize = new ResizeObserver(() => { row.needsMeasure = true; wake(); });
    resize.observe(group);
    resize.observe(row.viewport);
    // Intrinsic sizes are reserved in HTML, but also remeasure after late loads.
    group.querySelectorAll('img').forEach(img => {
      img.draggable = false;
      img.addEventListener('load', () => { row.needsMeasure = true; wake(); });
    });

    track.addEventListener('dragstart', event => event.preventDefault());
    track.addEventListener('pointerdown', event => {
      row.suppressClick = false;
      if (!event.isPrimary || event.button !== 0 || reducedMotion.matches || !row.width) return;
      row.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, active: false };
    });
    track.addEventListener('pointermove', event => {
      const drag = row.drag;
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.active) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
          finishDrag(row, event);
          return;
        }
        if (Math.abs(dx) < 8) return;
        drag.active = true;
        row.suppressClick = true;
        track.setPointerCapture(event.pointerId);
        track.classList.add('is-dragging');
      }
      event.preventDefault();
      row.offset = wrap(row.offset - (event.clientX - drag.lastX), row.width);
      drag.lastX = event.clientX;
      paint(row);
    });
    ['pointerup', 'pointercancel'].forEach(type => {
      window.addEventListener(type, event => finishDrag(row, event));
    });
    track.addEventListener('lostpointercapture', event => {
      // Touch initially captures the image/link. Transferring capture to this
      // track fires a bubbling lostpointercapture from that child; it does not
      // mean the gesture ended. Only release when the track itself loses it.
      if (event.target === track) finishDrag(row, event);
    });
    track.addEventListener('click', event => {
      if (row.suppressClick && event.detail !== 0) {
        event.preventDefault();
        event.stopPropagation();
        row.suppressClick = false;
      }
    }, true);
    // Keyboard focus stays visible and stable; pointer clicks keep native links.
    track.addEventListener('focusin', event => {
      if (!event.target.matches(':focus-visible')) return;
      row.focused = true;
      if (reducedMotion.matches || !row.width) return;
      const item = event.target.closest('a');
      if (item) {
        row.offset = wrap(item.getBoundingClientRect().left - group.getBoundingClientRect().left, row.width);
        row.viewport.scrollLeft = 0;
        paint(row);
      }
    });
    track.addEventListener('focusout', () => {
      row.focused = false;
      wake();
    });
    measure(row);
  }

  function start() {
    document.querySelectorAll(selector).forEach(init);
    wake();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      rows.forEach(row => finishDrag(row));
    } else wake();
  });
  window.addEventListener('blur', () => rows.forEach(row => finishDrag(row)));
  window.addEventListener('pageshow', () => {
    rows.forEach(row => { finishDrag(row); row.needsMeasure = true; });
    wake();
  });
  reducedMotion.addEventListener('change', () => {
    rows.forEach(row => { finishDrag(row); row.viewport.scrollLeft = 0; row.needsMeasure = true; });
    wake();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
