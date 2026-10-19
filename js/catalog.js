(() => {
  'use strict';
  const track=document.querySelector('.gallery-track');
  const dialog=document.querySelector('.zoom-dialog');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  if(track){
    const slides=[...track.children], thumbs=[...document.querySelectorAll('[data-image-index]')];
    const controls=document.querySelector('.gallery-controls');
    controls.hidden=false;
    const current=()=>Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/track.clientWidth)));
    const gallery=track.closest('.gallery'),pause=gallery.querySelector('[data-gallery-pause]');
    let selected=0,paused=false,hover=false,inView=false,timer=null,start=null,dragged=false;
    track.classList.add('gallery-ready');
    const canPlay=()=>slides.length>1&&!paused&&!reduce.matches&&!hover&&!start&&!document.hidden&&inView&&!dialog?.open&&(!gallery.contains(document.activeElement)||!document.activeElement.matches(':focus-visible')||document.activeElement===pause);
    function schedule(){clearTimeout(timer);if(canPlay())timer=setTimeout(()=>{go(selected+1);schedule();},5000);}
    const go=index=>{selected=(index+slides.length)%slides.length;track.scrollTo({left:selected*track.clientWidth,behavior:reduce.matches?'instant':'smooth'});schedule();};
    thumbs.forEach(a=>a.addEventListener('click',event=>{event.preventDefault();go(Number(a.dataset.imageIndex));}));
    document.querySelector('[data-prev]').addEventListener('click',()=>go(current()-1));
    document.querySelector('[data-next]').addEventListener('click',()=>go(current()+1));
    track.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();go(current()+(event.key==='ArrowRight'?1:-1));}});
    track.addEventListener('scroll',()=>{
      const visible=current();
      document.querySelector('[data-position]').textContent=`${visible+1} / ${slides.length}`;
      thumbs.forEach((a,i)=>{if(i===visible)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
    },{passive:true});
    track.addEventListener('scrollend',()=>{selected=current();schedule();});
    new ResizeObserver(()=>track.scrollTo({left:selected*track.clientWidth,behavior:'instant'})).observe(track);
    // Native vertical scrolling remains available; horizontal drags move only the gallery.
    track.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0)return;start={x:event.clientX,y:event.clientY,left:track.scrollLeft,id:event.pointerId,axis:null};dragged=false;clearTimeout(timer);},{passive:true});
    track.addEventListener('pointermove',event=>{if(!start||start.id!==event.pointerId)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(!start.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8){start.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';dragged=true;if(start.axis==='x')track.setPointerCapture(event.pointerId);}if(start.axis==='x'){event.preventDefault();track.scrollTo({left:start.left-dx,behavior:'instant'});}}, {passive:false});
    function finish(event){if(!start||event.pointerId!==start.id)return;const horizontal=start.axis==='x';start=null;if(horizontal)go(current());else schedule();}
    track.addEventListener('pointerup',finish);track.addEventListener('pointercancel',finish);
    track.addEventListener('dragstart',e=>e.preventDefault());
    pause.disabled=slides.length<2||reduce.matches;
    pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'自動切り替えを再開':'自動切り替えを停止');schedule();});
    gallery.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=true;schedule();}});
    gallery.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){hover=false;schedule();}});
    gallery.addEventListener('focusin',schedule);gallery.addEventListener('focusout',()=>setTimeout(schedule,0));
    document.addEventListener('visibilitychange',schedule);dialog?.addEventListener('close',schedule);
    reduce.addEventListener('change',()=>{pause.disabled=slides.length<2||reduce.matches;schedule();});
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();},{threshold:.15}).observe(track);
    track.addEventListener('click',event=>{
      const link=event.target.closest('[data-zoom]');
      if(!link)return;
      if(dragged){event.preventDefault();return;}
      if(!dialog||typeof dialog.showModal!=='function')return;
      event.preventDefault();
      const img=dialog.querySelector('img');img.src=link.href;img.alt=link.querySelector('img').alt;
      dialog.querySelector('[data-original-link]').href=link.href;dialog.showModal();schedule();
    });
  }
  document.querySelector('[data-close-zoom]')?.addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  // Public prices are manually maintained; only observed stock notices expire.
  document.querySelectorAll('[data-stock-expires]').forEach(el=>{
    const expires=Number(el.dataset.stockExpires);
    const refresh=()=>{if(Date.now()>=expires){if(el.dataset.stockFallback==='hide')el.hidden=true;else el.textContent='在庫はBASEでご確認ください';}};
    setTimeout(refresh,Math.max(0,expires-Date.now()+10));
    addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',refresh);
  });
  // A page left open must not continue presenting a cached offer as current.
  // The server also enforces expiry, including for JavaScript-disabled visitors.
  const expires=Number(document.body.dataset.offerExpires);
  function expire(){
    if(!expires||Date.now()<expires)return;
    document.querySelectorAll('[data-volatile]').forEach(el=>{if(el.dataset.stockFallback==='hide')el.hidden=true;else el.textContent='最新の価格・在庫はBASEでご確認ください';});
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el=>{
      try{const data=JSON.parse(el.textContent);if(data['@type']==='Product'){delete data.offers;el.textContent=JSON.stringify(data);}}catch{}
    });
  }
  if(expires){setTimeout(expire,Math.max(0,expires-Date.now()+10));addEventListener('pageshow',expire);document.addEventListener('visibilitychange',expire);}
})();
