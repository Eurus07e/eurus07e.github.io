// Build a displacement map for the rounded rim only. The middle stays neutral.
(() => {
  if (!window.ResizeObserver || !CSS.supports('backdrop-filter','url("#rim")')) return;
  const nav = document.querySelector('.member-nav');
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns,'svg');
  svg.setAttribute('aria-hidden','true');
  svg.style.cssText='position:absolute;width:0;height:0;pointer-events:none';
  document.body.append(svg);

  function updateMap(image,width,height,radius) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const map = ctx.createImageData(width,height);
    for (let y=0;y<height;y++) {
      for (let x=0;x<width;x++) {
        const dx = x+.5 - Math.min(width-radius,Math.max(radius,x+.5));
        const dy = y+.5 - Math.min(height-radius,Math.max(radius,y+.5));
        const distance = Math.hypot(dx,dy);
        const depth = radius-distance;
        const bend = depth>=0 && depth<6 ? Math.sin(Math.PI*depth/6) : 0;
        const offset = (y*width+x)*4;
        map.data[offset] = 128+122*bend*dx/(distance||1);
        map.data[offset+1] = 128+122*bend*dy/(distance||1);
        map.data[offset+3] = 255;
      }
    }
    ctx.putImageData(map,0,0);
    image.setAttribute('href',canvas.toDataURL());
  }

  for (const [index,host] of [...nav.querySelectorAll('.brand,.nav-menu-toggle,.nav-items,.ai-nav-entry,.nx-ai-toggle,#preferences-panel')].entries()) {
    const id='member-lens-'+index;
    const filter=document.createElementNS(ns,'filter');
    filter.id=id;
    filter.setAttribute('x','0%');filter.setAttribute('y','0%');
    filter.setAttribute('width','100%');filter.setAttribute('height','100%');
    filter.setAttribute('color-interpolation-filters','sRGB');
    const image=document.createElementNS(ns,'feImage');
    image.setAttribute('width','100%');image.setAttribute('height','100%');
    image.setAttribute('preserveAspectRatio','none');image.setAttribute('result','rim');
    const bend=document.createElementNS(ns,'feDisplacementMap');
    bend.setAttribute('in','SourceGraphic');bend.setAttribute('in2','rim');
    bend.setAttribute('xChannelSelector','R');bend.setAttribute('yChannelSelector','G');bend.setAttribute('scale','-9');
    filter.append(image,bend);svg.append(filter);
    new ResizeObserver(()=>{
      const width=host.offsetWidth,height=host.offsetHeight;
      // The expanded mobile navigation is a sheet, not a lens.
      if (!width || !height || (host.matches('.nav-items') && height>64)) return;
      const corner = parseFloat(getComputedStyle(host).borderTopLeftRadius);
      const radius = host.id==='preferences-panel' ? corner : height/2;
      updateMap(image,width,height,radius);
      host.style.setProperty('--edge-lens',`url("#${id}")`);
    }).observe(host);
  }
})();
