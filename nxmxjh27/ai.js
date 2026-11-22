(() => {
  'use strict';
  const star = (id, className = '') => `<svg class="${className}" viewBox="0 0 40 40" fill="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="3" y1="35" x2="35" y2="4" gradientUnits="userSpaceOnUse"><stop stop-color="#5cadf7"/><stop offset=".38" stop-color="#8b7ce7"/><stop offset=".68" stop-color="#d38ac8"/><stop offset="1" stop-color="#f1a887"/></linearGradient></defs><path d="M20 3c1.9 11 6 15.1 17 17-11 1.9-15.1 6-17 17C18.1 26 14 21.9 3 20 14 18.1 18.1 14 20 3Z" fill="url(#${id})"/></svg>`;
  const toggle = document.querySelector('.ai-nav-entry');
  if (!toggle) return;
  toggle.className = 'nx-ai-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'AI 助手');
  toggle.setAttribute('aria-haspopup', 'dialog');
  toggle.setAttribute('aria-controls', 'nx-ai');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = `<span class="nx-ai-open-icon" aria-hidden="true">${star('nx-entry-gradient')}</span><span class="nx-ai-close-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></span>`;
  const anchor = document.createComment('nanxing-ai-entry');
  const entrySpace = document.createElement('span');
  entrySpace.className = 'nx-ai-entry-space';
  entrySpace.setAttribute('aria-hidden','true');
  toggle.before(anchor);

  const dialog = document.createElement('dialog');
  dialog.id = 'nx-ai';
  dialog.className = 'nx-ai';
  dialog.setAttribute('aria-label', '南星 AI');
  dialog.innerHTML = `<div class="nx-ai-surface"><main class="nx-ai-main"><div class="nx-ai-welcome">${star('nx-welcome-gradient', 'nx-ai-symbol')}<h1>你好，南星<span class="nx-ai-period">。</span></h1></div><div class="nx-ai-messages" role="log" aria-label="本次对话" aria-live="polite"></div><form class="nx-ai-composer"><label class="nx-ai-sr" for="nx-ai-input">给南星 AI 的消息</label><textarea id="nx-ai-input" rows="1" maxlength="4000" placeholder="询问 deepseek"></textarea><button class="nx-ai-send" type="submit" aria-label="发送消息" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button></form><div class="nx-ai-suggestions" aria-label="预设问题"></div></main></div><canvas class="nx-ai-light" aria-hidden="true"></canvas><div class="nx-ai-fallback" aria-hidden="true"></div>`;
  document.body.append(dialog);
  const restart=document.createElement('button');
  restart.type='button';restart.className='nx-ai-restart';restart.setAttribute('aria-label','重新对话');
  restart.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 4-5 5 5 5M4 9h9a6 6 0 0 1 0 12"/></svg>';
  dialog.append(restart);
  restart.addEventListener('click',()=>{
    input.blur();input.value='';editingStarted=false;followLatest=true;
    resetConversation();refreshSuggestions();revealSuggestions();scheduleViewportLayout();
    toggle.focus({preventScroll:true});
  });
  const surface = dialog.querySelector('.nx-ai-surface');
  const main = dialog.querySelector('.nx-ai-main');
  const canvas = dialog.querySelector('canvas');
  const fallback = dialog.querySelector('.nx-ai-fallback');
  const input = dialog.querySelector('textarea');
  const form = dialog.querySelector('form');
  const send = dialog.querySelector('.nx-ai-send');
  const icon=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const toolbar=document.createElement('div');toolbar.className='nx-ai-toolbar';
  toolbar.innerHTML=`<button type="button" class="nx-ai-tool nx-ai-attach" aria-label="上传图片或文件">${icon('<path d="M12 5v14M5 12h14"/>')}</button><button type="button" class="nx-ai-tool nx-ai-thinking" aria-pressed="false">${icon('<path d="m9 4-5 5 3 3-3 3 5 5m6-16 5 5-3 3 3 3-5 5M14 3l-4 18"/>')}<span>深度思考</span></button><button type="button" class="nx-ai-tool nx-ai-search" aria-pressed="false">${icon('<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>')}<span>联网搜索</span></button><div class="nx-ai-model"><button type="button" class="nx-ai-model-trigger" value="deepseek-flash" aria-label="选择模型，当前 Flash" aria-haspopup="menu" aria-expanded="false"><span>Flash</span>${icon('<path d="m8 10 4 4 4-4"/>')}</button><div class="nx-ai-model-menu" role="menu" aria-label="选择模型" hidden><button type="button" role="menuitemradio" aria-checked="true" data-model="deepseek-flash"><span><strong>Flash</strong><small>快速 · 多模态</small></span>${icon('<path d="m5 12 4 4L19 6"/>')}</button><button type="button" role="menuitemradio" aria-checked="false" data-model="deepseek-v4-pro"><span><strong>Pro</strong><small>进阶 · 文本</small></span>${icon('<path d="m5 12 4 4L19 6"/>')}</button></div></div>`;
  const fileInput=document.createElement('input');fileInput.type='file';fileInput.multiple=true;fileInput.hidden=true;fileInput.accept='.png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.json,.epub';
  const attachments=document.createElement('div');attachments.className='nx-ai-attachments';attachments.setAttribute('aria-label','待发送附件');
  const composerNote=document.createElement('div');composerNote.className='nx-ai-composer-note';composerNote.setAttribute('role','status');
  const model=toolbar.querySelector('.nx-ai-model-trigger'),thinkButton=toolbar.querySelector('.nx-ai-thinking'),searchButton=toolbar.querySelector('.nx-ai-search'),attachButton=toolbar.querySelector('.nx-ai-attach');
  form.prepend(attachments);form.append(composerNote,toolbar,fileInput);toolbar.append(send);
  let pendingFiles=[],uploadEpoch=0,activeAttachmentRequest=false;
  const say=message=>{composerNote.textContent=message;};
  const toggleOption=button=>{input.blur();const enabled=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(enabled));button.classList.toggle('is-hover-paused',!enabled);};
  [thinkButton,searchButton].forEach(button=>button.addEventListener('pointerleave',()=>button.classList.remove('is-hover-paused')));
  thinkButton.addEventListener('click',()=>toggleOption(thinkButton));
  searchButton.addEventListener('click',()=>toggleOption(searchButton));
  const modelMenu=toolbar.querySelector('.nx-ai-model-menu');
  let modelMenuOpen=false,modelMenuAnimation=null;
  function setModelMenu(open){
    if(modelMenuOpen===open)return;
    const from=modelMenu.hidden?{transform:'scale(.92)',opacity:'0'}:{transform:getComputedStyle(modelMenu).transform,opacity:getComputedStyle(modelMenu).opacity};
    modelMenuOpen=open;modelMenuAnimation?.cancel();modelMenuAnimation=null;
    model.setAttribute('aria-expanded',String(open));modelMenu.inert=!open;
    if(reduced.matches){modelMenu.hidden=!open;}
    else {
      modelMenu.hidden=false;
      const animation=modelMenu.animate([from,{transform:open?'scale(1)':'scale(.92)',opacity:open?1:0}],{duration:open?200:150,easing:open?'cubic-bezier(.2,.75,.25,1)':'cubic-bezier(.4,0,.8,.3)',fill:'both'});
      modelMenuAnimation=animation;
      animation.onfinish=()=>{if(modelMenuAnimation!==animation)return;modelMenu.hidden=!modelMenuOpen;animation.cancel();modelMenuAnimation=null;};
    }
    if(open)modelMenu.querySelector('[aria-checked="true"]').focus({preventScroll:true});
  }
  function closeModelMenu(){setModelMenu(false);}
  model.addEventListener('click',()=>{input.blur();setModelMenu(!modelMenuOpen);});
  modelMenu.addEventListener('click',event=>{
    const choice=event.target.closest('[data-model]');if(!choice)return;
    model.value=choice.dataset.model;model.dispatchEvent(new Event('change'));
    model.querySelector('span').textContent=model.value==='deepseek-flash'?'Flash':'Pro';model.setAttribute('aria-label',`选择模型，当前 ${model.querySelector('span').textContent}`);
    modelMenu.querySelectorAll('[data-model]').forEach(button=>button.setAttribute('aria-checked',String(button.dataset.model===model.value)));
    closeModelMenu();model.focus({preventScroll:true});
  });
  modelMenu.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeModelMenu();model.focus({preventScroll:true});}
    else if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();const choices=[...modelMenu.querySelectorAll('button')],index=choices.indexOf(document.activeElement);choices[event.key==='Home'?0:event.key==='End'?choices.length-1:(index+1)%choices.length].focus();}
  });
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.nx-ai-model'))closeModelMenu();});
  model.addEventListener('change',()=>{
    if(model.value!=='deepseek-flash'&&(activeAttachmentRequest||pendingFiles.length||conversation.some(m=>m.attachments?.length))){model.value='deepseek-flash';say('这段对话包含附件，请继续使用 Flash；重新对话后可选择 Pro。');return;}
    const pro=model.value!=='deepseek-flash';searchButton.disabled=pro;attachButton.disabled=pro;
    if(pro)searchButton.setAttribute('aria-pressed','false');
    say('');
  });
  attachButton.addEventListener('click',()=>{input.blur();say('');fileInput.click();});
  function renderFiles(){
    attachments.replaceChildren();
    for(const file of pendingFiles){
      const chip=document.createElement('div');chip.className='nx-ai-attachment';
      if(file.preview){const img=document.createElement('img');img.src=file.preview;img.alt='';chip.append(img);}
      else {const symbol=document.createElement('span');symbol.className='nx-ai-file-icon';symbol.innerHTML=icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"/>');chip.append(symbol);}
      const info=document.createElement('span'),name=document.createElement('span'),state=document.createElement('small');name.textContent=file.name;state.textContent=file.error?'上传失败':file.token?'已就绪':'正在上传并解析…';info.append(name,state);chip.append(info);
      if(file.error){const retry=document.createElement('button');retry.type='button';retry.textContent='重试';retry.setAttribute('aria-label',`重新上传 ${file.name}`);retry.onclick=()=>uploadAttachment(file);chip.append(retry);}
      const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label',`移除 ${file.name}`);remove.innerHTML=icon('<path d="m7 7 10 10M17 7 7 17"/>');remove.onclick=()=>{file.controller?.abort();if(file.preview)URL.revokeObjectURL(file.preview);pendingFiles=pendingFiles.filter(f=>f!==file);renderFiles();resizeInput();};chip.append(remove);attachments.append(chip);
    }
  }
  async function uploadAttachment(file){
    const epoch=uploadEpoch;file.error=false;file.controller=new AbortController();renderFiles();resizeInput();
    try{
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('无法读取文件。'));reader.readAsDataURL(file.file);});
      if(epoch!==uploadEpoch||!pendingFiles.includes(file))return;
      const response=await fetch(endpoint.replace(/\/chat$/,'/files'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,data}),signal:file.controller.signal});
      const result=await response.json();if(!response.ok)throw Error(result.error||'上传失败，请重试。');file.token=result.token;
    }catch(error){if(!file.controller.signal.aborted){file.error=true;say(error.message);}}
    finally{if(epoch===uploadEpoch){renderFiles();resizeInput();}}
  }
  function selectFiles(files){
    if(model.value!=='deepseek-flash'){say('请先选择 Flash，再添加附件。');return;}
    for(const file of files){
      if(pendingFiles.length>=4){say('每次最多添加 4 个文件。');break;}
      if(!file.size||file.size>8*1024*1024){say(`${file.name} 为空或超过 8 MB。`);continue;}
      if(!/\.(png|jpe?g|gif|webp|pdf|docx?|pptx?|xlsx?|txt|md|csv|json|epub)$/i.test(file.name)){say('暂不支持该格式，请选择图片、PDF、Office 或文本文件。');continue;}
      const item={file,name:file.name,preview:/^image\//.test(file.type)?URL.createObjectURL(file):null};pendingFiles.push(item);uploadAttachment(item);
    }
  }
  fileInput.addEventListener('cancel',event=>{event.stopPropagation();say('');});
  fileInput.addEventListener('change',()=>{selectFiles(fileInput.files);fileInput.value='';});
  input.addEventListener('paste',event=>{const files=[...(event.clipboardData?.files||[])];if(files.length){event.preventDefault();selectFiles(files);}});
  form.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();form.classList.add('is-dragging');}});
  form.addEventListener('dragleave',()=>form.classList.remove('is-dragging'));
  form.addEventListener('drop',event=>{event.preventDefault();form.classList.remove('is-dragging');selectFiles(event.dataTransfer.files);});
  function clearFiles(){closeModelMenu();uploadEpoch++;pendingFiles.forEach(f=>{f.controller?.abort();if(f.preview)URL.revokeObjectURL(f.preview);});pendingFiles=[];renderFiles();say('');}
  new ResizeObserver(()=>{
    if(form.offsetHeight)main.style.setProperty('--nx-composer-height',`${form.offsetHeight}px`);
  }).observe(form);
  const messages = dialog.querySelector('.nx-ai-messages');
  const suggestions = dialog.querySelector('.nx-ai-suggestions');
  let suggestionsPending = false, welcomeAnimations = [];
  // Seven equally likely slots give the requested 2:1:1:1:2 greeting weights.
  const greetings=['你好，南星。','你好，南星。','最近有什么新想法？','有什么需要我帮忙的？','有什么想了解的？','我们从哪里开始？','我们从哪里开始？'];
  const refresh=document.createElement('button');refresh.type='button';refresh.className='nx-ai-refresh';refresh.setAttribute('aria-label','换一组预设问题');
  refresh.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></svg><span>换一组</span>';
  refresh.addEventListener('click',()=>{refreshSuggestions(false);revealSuggestions(false);});
  let previousQuestions=[];
  const suggestedQuestions = [
    '介绍一下“南星梦想计划”',
    '如何拿到更多志愿时长？',
    '我们团队近期要干什么？',
    '返乡宣讲前要准备哪些材料？',
    '4 人团队怎么分工？',
    '帮我列一份宣讲 PPT 大纲',
    '宣讲结束后要交哪些材料？',
    '志愿服务时长怎么分配？',
    '有哪些可以参加的专项活动？',
    '帮我写一段联系母校老师的开场白',
    '如何安排一场 15 分钟的返乡宣讲？',
    '宣讲时高中生可能会问哪些问题？',
    '帮我列一份活动工作拍摄清单',
    '新闻稿怎么写，才能突出我们团队的特色？'
  ];
  function refreshSuggestions(changeGreeting=true) {
    if(changeGreeting){
      const greeting=greetings[Math.floor(Math.random()*greetings.length)];
      const punctuation=document.createElement('span');punctuation.className='nx-ai-period';punctuation.textContent=greeting.slice(-1);
      dialog.querySelector('.nx-ai-welcome h1').replaceChildren(document.createTextNode(greeting.slice(0,-1)),punctuation);
    }
    welcomeAnimations.forEach(animation=>animation.cancel());
    welcomeAnimations=[];
    suggestionsPending=true;
    suggestions.classList.add('is-awaiting-entry');
    if(changeGreeting)dialog.querySelector('.nx-ai-welcome').classList.add('is-awaiting-entry');
    const questions=suggestedQuestions.filter(text=>!previousQuestions.includes(text));
    for(let i=questions.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [questions[i],questions[j]]=[questions[j],questions[i]];
    }
    previousQuestions=questions.slice(0,3);
    suggestions.replaceChildren(...previousQuestions.map(text=>{
      const button=document.createElement('button');button.type='button';
      const icon=document.createElement('span');icon.className='nx-ai-suggestion-icon';icon.setAttribute('aria-hidden','true');
      icon.textContent=['✨','⏳','📅','📋','🤝','📑','📂','⚖️','🎯','💬','🗓️','🎓','📷','✍️'][suggestedQuestions.indexOf(text)];
      const label=document.createElement('span');label.textContent=text;button.append(icon,label);
      button.classList.toggle('has-open-ending',!/[。！？!?，,；;：:、…）)》」』”’]$/.test(text));
      button.addEventListener('pointerdown',event=>{if(document.activeElement===input&&event.button===0)event.preventDefault();});
      button.addEventListener('click',()=>sendMessage(text));
      return button;
    }));
    suggestions.append(refresh);
  }
  function revealSuggestions(animateWelcome=true) {
    suggestionsPending=false;
    const welcome=dialog.querySelector('.nx-ai-welcome');
    welcome.classList.remove('is-awaiting-entry');
    suggestions.classList.remove('is-awaiting-entry');
    if(reduced.matches)return;
    const animate=(element,keyframes,options)=>{
      welcomeAnimations.push(element.animate(keyframes,{fill:'backwards',...options}));
    };
    for(const element of animateWelcome?[welcome.querySelector('.nx-ai-symbol'),welcome.querySelector('h1')]:[]){
      animate(element,[{opacity:0},{opacity:1}],{duration:300,easing:'ease-out'});
    }
    [...suggestions.children].forEach((button,index)=>animate(button,
      [{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:360,delay:(animateWelcome?400:0)+index*70,easing:'cubic-bezier(.22,1,.36,1)'}
    ));
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(pointer: coarse)');
  const endpoint = document.querySelector('meta[name="nanxing-ai-endpoint"]')?.content || '';
  const themeColor = document.querySelector('meta[name="theme-color"]');
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
  let glowStarted = 0;
  let motion = null, geometry, previousOverflow = '', previousGutter = '', previousTitle = '', previousThemeColor = '';
  let bodyLock = null, rootLock = null;
  let previousFocus = null, historyOwned = false, returnURL = '', gl, program, uniforms;
  let started = performance.now();
  let keyboardFrame = 0;
  const initialPixelRatio=devicePixelRatio || 1;
  let uiZoom=1;
  const viewportZoom=()=>1/Math.max(.25,(window.visualViewport?.scale || 1)*(devicePixelRatio || 1)/initialPixelRatio);
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
        uniform float radius, progress, time, intensity, glow;
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
          float bloom=gaussian(dist,52.)*.16 + gaussian(dist+22.,90.)*.06;
          float ribbon=gaussian(dist,18.)*.16;
          float wave=(bloom+ribbon)*smoothstep(.012,.09,progress)*(1.-smoothstep(.88,1.,progress));
          // Follow the viewport edges rather than drawing a rounded card.
          float edge=min(min(p.x,viewport.x-p.x),min(p.y,viewport.y-p.y));
          float edgePhase=atan(p.y-viewport.y*.5,p.x-viewport.x*.5)/(2.*PI)+time*.04;
          vec3 edgeColor=spectrum(edgePhase);
          float breathing=.88+.12*sin(time*.8);
          float perimeter=(gaussian(edge,8.)*.18+gaussian(edge,24.)*.12+gaussian(edge,48.)*.025)*breathing;
          perimeter*=smoothstep(.62,.82,progress)*glow;
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
      uniforms = Object.fromEntries(['resolution','viewport','origin','radius','progress','time','intensity','glow'].map(key => [key, gl.getUniformLocation(program,key)]));
      dialog.classList.remove('nx-ai-no-webgl');
    } catch {
      gl = null; dialog.classList.add('nx-ai-no-webgl');
    }
  }
  function measure() {
    layoutVisibleViewport();
    const rect = toggle.getBoundingClientRect(), bounds=dialog.getBoundingClientRect();
    const x = (rect.x-bounds.x + rect.width / 2)/uiZoom, y = (rect.y-bounds.y + rect.height / 2)/uiZoom;
    const width = dialog.clientWidth || innerWidth, height = dialog.clientHeight || innerHeight;
    geometry = {x, y, width, height, radius: Math.hypot(Math.max(x,width-x)/width, Math.max(y,height-y)/height) + .08};
    // Cap fill rate on high-DPI phones and large displays without softening the UI.
    const scale = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1400000 / (width * height)));
    const pixelWidth=Math.round(width*scale),pixelHeight=Math.round(height*scale);
    if(canvas.width!==pixelWidth || canvas.height!==pixelHeight){
      canvas.width=pixelWidth;canvas.height=pixelHeight;
      if(gl)gl.viewport(0,0,pixelWidth,pixelHeight);
    }
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
    // One coordinate system for the entire top-layer dialog. An absolute
    // dialog uses document coordinates, so visualViewport.pageTop/pageLeft
    // locate it without feeding a moving fixed element's rect back into itself.
    uiZoom=viewportZoom();
    dialog.style.zoom=String(uiZoom);
    const height=Math.round((viewport?.height || innerHeight)/uiZoom);
    const top=Math.max(0,Math.round((viewport?.pageTop ?? window.scrollY)/uiZoom));
    const width=(viewport?.width || innerWidth)/uiZoom;
    const orientationChanged=Math.abs(innerWidth-viewportBaseline.width)>80;
    if(orientationChanged)viewportBaseline={width:innerWidth,height:Math.max(innerHeight,dialog.clientHeight)};
    else if(height>viewportBaseline.height)viewportBaseline.height=height;
    const keyboard=touch.matches && editingStarted && (viewportBaseline.height-height>120 || (navigator.virtualKeyboard?.boundingRect?.height || 0)>0);
    const previousKeyboard=dialog.classList.contains('nx-ai-keyboard');
    const changed=Math.abs(layoutHeight-height)>1 || Math.abs(layoutTop-top)>1 || keyboard!==previousKeyboard;
    dialog.classList.toggle('nx-ai-keyboard',keyboard);
    Object.assign(dialog.style,{top:`${top}px`,left:`${(viewport?.pageLeft ?? window.scrollX)/uiZoom}px`,width:`${width}px`,height:`${height}px`});
    main.style.top='0px';
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
    keyboardFrame=requestAnimationFrame(measure);
  }
  const clamp = value => Math.max(0,Math.min(1,value));
  const smooth = (a,b,value) => { const p=clamp((value-a)/(b-a)); return p*p*(3-2*p); };
  function render(now) {
    if (!geometry) return;
    const {x,y,width,height,radius} = geometry;
    const travel=buttonTravel(progress);
    const glow=glowStarted ? 1-smooth(500,1000,now-glowStarted) : 1;
    const r = 18 / width + radius * travel;
    const rx = r * width, ry = r * height;
    surface.style.clipPath = progress >= 1 ? 'none' : `ellipse(${rx}px ${ry}px at ${x}px ${y}px)`;
    const content = smooth(.26,.86,travel);
    main.style.opacity = String(content);
    main.style.transform = `translateY(${(1-content)*16}px)`;
    main.inert = travel < .86 || !target;
    if(target && travel>=.86 && suggestionsPending)revealSuggestions();
    // Keep a CSS light alongside the GPU highlight, so a cleared drawing
    // buffer cannot leave the reveal entirely white.
    const perimeter=travel>=.88;
    fallback.classList.toggle('nx-ai-perimeter',perimeter);
    const lightOpacity=target ? (gl && !gl.isContextLost() ? .16 : .3) : 0;
    if(perimeter)Object.assign(fallback.style,{width:'100%',height:'100%',left:'0',top:'0',opacity:String(lightOpacity*glow)});
    else Object.assign(fallback.style,{width:`${rx*2+60}px`,height:`${ry*2+60}px`,left:`${x-rx-30}px`,top:`${y-ry-30}px`,opacity:String(lightOpacity*smooth(.012,.09,travel))});
    if (gl) {
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.viewport, width, height);
      gl.uniform2f(uniforms.origin,x,y);
      gl.uniform1f(uniforms.radius,r);
      gl.uniform1f(uniforms.progress,travel);
      gl.uniform1f(uniforms.time,reduced.matches ? 0 : (now-started)/1000);
      gl.uniform1f(uniforms.intensity,target ? (reduced.matches ? .3 : .8) : 0);
      gl.uniform1f(uniforms.glow,glow);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
  }
  function finishClose() {
    anchor.after(toggle); entrySpace.remove();
    document.documentElement.classList.remove('nx-ai-active','nx-ai-open');
    if(themeColor)themeColor.content=previousThemeColor;
    document.body.style.overflow = previousOverflow;
    if(rootLock){Object.assign(document.documentElement.style,rootLock);rootLock=null;}
    if(bodyLock){
      for(const [key,value] of Object.entries(bodyLock.styles))document.body.style[key]=value;
      if(window.scrollY!==bodyLock.scrollY || window.scrollX!==bodyLock.scrollX)
        window.scrollTo({top:bodyLock.scrollY,left:bodyLock.scrollX,behavior:'instant'});
      bodyLock=null;
    }
    dialog.classList.remove('nx-ai-settled','nx-ai-keyboard','nx-ai-glow-finished');glowStarted=0;
    editingStarted=false;layoutHeight=0;layoutTop=0;
    cancelAnimationFrame(keyboardFrame);cancelAnimationFrame(sizeFrame);
    clearTimeout(touchEndTimer);touchScroll=false;touchPoint=null;
    dialog.style.removeProperty('--nx-visual-top');
    document.documentElement.style.scrollbarGutter = previousGutter;
    dialog.close();
    document.title = previousTitle;
    resetConversation(); input.value = ''; resizeInput();
    dialog.classList.remove('has-conversation');
    (previousFocus?.isConnected ? previousFocus : toggle).focus({preventScroll:true});
  }
  // Integrate a smooth speed ramp: original pace at the start, continuously
  // accelerating through the approach, reaching about 2.5x near the button.
  // Both speed and acceleration are continuous; openings are unchanged.
  function motionTime(now) {
    const elapsed=Math.max(0,(now-motion.start)/motion.duration);
    if(motion.to!==0)return {t:clamp(elapsed),rate:1};
    const ramp=clamp((elapsed-.35)/.4);
    const integral=.4*(ramp*ramp*ramp-.5*ramp*ramp*ramp*ramp)+Math.max(0,elapsed-.75);
    const warped=elapsed+1.5*integral;
    return {t:clamp(warped),rate:warped>=1?0:1+1.5*ramp*ramp*(3-2*ramp)};
  }
  function frame(now) {
    raf = 0;
    if (!dialog.open || document.hidden) return;
    if (motion) {
      // Cubic Hermite interpolation carries velocity through a reversal, so a
      // second click turns the existing wave around instead of starting over.
      const {t}=motionTime(now), t2=t*t, t3=t2*t;
      progress=clamp((2*t3-3*t2+1)*motion.from+(t3-2*t2+t)*motion.velocity*motion.duration+(-2*t3+3*t2)*motion.to+(t3-t2)*motion.endVelocity*motion.duration);
      if (t === 1) {
        progress=motion.to; motion=null;
        if(target){dialog.classList.add('nx-ai-settled');document.documentElement.classList.add('nx-ai-active');glowStarted=now;}
        if (!target) { render(now); finishClose(); return; }
      }
    }
    render(now); lastDraw=now;
    if(glowStarted && now-glowStarted>=1000)dialog.classList.add('nx-ai-glow-finished');
    if (motion || (target && glowStarted && now-glowStarted<1000)) raf=requestAnimationFrame(frame);
  }
  function startFrame() { if (!raf) raf=requestAnimationFrame(frame); }
  function velocityAt(now) {
    if (!motion) return 0;
    const {t,rate}=motionTime(now), t2=t*t;
    return ((6*t2-6*t)*motion.from+(3*t2-4*t+1)*motion.velocity*motion.duration+(-6*t2+6*t)*motion.to+(3*t2-2*t)*motion.endVelocity*motion.duration)*rate/motion.duration;
  }
  function setOpen(open) {
    const next = Number(open);
    if (target === next && (dialog.open || !next)) return;
    const now = performance.now();
    let velocity = velocityAt(now);
    if(motion){
      const {t}=motionTime(now),t2=t*t,t3=t2*t;
      progress=clamp((2*t3-3*t2+1)*motion.from+(t3-2*t2+t)*motion.velocity*motion.duration+(-2*t3+3*t2)*motion.to+(t3-t2)*motion.endVelocity*motion.duration);
    }
    target = next;glowStarted=0;dialog.classList.remove('nx-ai-glow-finished');
    dialog.classList.toggle('nx-ai-closing',!open);
    welcomeAnimations.forEach(animation=>{
      if(open && animation.playState==='paused')animation.play();
      else if(!open && animation.playState==='running')animation.pause();
    });
    if (open && !dialog.open) {
      refreshSuggestions();
      previousFocus=document.activeElement;
      const entryRect=toggle.getBoundingClientRect();
      Object.assign(entrySpace.style,{width:`${entryRect.width}px`,height:`${entryRect.height}px`});
      const viewport=window.visualViewport;
      uiZoom=viewportZoom();
      dialog.style.setProperty('--nx-ai-exit-top',`${Math.max(0,(entryRect.top-(viewport?.offsetTop || 0))/uiZoom)}px`);
      dialog.style.setProperty('--nx-ai-exit-right',`${Math.max(0,((viewport?.width || innerWidth)-entryRect.right+(viewport?.offsetLeft || 0))/uiZoom)}px`);
      const pageWidth=document.documentElement.clientWidth;
      viewportBaseline={width:innerWidth,height:Math.max(innerHeight,window.visualViewport?.height || 0)};
      editingStarted=false;followLatest=true;
      bodyLock={scrollY:window.scrollY,scrollX:window.scrollX,styles:Object.fromEntries(['position','top','left','width'].map(key=>[key,document.body.style[key]]))};
      previousOverflow=document.body.style.overflow;
      previousGutter=document.documentElement.style.scrollbarGutter;
      previousTitle=document.title;
      previousThemeColor=themeColor?.content || '';
      document.documentElement.classList.add('nx-ai-open');
      if(themeColor)themeColor.content=getComputedStyle(document.documentElement).getPropertyValue('--nx-ai-background').trim();
      document.documentElement.style.scrollbarGutter='auto';
      document.body.style.overflow='hidden';
      rootLock={overflow:document.documentElement.style.overflow,overscrollBehavior:document.documentElement.style.overscrollBehavior};
      Object.assign(document.documentElement.style,{overflow:'hidden',overscrollBehavior:'none'});
      // Lock the document independently of the keyboard viewport.
      Object.assign(document.body.style,{position:'fixed',top:`${-bodyLock.scrollY}px`,left:`${-bodyLock.scrollX}px`,width:`${pageWidth}px`});
      main.inert=true;
      anchor.after(entrySpace);
      dialog.append(toggle); dialog.showModal();
      toggle.focus({preventScroll:true});
      document.title='南星 AI';
      if (!program && !dialog.classList.contains('nx-ai-no-webgl')) initLight();
      measure();
      velocity=.0038;
    }
    // Establish the icon's closed pose in its new top-layer parent before
    // changing state; otherwise reparenting can skip the opening transition.
    getComputedStyle(toggle.querySelector('.nx-ai-close-icon')).transform;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'关闭南星 AI':'AI 助手');
    if (!open) {
      document.documentElement.classList.remove('nx-ai-active');
      dialog.classList.remove('nx-ai-settled');
      // Freeze the current conversation during the closing reveal. Clear its
      // DOM only in finishClose(), once the dialog is no longer visible.
      generation++; activeRequest?.abort(); activeRequest=null;
      input.blur();
    }
    if (reduced.matches) {
      progress=target; motion=null;dialog.classList.toggle('nx-ai-settled',Boolean(target));dialog.classList.toggle('nx-ai-glow-finished',Boolean(target));document.documentElement.classList.toggle('nx-ai-active',Boolean(target)); render(now);
      if (!target) finishClose();
      return;
    }
    const distance=Math.abs(target-progress);
    const duration=(open?480:420)*Math.max(.35,Math.sqrt(distance));
    const maxVelocity=3*Math.max(distance,.04)/duration;
    velocity=Math.max(-maxVelocity,Math.min(maxVelocity,velocity));
    // The closing wave disappears into the button before its velocity drops
    // to zero; the radius-linked light envelope hides the final handoff.
    const endVelocity=open?0:-distance/duration;
    motion={from:progress,to:target,start:performance.now(),duration,velocity,endVelocity};
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
  toggle.addEventListener('pointerleave',()=>toggle.classList.remove('is-hover-paused'));
  toggle.addEventListener('click',event=>{
    if(event.detail>0)toggle.classList.add('is-hover-paused');
    target?requestClose():requestOpen();
  });
  dialog.addEventListener('cancel',event=>{if(event.target!==dialog)return;event.preventDefault();requestClose();});
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const presets=[...suggestions.querySelectorAll('button')].filter(button=>button.getClientRects().length);
    const composerControls=[...form.querySelectorAll('textarea,button:not(:disabled),summary')].filter(e=>e.getClientRects().length);
    const mobile=matchMedia('(max-width:767px), (pointer:coarse)').matches;
    const controls=main.inert?[toggle]:[...(restart.getClientRects().length?[restart]:[]),toggle,...[...messages.querySelectorAll('a[href],button:not(:disabled),summary')].filter(e=>e.getClientRects().length),...(mobile?[...presets,...composerControls]:[...composerControls,...presets])];
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
    if(reduced.matches){welcomeAnimations.forEach(animation=>animation.cancel());welcomeAnimations=[];}
    if (!dialog.open) return;
    if(reduced.matches){progress=target;motion=null;glowStarted=0;dialog.classList.toggle('nx-ai-settled',Boolean(target));dialog.classList.toggle('nx-ai-glow-finished',Boolean(target));document.documentElement.classList.toggle('nx-ai-active',Boolean(target));render(performance.now());if(!target)finishClose();}
    else startFrame();
  });
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();gl=null;dialog.classList.add('nx-ai-no-webgl');});
  canvas.addEventListener('webglcontextrestored',()=>{initLight();if(dialog.open)measure();});

  function resizeInput() {
    send.disabled=!activeRequest&&((!input.value.trim()&&!pendingFiles.length)||pendingFiles.some(f=>!f.token));
    model.disabled=false;thinkButton.disabled=false;searchButton.disabled=model.value!=='deepseek-flash';attachButton.disabled=model.value!=='deepseek-flash';
    send.setAttribute('aria-label',activeRequest?'停止生成':'发送消息');
    send.innerHTML=activeRequest?stopMarkup:arrowMarkup;
    send.classList.toggle('is-generating',Boolean(activeRequest));
    fitInput();
    if(followLatest&&!touchScroll){cancelAnimationFrame(sizeFrame);sizeFrame=requestAnimationFrame(()=>{messages.scrollTop=messages.scrollHeight;});}
  }
  function resetConversation() {
    generation++;activeRequest?.abort();activeRequest=null;activeAttachmentRequest=false;conversation=[];clearFiles();
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
  form.addEventListener('click',event=>{
    if(event.target.closest('button,a,textarea,select,label,input'))return;
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
  function remember(history,text,answer,files=[],webContext) {
    conversation=[...history,{role:'user',content:text,...(files.length?{attachments:files.map(f=>f.token)}:{})},...(answer?[{role:'assistant',content:answer,...(webContext?{webContext}:{})}]:[])];
    // Only completed pairs are sent back, with bounded in-memory context.
    while(conversation.length>28 || conversation.reduce((n,m)=>n+m.content.length,0)>28000)conversation.splice(0,2);
  }
  function addCopy(row,text,regenerate) {
    const actions=document.createElement('div');actions.className='nx-ai-actions';
    const copy=document.createElement('button');copy.className='nx-ai-copy';copy.type='button';copy.setAttribute('aria-label','复制回答');
    copy.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg><svg class="nx-ai-copy-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
    let copyTimer=0,copyAnimation=null;
    copy.addEventListener('pointerleave',()=>copy.classList.remove('is-hover-paused'));
    copy.addEventListener('click',async()=>{
      try{
        await navigator.clipboard.writeText(text);
        clearTimeout(copyTimer);copyAnimation?.cancel();
        copy.setAttribute('aria-label','已复制');copy.classList.add('is-copied','is-hover-paused');
        if(!reduced.matches)copyAnimation=copy.animate([
          {transform:'scale(.72)'},{transform:'scale(1.2)',offset:.28},
          {transform:'scale(.93)',offset:.5},{transform:'scale(1.035)',offset:.7},
          {transform:'scale(.99)',offset:.87},{transform:'scale(1)'}
        ],{duration:580,easing:'ease-out'});
        copyTimer=setTimeout(()=>{copyAnimation?.cancel();copy.setAttribute('aria-label','复制回答');copy.classList.remove('is-copied');},1500);
      }
      catch{copy.setAttribute('aria-label','复制失败，请选择文字复制');}
    });actions.append(copy);
    const thumb='<path d="M7 10v10H3V10h4Zm0 0 5-7a2 2 0 0 1 2 2l-1 5h5a2 2 0 0 1 2 2l-1 6a2 2 0 0 1-2 2H7"/>';
    const votes=['点赞','点踩'].map((label,index)=>{
      const button=document.createElement('button');button.type='button';button.className='nx-ai-feedback'+(index?' nx-ai-dislike':'');button.setAttribute('aria-label',label);button.setAttribute('aria-pressed','false');button.innerHTML=icon(thumb);
      button.addEventListener('click',()=>{const selected=button.getAttribute('aria-pressed')!=='true';votes.forEach(item=>item.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed',String(selected));});actions.append(button);return button;
    });
    if(regenerate){const button=document.createElement('button');button.type='button';button.className='nx-ai-regenerate';button.setAttribute('aria-label','重新生成');button.innerHTML=icon('<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/>');button.addEventListener('click',()=>{if(!activeRequest)regenerate();});actions.append(button);}
    row.append(actions);
    updateRegenerateButtons();
  }
  function updateRegenerateButtons(){
    const last=messages.querySelector('.nx-ai-message-assistant:last-child');
    messages.querySelectorAll('.nx-ai-regenerate').forEach(button=>{button.hidden=button.closest('.nx-ai-message')!==last;button.disabled=Boolean(activeRequest);});
  }
  function animateDisclosure(details){
    const summary=details.querySelector('summary'),content=summary.nextElementSibling;
    let expanded=details.open,animation=null,fade=null;
    summary.setAttribute('aria-expanded',String(expanded));
    summary.addEventListener('click',event=>{
      event.preventDefault();
      const from=details.getBoundingClientRect().height;
      const opacity=details.open?getComputedStyle(content).opacity:'0';
      expanded=!expanded;animation?.cancel();fade?.cancel();
      details.classList.toggle('is-expanded',expanded);summary.setAttribute('aria-expanded',String(expanded));
      if(reduced.matches){details.open=expanded;details.style.removeProperty('overflow');return;}
      details.open=true;
      const to=expanded?details.getBoundingClientRect().height:summary.getBoundingClientRect().height;
      details.style.overflow='hidden';
      animation=details.animate([{height:`${from}px`},{height:`${to}px`}],{duration:260,easing:'cubic-bezier(.22,.72,.25,1)'});
      fade=content.animate([{opacity},{opacity:expanded?1:0}],{duration:expanded?220:160,easing:'ease-out',fill:'forwards'});
      animation.onfinish=()=>{details.open=expanded;details.style.removeProperty('overflow');animation=null;fade?.cancel();fade=null;};
    });
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
    const files=retry?.files||pendingFiles.map(f=>({name:f.name,token:f.token}));
    if(files.some(f=>!f.token)){say('请等待附件解析完成，或移除上传失败的文件。');return;}
    const options=retry?.options||{model:model.value,thinking:thinkButton.getAttribute('aria-pressed')==='true',search:searchButton.getAttribute('aria-pressed')==='true',readUrls:model.value==='deepseek-flash'};
    messages.querySelectorAll('.nx-ai-retry').forEach(button=>button.remove());
    followLatest=true;
    dialog.classList.add('has-conversation');
    if(!retry){const user=addMessage(text,'user');if(files.length){const names=document.createElement('div');names.className='nx-ai-sent-files';names.textContent=files.map(f=>'▤ '+f.name).join(' · ');user.row.prepend(names);}}
    if(!retry)clearFiles();
    const reply=retry?.reply || addMessage('','assistant');
    reply.row.querySelectorAll('.nx-ai-error,.nx-ai-actions,.nx-ai-copy,.nx-ai-reasoning,.nx-ai-sources,.nx-ai-tool-status').forEach(node=>node.remove());
    reply.body.replaceChildren();reply.row.classList.add('is-pending');
    reply.body.setAttribute('aria-label','正在回答');
    const controller=new AbortController(),id=++generation;activeRequest=controller;activeAttachmentRequest=files.length>0||history.some(m=>m.attachments?.length);
    if(!retry)input.value='';resizeInput();updateRegenerateButtons();messages.setAttribute('aria-busy','true');
    messages.scrollTop=messages.scrollHeight;
    let answer='',completed=false,paintTimer=0,finishReason='stop',webContext,reasoning='';
    const thinking=document.createElement('details');thinking.className='nx-ai-reasoning';thinking.hidden=true;
    const summary=document.createElement('summary');summary.textContent='正在思考';const thought=document.createElement('div');thinking.append(summary,thought);animateDisclosure(thinking);reply.row.prepend(thinking);
    const toolStatus=document.createElement('div');toolStatus.className='nx-ai-tool-status';toolStatus.setAttribute('role','status');reply.row.insertBefore(toolStatus,reply.body);
    const sources=document.createElement('details');sources.className='nx-ai-sources';sources.hidden=true;const sourceLabel=document.createElement('summary');const sourceList=document.createElement('div');sources.append(sourceLabel,sourceList);animateDisclosure(sources);reply.row.append(sources);const seenSources=new Set();
    const addSource=source=>{try{const url=new URL(source.url);if(!['https:','http:'].includes(url.protocol)||seenSources.has(url.href))return;seenSources.add(url.href);const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';const title=document.createElement('span');title.textContent=source.title||url.hostname;link.append(title);link.insertAdjacentHTML('beforeend',icon('<path d="M7 17 17 7M7 7h10v10"/>'));sourceList.append(link);sourceLabel.replaceChildren();const caption=document.createElement('span');caption.textContent='参考来源';const count=document.createElement('span');count.className='nx-ai-source-count';count.textContent=String(seenSources.size);sourceLabel.append(caption,count);}catch{}};

    const flush=()=>{clearTimeout(paintTimer);paintTimer=0;if(id===generation)paint(reply.body,answer);};
    try{
      if(!endpoint)throw new Error('AI 服务暂不可用，请稍后再试。');
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',body:JSON.stringify({...options,...(retry?.previousAnswer?{previousAnswer:retry.previousAnswer}:{}),messages:[...history,{role:'user',content:text,...(files.length?{attachments:files.map(f=>f.token)}:{})}]}),signal:controller.signal});
      if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error||'连接暂不可用，请重试。');}
      if(!response.body || !response.headers.get('content-type')?.includes('text/event-stream'))throw new Error('连接暂不可用，请重试。');
      await receiveEvents(response,event=>{
        if(id!==generation)return;
        if(event.type==='delta'){
          answer+=event.text;reply.row.classList.remove('is-pending');reply.body.removeAttribute('aria-label');
          if(!paintTimer)paintTimer=setTimeout(flush,70);
        }else if(event.type==='reasoning'){reasoning+=event.text;thinking.hidden=false;thought.textContent=reasoning;}
        else if(event.type==='tool'){const call=event.event.call;if(call){toolStatus.textContent=event.event.type==='call_started'?(call.type==='deepseek_read_url'?'正在读取网页…':'正在搜索网页…'):(call.status==='failed'?'部分网页未能读取':'已完成网页检索');for(const source of call.sources||[])addSource(source);if(call.page)addSource(call.page);}}
        else if(event.type==='sources'){for(const item of event.annotations||[])if(item.url_citation)addSource(item.url_citation);}
        else if(event.type==='web-context')webContext=event.token;
        else if(event.type==='done'){completed=true;finishReason=event.finishReason;}
        else if(event.type==='error')throw new Error(event.message);
      });
      if(!completed)throw new Error('连接中断，请重试。');
      if(id!==generation)return;
      if(retry?.previousAnswer&&answer.replace(/\s/g,'')===retry.previousAnswer.replace(/\s/g,''))throw new Error('这次回答与上一版相同，已保留原回答，可再次重新生成。');
      flush();remember(history,text,answer,files,webContext);sources.hidden=seenSources.size===0;addCopy(reply.row,answer,()=>sendMessage(text,{history,reply,files,options,previousAnswer:answer,previousWebContext:webContext}));
      if(finishReason==='length'){
        const note=document.createElement('div');note.className='nx-ai-error';note.textContent='回答较长，可继续追问。';reply.row.append(note);
      }
    }catch(error){
      if(id!==generation)return;
      flush();
      const stopped=controller.signal.aborted;
      if(stopped&&answer)remember(history,text,answer,files,webContext);
      const note=document.createElement('div');note.className='nx-ai-error';
      const label=document.createElement('span');label.textContent=stopped?'已停止':(error instanceof TypeError?'连接暂不可用，请重试。':error.message);
      note.append(label);
      const retryButton=document.createElement('button');retryButton.type='button';retryButton.className='nx-ai-retry';retryButton.textContent='重试';
      retryButton.addEventListener('click',()=>sendMessage(text,{history,reply,files,options,previousAnswer:retry?.previousAnswer}));note.append(retryButton);reply.row.append(note);
      if(retry?.previousAnswer){answer=retry.previousAnswer;paint(reply.body,answer);reply.row.querySelectorAll('.nx-ai-reasoning,.nx-ai-sources,.nx-ai-tool-status').forEach(e=>e.remove());remember(history,text,answer,files,retry.previousWebContext);}
      if(answer){sources.hidden=seenSources.size===0;addCopy(reply.row,answer,()=>sendMessage(text,{history,reply,files,options,previousAnswer:answer,previousWebContext:webContext}));}
    }finally{
      clearTimeout(paintTimer);
      if(id===generation){summary.textContent=completed?'思考过程':'思考已停止';toolStatus.textContent='';activeRequest=null;activeAttachmentRequest=false;reply.row.classList.remove('is-pending');reply.body.removeAttribute('aria-label');messages.setAttribute('aria-busy','false');resizeInput();updateRegenerateButtons();}
    }
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(activeRequest){activeRequest.abort();return;}
    const text=input.value.trim();if(text||pendingFiles.length)sendMessage(text||'请帮我分析这些附件。');
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
