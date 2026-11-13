(() => {
  'use strict';
  const star = (id, className = '') => `<svg class="${className}" viewBox="0 0 40 40" fill="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="3" y1="35" x2="35" y2="4" gradientUnits="userSpaceOnUse"><stop stop-color="#5cadf7"/><stop offset=".38" stop-color="#8b7ce7"/><stop offset=".68" stop-color="#d38ac8"/><stop offset="1" stop-color="#f1a887"/></linearGradient></defs><path d="M20 3c1.9 11 6 15.1 17 17-11 1.9-15.1 6-17 17C18.1 26 14 21.9 3 20 14 18.1 18.1 14 20 3Z" fill="url(#${id})"/></svg>`;
  const toggle = document.createElement('button');
  toggle.className = 'nx-ai-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', '打开南星 AI');
  toggle.setAttribute('aria-haspopup', 'dialog');
  toggle.setAttribute('aria-controls', 'nx-ai');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = `<span class="nx-ai-open-icon" aria-hidden="true">${star('nx-entry-gradient')}</span><span class="nx-ai-close-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></span>`;
  const anchor = document.createComment('nanxing-ai-entry');
  document.body.append(anchor, toggle);

  const dialog = document.createElement('dialog');
  dialog.id = 'nx-ai';
  dialog.className = 'nx-ai';
  dialog.setAttribute('aria-label', '南星 AI');
  dialog.innerHTML = `<div class="nx-ai-surface"><main class="nx-ai-main"><div class="nx-ai-welcome">${star('nx-welcome-gradient', 'nx-ai-symbol')}<h1>你好，南星<span class="nx-ai-period">。</span></h1><div class="nx-ai-suggestions" aria-label="预设问题"><button type="button">介绍一下“南星梦想计划”</button><button type="button">如何拿到更多志愿时长？</button><button type="button">我们团队近期要干什么？</button></div></div><div class="nx-ai-messages" role="log" aria-label="本次对话" aria-live="polite"></div><form class="nx-ai-composer"><label class="nx-ai-sr" for="nx-ai-input">给南星 AI 的消息</label><textarea id="nx-ai-input" rows="1" maxlength="4000" placeholder="询问 deepseek"></textarea><button class="nx-ai-send" type="submit" aria-label="发送消息" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button></form></main></div><canvas class="nx-ai-light" aria-hidden="true"></canvas><div class="nx-ai-fallback" aria-hidden="true"></div>`;
  document.body.append(dialog);
  const surface = dialog.querySelector('.nx-ai-surface');
  const main = dialog.querySelector('.nx-ai-main');
  const canvas = dialog.querySelector('canvas');
  const fallback = dialog.querySelector('.nx-ai-fallback');
  const input = dialog.querySelector('textarea');
  const form = dialog.querySelector('form');
  const send = dialog.querySelector('.nx-ai-send');
  const messages = dialog.querySelector('.nx-ai-messages');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(pointer: coarse)');
  const endpoint = document.querySelector('meta[name="nanxing-ai-endpoint"]')?.content || '';
  const arrowMarkup = send.innerHTML;
  const stopMarkup = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>';
  let conversation = [], activeRequest = null, generation = 0;
  const markdown = window.markdownit?.({html:false,linkify:false,breaks:true,typographer:false});
  if (markdown) {
    markdown.validateLink = href => /^(https?:\/\/|mailto:)/i.test(href) || /^(\/(?!\/)|#)/.test(href);
    markdown.renderer.rules.image = (tokens,index) => markdown.utils.escapeHtml(tokens[index].content || '');
    const linkOpen=markdown.renderer.rules.link_open || ((tokens,index,options,env,self)=>self.renderToken(tokens,index,options));
    markdown.renderer.rules.link_open=(tokens,index,options,env,self)=>{
      const token=tokens[index];
      token.attrSet('target','_blank');token.attrSet('rel','noopener noreferrer');
      // The same source link works in local preview and on the published site.
      const href=token.attrGet('href');
      if(href?.startsWith('https://eurus07e.github.io/nxmxjh27/') && ['127.0.0.1','localhost'].includes(location.hostname))token.attrSet('href',href.replace('https://eurus07e.github.io',''));
      return linkOpen(tokens,index,options,env,self);
    };
  }
  let target = 0, progress = 0, raf = 0, lastDraw = 0;
  let motion = null, geometry, previousOverflow = '', previousGutter = '', previousTitle = '';
  let bodyLock = null, rootLock = null;
  let previousFocus = null, historyOwned = false, returnURL = '', gl, program, uniforms;
  let started = performance.now();
  let keyboardFrame = 0;
  let viewportBaseline = {width: innerWidth, height: innerHeight};
  let editingStarted = false, followLatest = true, sizeFrame = 0;
  let layoutHeight = 0, layoutTop = 0;
  let touchScroll = false, touchEndTimer = 0, touchPoint = null;
  // Its derivative at the button is exactly 3, tapering continuously to the
  // outer page. The reverse traversal accelerates into that same endpoint.
  const buttonTravel = p => -Math.expm1(-2.821439372 * p) / -Math.expm1(-2.821439372);

  // A single distance field keeps the fine highlight, spectral bloom and reveal
  // on the same wavefront. No scaled bitmap rings or screen-size blur filters.
  function initLight() {
    try {
      gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
      if (!gl) throw new Error('WebGL unavailable');
      const compile = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('Shader compilation failed'); }
        return shader;
      };
      const vertex = compile(gl.VERTEX_SHADER, 'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}');
      const fragment = compile(gl.FRAGMENT_SHADER, `
        precision highp float;
        uniform vec2 resolution, viewport, origin;
        uniform float radius, progress, time, intensity;
        const float PI = 3.14159265359;
        vec3 spectrum(float t) {
          vec3 blue=vec3(.22,.57,1.);
          vec3 violet=vec3(.53,.29,.98);
          vec3 pink=vec3(.98,.35,.64);
          vec3 peach=vec3(1.,.64,.35);
          float p=fract(t)*6.;
          if(p<1.)return mix(blue,violet,smoothstep(0.,1.,p));
          if(p<2.)return mix(violet,pink,smoothstep(1.,2.,p));
          if(p<3.)return mix(pink,peach,smoothstep(2.,3.,p));
          if(p<4.)return mix(peach,pink,smoothstep(3.,4.,p));
          if(p<5.)return mix(pink,violet,smoothstep(4.,5.,p));
          return mix(violet,blue,smoothstep(5.,6.,p));
        }
        float gaussian(float d,float width){float a=d/width;return exp(-a*a);}
        void main(){
          vec2 p=vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y)*viewport;
          vec2 v=p-origin;
          vec2 normalized=v/viewport;
          float angle=atan(normalized.y,normalized.x);
          // Ellipse in viewport space; convert its distance back to pixels
          // so the light keeps a consistent thickness in either orientation.
          float distanceScale=length(normalized/max(length(normalized),.00001)/viewport);
          float dist=(length(normalized)-radius)/max(distanceScale,.00001);
          float flow=sin(angle*3.+time*.7)*sin(progress*PI)*2.2;
          dist+=flow;
          float phase=angle/(2.*PI)*2.+time*.065+progress*.16;
          vec3 color=spectrum(phase+dist*.0016);
          float bloom=gaussian(dist,34.)*.23 + gaussian(dist+17.,65.)*.085;
          float ribbon=gaussian(dist,7.)*.36 + gaussian(dist-1.,1.6)*.35;
          float wave=(bloom+ribbon)*smoothstep(0.,.035,progress)*(1.-smoothstep(.88,1.,progress));
          vec2 q=abs(p-viewport*.5)-(viewport*.5-vec2(17.));
          float edge=-(length(max(q,0.))+min(max(q.x,q.y),0.)-17.);
          // Keep the rounded inner light contour; fill only the outside
          // corner wedges with its spectrum instead of exposing white.
          float cornerFill=(1.-smoothstep(-1.,.8,edge))*.9;
          float edgePhase=atan(p.y-viewport.y*.5,p.x-viewport.x*.5)/(2.*PI)+time*.04;
          vec3 edgeColor=spectrum(edgePhase);
          float breathing=.88+.12*sin(time*.8);
          float perimeter=(gaussian(edge-1.2,1.6)*.64+gaussian(edge,12.)*.19+gaussian(edge,30.)*.035+cornerFill)*breathing;
          perimeter*=smoothstep(.62,.82,progress)*(1.-smoothstep(.84,1.,progress));
          float alpha=(wave+perimeter)*intensity;
          vec3 combined=(color*wave+edgeColor*perimeter)/max(wave+perimeter,.0001);
          gl_FragColor=vec4(combined,min(alpha,.92));
        }`);
      program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader link failed');
      gl.useProgram(program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      uniforms = Object.fromEntries(['resolution','viewport','origin','radius','progress','time','intensity'].map(key => [key, gl.getUniformLocation(program,key)]));
      dialog.classList.remove('nx-ai-no-webgl');
    } catch {
      gl = null; dialog.classList.add('nx-ai-no-webgl');
    }
  }
  function measure() {
    const rect = toggle.getBoundingClientRect();
    const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
    const width = dialog.clientWidth || innerWidth, height = dialog.clientHeight || innerHeight;
    geometry = {x, y, width, height, radius: Math.hypot(Math.max(x,width-x)/width, Math.max(y,height-y)/height) + .08};
    // Cap fill rate on high-DPI phones and large displays without softening the UI.
    const scale = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1400000 / (width * height)));
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    if (gl) gl.viewport(0,0,canvas.width,canvas.height);
    layoutVisibleViewport();
    render(performance.now());
  }
  function isNearLatest() {
    return messages.scrollHeight-messages.scrollTop-messages.clientHeight < 64;
  }
  function fitInput() {
    const maxHeight=parseFloat(main.style.getPropertyValue('--nx-input-max')) || 140;
    const scrollTop=input.scrollTop;
    input.style.height='28px';
    const height=Math.min(input.scrollHeight || 28,maxHeight);
    input.style.height=height+'px';
    input.style.overflowY=input.scrollHeight>height?'auto':'hidden';
    input.scrollTop=scrollTop;
    form.classList.toggle('is-multiline',height>30);
  }
  function layoutVisibleViewport() {
    if(!dialog.open)return;
    const viewport=window.visualViewport;
    // Pin to visualViewport, accounting for iOS focus-panning and zoom. The
    // surface's own offset matters when the browser moves fixed top-layer UI.
    const height=Math.round(viewport?.height || innerHeight);
    const top=Math.max(0,Math.round((viewport?.offsetTop || 0)-surface.getBoundingClientRect().top));
    const width=viewport?.width || innerWidth;
    const orientationChanged=Math.abs(innerWidth-viewportBaseline.width)>80;
    if(orientationChanged)viewportBaseline={width:innerWidth,height:Math.max(innerHeight,dialog.clientHeight)};
    else if(height>viewportBaseline.height)viewportBaseline.height=height;
    const keyboard=touch.matches && editingStarted && (viewportBaseline.height-height>120 || (navigator.virtualKeyboard?.boundingRect?.height || 0)>0);
    const previousKeyboard=dialog.classList.contains('nx-ai-keyboard');
    const changed=Math.abs(layoutHeight-height)>1 || Math.abs(layoutTop-top)>1 || keyboard!==previousKeyboard;
    dialog.classList.toggle('nx-ai-keyboard',keyboard);
    dialog.style.setProperty('--nx-visual-top',`${top}px`);
    dialog.style.setProperty('--nx-visual-left',`${viewport?.offsetLeft || 0}px`);
    main.style.top=`${top}px`;
    main.style.setProperty('--nx-view-height',`${height}px`);
    main.style.setProperty('--nx-view-width',`${width}px`);
    const maxInput=28*Math.max(2,Math.min(5,Math.floor(height*.25/28)));
    const oldMax=main.style.getPropertyValue('--nx-input-max');
    main.style.setProperty('--nx-input-max',`${maxInput}px`);
    if(oldMax!==`${maxInput}px`)fitInput();
    if(changed && followLatest && !touchScroll)messages.scrollTop=messages.scrollHeight;
    layoutHeight=height;layoutTop=top;
  }
  function scheduleViewportLayout() {
    cancelAnimationFrame(keyboardFrame);
    keyboardFrame=requestAnimationFrame(layoutVisibleViewport);
  }
  const clamp = value => Math.max(0,Math.min(1,value));
  const smooth = (a,b,value) => { const p=clamp((value-a)/(b-a)); return p*p*(3-2*p); };
  function render(now) {
    if (!geometry) return;
    const {x,y,width,height,radius} = geometry;
    const travel=buttonTravel(progress);
    const r = 18 / width + radius * travel;
    const rx = r * width, ry = r * height;
    surface.style.clipPath = progress >= 1 ? 'none' : `ellipse(${rx}px ${ry}px at ${x}px ${y}px)`;
    const content = smooth(.26,.86,travel);
    main.style.opacity = String(content);
    main.style.transform = `translateY(${(1-content)*16}px)`;
    main.inert = travel < .86 || !target;
    if (gl) {
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.viewport, width, height);
      gl.uniform2f(uniforms.origin,x,y);
      gl.uniform1f(uniforms.radius,r);
      gl.uniform1f(uniforms.progress,travel);
      gl.uniform1f(uniforms.time,reduced.matches ? 0 : (now-started)/1000);
      gl.uniform1f(uniforms.intensity,reduced.matches ? .45 : 1);
      gl.drawArrays(gl.TRIANGLES,0,6);
    } else {
      Object.assign(fallback.style, {width:`${rx*2+30}px`,height:`${ry*2+30}px`,left:`${x-rx-15}px`,top:`${y-ry-15}px`,opacity: String(.65*(1-smooth(.85,1,travel)))});
    }
  }
  function finishClose() {
    dialog.close(); anchor.after(toggle);
    document.body.style.overflow = previousOverflow;
    if(rootLock){Object.assign(document.documentElement.style,rootLock);rootLock=null;}
    if(bodyLock){
      for(const [key,value] of Object.entries(bodyLock.styles))document.body.style[key]=value;
      if(window.scrollY!==bodyLock.scrollY || window.scrollX!==bodyLock.scrollX)
        window.scrollTo({top:bodyLock.scrollY,left:bodyLock.scrollX,behavior:'instant'});
      bodyLock=null;
    }
    dialog.classList.remove('nx-ai-settled','nx-ai-keyboard');
    editingStarted=false;layoutHeight=0;layoutTop=0;
    cancelAnimationFrame(keyboardFrame);cancelAnimationFrame(sizeFrame);
    clearTimeout(touchEndTimer);touchScroll=false;touchPoint=null;
    dialog.style.removeProperty('--nx-visual-top');
    document.documentElement.style.scrollbarGutter = previousGutter;
    document.title = previousTitle;
    resetConversation(); input.value = ''; resizeInput();
    dialog.classList.remove('has-conversation');
    (previousFocus?.isConnected ? previousFocus : toggle).focus({preventScroll:true});
  }
  function frame(now) {
    raf = 0;
    if (!dialog.open || document.hidden) return;
    if (motion) {
      // Cubic Hermite interpolation carries velocity through a reversal, so a
      // second click turns the existing wave around instead of starting over.
      const t=clamp((now-motion.start)/motion.duration), t2=t*t, t3=t2*t;
      progress=clamp((2*t3-3*t2+1)*motion.from+(t3-2*t2+t)*motion.velocity*motion.duration+(-2*t3+3*t2)*motion.to);
      if (t === 1) {
        progress=motion.to; motion=null;
        if(target)dialog.classList.add('nx-ai-settled');
        if (!target) { render(now); finishClose(); return; }
      }
    }
    render(now); lastDraw=now;
    if (motion) raf=requestAnimationFrame(frame);
  }
  function startFrame() { if (!raf) raf=requestAnimationFrame(frame); }
  function velocityAt(now) {
    if (!motion) return 0;
    const t=clamp((now-motion.start)/motion.duration), t2=t*t;
    return ((6*t2-6*t)*motion.from+(3*t2-4*t+1)*motion.velocity*motion.duration+(-6*t2+6*t)*motion.to)/motion.duration;
  }
  function setOpen(open) {
    const next = Number(open);
    if (target === next && (dialog.open || !next)) return;
    const now = performance.now();
    let velocity = velocityAt(now);
    target = next;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'关闭南星 AI':'打开南星 AI');
    if (open && !dialog.open) {
      previousFocus=document.activeElement;
      viewportBaseline={width:innerWidth,height:Math.max(innerHeight,window.visualViewport?.height || 0)};
      editingStarted=false;followLatest=true;
      bodyLock={scrollY:window.scrollY,scrollX:window.scrollX,styles:Object.fromEntries(['position','top','left','width'].map(key=>[key,document.body.style[key]]))};
      previousOverflow=document.body.style.overflow;
      previousGutter=document.documentElement.style.scrollbarGutter;
      previousTitle=document.title;
      document.documentElement.style.scrollbarGutter='stable';
      document.body.style.overflow='hidden';
      rootLock={overflow:document.documentElement.style.overflow,overscrollBehavior:document.documentElement.style.overscrollBehavior};
      Object.assign(document.documentElement.style,{overflow:'hidden',overscrollBehavior:'none'});
      // Keep the mobile document in flow: fixing body collapses its scroll
      // range and makes Safari expand its browser bars when the modal opens.
      // Modal inertness, root overflow and the touch boundary guard lock it.
      if(!touch.matches)Object.assign(document.body.style,{position:'fixed',top:`${-bodyLock.scrollY}px`,left:`${-bodyLock.scrollX}px`,width:'100%'});
      main.inert=true;
      dialog.append(toggle); dialog.showModal();
      toggle.focus({preventScroll:true});
      document.title='南星 AI';
      if (!program && !dialog.classList.contains('nx-ai-no-webgl')) initLight();
      measure();
      velocity=.0038;
    }
    if (!open) { dialog.classList.remove('nx-ai-settled');resetConversation(); input.blur(); }
    if (reduced.matches) {
      progress=target; motion=null;dialog.classList.toggle('nx-ai-settled',Boolean(target)); render(now);
      if (!target) finishClose();
      return;
    }
    const distance=Math.abs(target-progress);
    const duration=(open?480:420)*Math.max(.35,Math.sqrt(distance));
    const maxVelocity=3*Math.max(distance,.04)/duration;
    velocity=Math.max(-maxVelocity,Math.min(maxVelocity,velocity));
    motion={from:progress,to:target,start:now,duration,velocity};
    startFrame();
  }
  function requestOpen() {
    returnURL=location.href;
    history.pushState({nanxingAI:true},'', '#ai'); historyOwned=true;
    setOpen(true);
  }
  function requestClose() {
    setOpen(false);
    if (historyOwned && location.hash==='#ai') {
      historyOwned=false; history.back();
    } else if (location.hash==='#ai') {
      history.replaceState(history.state,'',returnURL || location.pathname+location.search);
    }
  }
  toggle.addEventListener('click',()=>target?requestClose():requestOpen());
  dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const controls=main.inert?[toggle]:[toggle,...(dialog.classList.contains('has-conversation')||dialog.classList.contains('nx-ai-keyboard')?[]:dialog.querySelectorAll('.nx-ai-suggestions button')),...messages.querySelectorAll('a[href],button:not(:disabled)'),input,...(send.disabled?[]:[send])];
    const index=controls.indexOf(document.activeElement);
    event.preventDefault();
    controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length].focus({preventScroll:true});
  });
  window.addEventListener('popstate',()=>{historyOwned=location.hash==='#ai' && history.state?.nanxingAI===true;setOpen(location.hash==='#ai');});
  window.addEventListener('resize',()=>{if(dialog.open)measure();});
  window.visualViewport?.addEventListener('resize',scheduleViewportLayout);
  window.visualViewport?.addEventListener('scroll',scheduleViewportLayout);
  input.addEventListener('focus',()=>{editingStarted=true;scheduleViewportLayout();});
  input.addEventListener('blur',()=>{scheduleViewportLayout();});
  navigator.virtualKeyboard?.addEventListener('geometrychange',scheduleViewportLayout);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && dialog.open)startFrame();});
  reduced.addEventListener('change',()=>{
    if (!dialog.open) return;
    if(reduced.matches){progress=target;motion=null;dialog.classList.toggle('nx-ai-settled',Boolean(target));render(performance.now());if(!target)finishClose();}
    else startFrame();
  });
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();gl=null;dialog.classList.add('nx-ai-no-webgl');});
  canvas.addEventListener('webglcontextrestored',()=>{initLight();if(dialog.open)measure();});

  function resizeInput() {
    send.disabled=!activeRequest&&!input.value.trim();
    send.setAttribute('aria-label',activeRequest?'停止生成':'发送消息');
    send.innerHTML=activeRequest?stopMarkup:arrowMarkup;
    send.classList.toggle('is-generating',Boolean(activeRequest));
    fitInput();
    if(followLatest&&!touchScroll){cancelAnimationFrame(sizeFrame);sizeFrame=requestAnimationFrame(()=>{messages.scrollTop=messages.scrollHeight;});}
  }
  function resetConversation() {
    generation++;activeRequest?.abort();activeRequest=null;conversation=[];
    messages.replaceChildren();messages.setAttribute('aria-busy','false');
    dialog.classList.remove('has-conversation');resizeInput();
  }
  input.addEventListener('input',resizeInput);
  // Keep the software keyboard and caret stable when tapping send/stop.
  let sendPointer=null, pointerSubmitAt=-Infinity;
  send.addEventListener('pointerdown',event=>{
    sendPointer=null;
    if(document.activeElement!==input || event.button!==0)return;
    event.preventDefault();
    sendPointer={id:event.pointerId,x:event.clientX,y:event.clientY};
  });
  send.addEventListener('pointerup',event=>{
    const start=sendPointer;sendPointer=null;
    if(!start || start.id!==event.pointerId || Math.hypot(event.clientX-start.x,event.clientY-start.y)>12)return;
    // WebKit can suppress click after a cancelled touch pointerdown. Submit
    // here to preserve the keyboard; consume any compatibility click below.
    event.preventDefault();pointerSubmitAt=performance.now();form.requestSubmit();
  });
  send.addEventListener('pointercancel',()=>{sendPointer=null;});
  send.addEventListener('click',event=>{
    if(event.detail>0 && performance.now()-pointerSubmitAt<800)event.preventDefault();
  });
  messages.addEventListener('scroll',()=>{followLatest=isNearLatest();},{passive:true});
  dialog.addEventListener('touchstart',event=>{
    if(event.touches.length!==1){touchPoint=null;return;}
    clearTimeout(touchEndTimer);
    touchPoint={x:event.touches[0].clientX,y:event.touches[0].clientY};
    touchScroll=Boolean(event.target.closest('.nx-ai-messages,textarea,.nx-ai-suggestions,.nx-ai-welcome'));
  },{passive:true});
  dialog.addEventListener('touchmove',event=>{
    if(event.touches.length!==1||!touchPoint)return;
    const point=event.touches[0],dx=point.clientX-touchPoint.x,dy=point.clientY-touchPoint.y;
    touchPoint={x:point.clientX,y:point.clientY};
    // Let content scroll natively; stop only chaining into the fixed modal or
    // the underlying page. This avoids iOS keyboard/viewport rubber-band loops.
    if(Math.abs(dx)>Math.abs(dy)){
      const horizontal=event.target.closest('table,pre,.nx-ai-suggestions');
      if(horizontal&&horizontal.scrollWidth>horizontal.clientWidth)return;
    }
    const scroller=event.target.closest('textarea,.nx-ai-messages,.nx-ai-welcome');
    if(scroller && scroller.scrollHeight>scroller.clientHeight+1){
      const top=scroller.scrollTop,bottom=scroller.scrollHeight-scroller.clientHeight;
      if((dy<0&&top<bottom-1)||(dy>0&&top>1))return;
    }
    if(event.cancelable)event.preventDefault();
  },{passive:false});
  const endTouch=()=>{touchPoint=null;touchEndTimer=setTimeout(()=>{touchScroll=false;followLatest=isNearLatest();},160);};
  dialog.addEventListener('touchend',endTouch,{passive:true});
  dialog.addEventListener('touchcancel',endTouch,{passive:true});
  dialog.querySelectorAll('.nx-ai-suggestions button').forEach(button=>{
    button.addEventListener('pointerdown',event=>{if(document.activeElement===input&&event.button===0)event.preventDefault();});
    button.addEventListener('click',()=>sendMessage(button.textContent));
  });
  form.addEventListener('click',event=>{
    if(event.target.closest('button,a,textarea'))return;
    input.focus({preventScroll:true});
  });
  function addMessage(text,who) {
    const row=document.createElement('div');row.className=`nx-ai-message nx-ai-message-${who}`;
    const body=document.createElement('div');body.className='nx-ai-message-body';body.textContent=text;
    row.append(body);messages.append(row);return {row,body};
  }
  function paint(body,text) {
    const follow=followLatest && !touchScroll;
    if(markdown)body.innerHTML=markdown.render(text);else body.textContent=text;
    if(follow)messages.scrollTop=messages.scrollHeight;
  }
  function remember(history,text,answer) {
    conversation=[...history,{role:'user',content:text},...(answer?[{role:'assistant',content:answer}]:[])];
    // Only completed pairs are sent back, with bounded in-memory context.
    while(conversation.length>28 || conversation.reduce((n,m)=>n+m.content.length,0)>28000)conversation.splice(0,2);
  }
  function addCopy(row,text) {
    const copy=document.createElement('button');copy.className='nx-ai-copy';copy.type='button';copy.setAttribute('aria-label','复制回答');
    copy.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg>';
    copy.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(text);copy.setAttribute('aria-label','已复制');copy.classList.add('is-copied');setTimeout(()=>{copy.setAttribute('aria-label','复制回答');copy.classList.remove('is-copied');},1600);}
      catch{copy.setAttribute('aria-label','复制失败，请选择文字复制');}
    });row.append(copy);
  }
  async function receiveEvents(response,onEvent) {
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    try{
      while(true){
        const {done,value}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});
        let boundary;
        while((boundary=buffer.indexOf('\n\n'))!==-1){
          const block=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);
          for(const line of block.split('\n'))if(line.startsWith('data: '))onEvent(JSON.parse(line.slice(6)));
        }
        if(done)break;
      }
    }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  }
  async function sendMessage(text,retry) {
    if(activeRequest||!target)return;
    const history=retry?.history || conversation.slice();
    messages.querySelectorAll('.nx-ai-retry').forEach(button=>button.remove());
    followLatest=true;
    dialog.classList.add('has-conversation');
    if(!retry)addMessage(text,'user');
    const reply=retry?.reply || addMessage('','assistant');
    reply.row.querySelectorAll('.nx-ai-error,.nx-ai-copy').forEach(node=>node.remove());
    reply.body.replaceChildren();reply.row.classList.add('is-pending');
    reply.body.setAttribute('aria-label','正在回答');
    const controller=new AbortController(),id=++generation;activeRequest=controller;
    input.value='';resizeInput();messages.setAttribute('aria-busy','true');
    messages.scrollTop=messages.scrollHeight;
    let answer='',completed=false,paintTimer=0,finishReason='stop';
    const flush=()=>{clearTimeout(paintTimer);paintTimer=0;if(id===generation)paint(reply.body,answer);};
    try{
      if(!endpoint)throw new Error('AI 服务暂不可用，请稍后再试。');
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',body:JSON.stringify({messages:[...history,{role:'user',content:text}]}),signal:controller.signal});
      if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error||'连接暂不可用，请重试。');}
      if(!response.body || !response.headers.get('content-type')?.includes('text/event-stream'))throw new Error('连接暂不可用，请重试。');
      await receiveEvents(response,event=>{
        if(id!==generation)return;
        if(event.type==='delta'){
          answer+=event.text;reply.row.classList.remove('is-pending');reply.body.removeAttribute('aria-label');
          if(!paintTimer)paintTimer=setTimeout(flush,70);
        }else if(event.type==='done'){completed=true;finishReason=event.finishReason;}
        else if(event.type==='error')throw new Error(event.message);
      });
      if(!completed)throw new Error('连接中断，请重试。');
      if(id!==generation)return;
      flush();remember(history,text,answer);addCopy(reply.row,answer);
      if(finishReason==='length'){
        const note=document.createElement('div');note.className='nx-ai-error';note.textContent='回答较长，可继续追问。';reply.row.append(note);
      }
    }catch(error){
      if(id!==generation)return;
      flush();
      const stopped=controller.signal.aborted;
      if(stopped&&answer)remember(history,text,answer);
      const note=document.createElement('div');note.className='nx-ai-error';
      const label=document.createElement('span');label.textContent=stopped?'已停止':(error instanceof TypeError?'连接暂不可用，请重试。':error.message);
      note.append(label);
      const retryButton=document.createElement('button');retryButton.type='button';retryButton.className='nx-ai-retry';retryButton.textContent='重试';
      retryButton.addEventListener('click',()=>sendMessage(text,{history,reply}));note.append(retryButton);reply.row.append(note);
      if(answer)addCopy(reply.row,answer);
    }finally{
      clearTimeout(paintTimer);
      if(id===generation){activeRequest=null;reply.row.classList.remove('is-pending');reply.body.removeAttribute('aria-label');messages.setAttribute('aria-busy','false');resizeInput();}
    }
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(activeRequest){activeRequest.abort();return;}
    const text=input.value.trim();if(text)sendMessage(text);
  });
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229&&!touch.matches&&!activeRequest){event.preventDefault();form.requestSubmit();}
  });
  // Compile during idle time, keeping shader setup off the first click.
  const prepareLight=()=>{if(!program&&!gl){initLight();if(gl){gl.viewport(0,0,1,1);gl.drawArrays(gl.TRIANGLES,0,6);}}};
  if(location.hash==='#ai')setOpen(true);
  else if('requestIdleCallback' in window)requestIdleCallback(prepareLight,{timeout:1200});
  else setTimeout(prepareLight,200);
})();
