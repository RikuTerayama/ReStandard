/* Menu works independently of the legacy Bootstrap CDN. Ordinary links work without JS. */
document.documentElement.classList.add('rs-menu-ready');
document.addEventListener('DOMContentLoaded',()=>{
  const toggle=document.querySelector('.rs-nav .navbar-toggler');
  const menu=document.getElementById('navbarNav');
  if(!toggle||!menu)return;
  function setOpen(open){menu.classList.toggle('show',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');toggle.querySelector('span').textContent=open?'−':'＋';}
  toggle.addEventListener('click',()=>setOpen(!menu.classList.contains('show')));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.classList.contains('show')){setOpen(false);toggle.focus();}});
  menu.querySelectorAll('a').forEach(a=>{if(new URL(a.href).pathname===location.pathname&& !a.hash)a.setAttribute('aria-current','page');a.addEventListener('click',()=>setOpen(false));});
  // Non-content background videos are hidden in the shared editorial layout.
  document.querySelectorAll('#desktop-bg-video,#mobile-bg-video').forEach(video=>{video.pause();video.removeAttribute('autoplay');});
});
