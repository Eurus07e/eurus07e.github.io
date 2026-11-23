(() => {
  const root = document.documentElement;
  const panel = document.getElementById('preferences-panel');
  const trigger = document.querySelector('.settings-trigger');
  const options = {font:['song','kai','system'],color:['purple','ink','blue']};
  function apply(name,value,save=false) {
    if (!options[name].includes(value)) value=options[name][0];
    root.dataset[name]=value;
    panel.querySelector(`input[name="${name}"][value="${value}"]`).checked=true;
    if(save)try{localStorage.setItem('nanxing-'+name,value);}catch{}
  }
  for(const name of Object.keys(options)){
    let stored;
    try{stored=localStorage.getItem('nanxing-'+name);
      if(!stored && name==='color')stored=localStorage.getItem('nanxing-accent');
    }catch{}
    apply(name,name==='font' && stored==='sans' ? 'system' : stored);
  }
  const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
  const expanded=()=>trigger.getAttribute('aria-expanded')==='true';
  const controls=panel.querySelector('.settings-content');
  const glass=panel.querySelector('.settings-glass');
  let panelMotion=[];
  function open(show){
    if(show===expanded())return;
    trigger.setAttribute('aria-expanded',String(show));
    panel.inert=!show;
    if(reducedMotion.matches || !controls.animate){
      for(const motion of panelMotion)motion.cancel();
      panelMotion=[];
      panel.hidden=!show;
      return;
    }
    panel.hidden=false;
    if(!panelMotion.length){
      const timing={duration:160,easing:'ease-in-out',fill:'both'};
      panelMotion=[
        glass.animate([{opacity:0},{opacity:1}],timing),
        controls.animate([{opacity:0,transform:'translateY(-3px)'},{opacity:1,transform:'translateY(0)'}],timing)
      ];
      if(!show){
        for(const motion of panelMotion){motion.currentTime=timing.duration;motion.reverse();}
      }
      panelMotion[0].onfinish=()=>{
        if(expanded())return;
        panel.hidden=true;
        for(const motion of panelMotion)motion.cancel();
        panelMotion=[];
      };
    }else{
      for(const motion of panelMotion)motion.reverse();
    }
  }
  const menu=document.querySelector('.nav-menu-toggle');
  const content=document.querySelector('body > .page');
  function setMenu(show){
    menu.setAttribute('aria-expanded',String(show));
    root.classList.toggle('member-menu-open',show);
    content.inert=show;
    if(!show)open(false);
  }
  menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
  document.querySelector('.ai-nav-entry').addEventListener('click',()=>setMenu(false));
  matchMedia('(max-width:640px)').addEventListener('change',()=>setMenu(false));
  const topOnly=document.getElementById('nav-top-only');
  const bar=menu.closest('.topbar');
  const storageKey='nanxing-nav-top-only';
  function updateBar(){
    const hide=topOnly.checked && (bar.inert ? window.scrollY>1 : window.scrollY>=96);
    if(bar.inert===hide)return;
    if(hide)setMenu(false);
    bar.inert=hide;
  }
  function restoreNavPreference(){
    try{topOnly.checked=localStorage.getItem(storageKey)==='true';}catch{}
    updateBar();
  }
  restoreNavPreference();
  window.addEventListener('scroll',updateBar,{passive:true});
  window.addEventListener('pageshow',()=>{setMenu(false);restoreNavPreference();});
  window.addEventListener('storage',e=>{if(e.key===storageKey||e.key===null)restoreNavPreference();});
  trigger.addEventListener('click',()=>open(!expanded()));
  panel.addEventListener('change',({target})=>{
    if(target===topOnly){
      try{localStorage.setItem(storageKey,String(topOnly.checked));}catch{}
      updateBar();
    }else apply(target.name,target.value,true);
  });
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.preferences'))open(false);});
  document.addEventListener('focusin',e=>{
    if(!e.target.closest('.preferences'))open(false);
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&expanded()){open(false);trigger.focus();return;}
    if(e.key==='Escape' && menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();return;}
    if(e.repeat||e.isComposing||e.metaKey||e.ctrlKey||e.altKey||e.shiftKey||e.target.closest('input,textarea,select,[contenteditable],dialog'))return;
    const color={b:'blue',p:'purple'}[e.key.toLowerCase()];
    if(color)apply('color',color,true);
  });
})();
