/* Keep the external form and its scripts out of the initial page load. */
(() => {
  let helper;
  function loadHelper() {
    return helper ||= new Promise((resolve,reject)=>{
      if(window.jotformEmbedHandler){resolve();return;}
      const script=document.createElement('script');script.src='https://cdn.jotfor.ms/s/umd/latest/for-form-embed-handler.js';script.async=true;
      const timer=setTimeout(()=>{helper=null;reject(new Error('Form helper timed out'));},8000);
      script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();helper=null;reject(new Error('Form helper unavailable'));};document.head.append(script);
    });
  }
  document.querySelectorAll('[data-contact-embed]').forEach(root=>{
    const button=root.querySelector('[data-load-form]'),frame=root.querySelector('iframe'),status=root.querySelector('[data-form-status]');let started=false;
    async function load(){
      if(started)return;started=true;button.hidden=true;frame.hidden=false;status.textContent='フォームを読み込んでいます。';
      frame.addEventListener('load',()=>{status.textContent='フォームが表示されない場合は、別のタブで開いてください。';},{once:true});
      // The provider reads the existing src when initialising its message handler.
      frame.src=frame.dataset.src;
      try{await loadHelper();window.jotformEmbedHandler?.(`iframe[id='${frame.id}']`,'https://form.jotform.com/');}catch{status.textContent='フォームが表示されない場合は、別のタブで開いてください。';}
    }
    button.hidden=false;button.addEventListener('click',load);
    if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load();}},{rootMargin:'180px'});observer.observe(root);}
  });
})();
