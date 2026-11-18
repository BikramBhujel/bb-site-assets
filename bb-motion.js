/* bb-motion.js v1.1.0 for bikrambhujel.com.np. Motion ported from React Bits (reactbits.dev, MIT + Commons Clause). */
(function(){
  // v1.47: SpotlightCard, ShinyText and CountUp, ported from React Bits to plain JS.
  var mm=function(q){return window.matchMedia&&matchMedia(q).matches;};
  var reduce=mm('(prefers-reduced-motion: reduce)'),fine=mm('(hover: hover) and (pointer: fine)');
  var io=('IntersectionObserver' in window);

  function spotlight(card){
    if(card.querySelector('.bb-spot'))return;
    var a=document.createElement('span');a.className='bb-spot';a.setAttribute('aria-hidden','true');
    var b=document.createElement('span');b.className='bb-spot-edge';b.setAttribute('aria-hidden','true');
    card.insertBefore(a,card.firstChild);card.appendChild(b);
    var raf=0,x=0,y=0;
    card.addEventListener('pointermove',function(e){
      var r=card.getBoundingClientRect();x=e.clientX-r.left;y=e.clientY-r.top;
      if(!raf)raf=requestAnimationFrame(function(){raf=0;card.style.setProperty('--mx',x+'px');card.style.setProperty('--my',y+'px');});
    });
    card.addEventListener('pointerenter',function(){card.classList.add('is-lit');});
    card.addEventListener('pointerleave',function(){card.classList.remove('is-lit');});
  }

  function countUp(el){
    var raw=(el.getAttribute('data-bb-count')||el.textContent).trim();
    var m=/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/.exec(raw);
    if(!m)return;
    var target=parseFloat(m[2].replace(/,/g,'')),dp=(m[2].split('.')[1]||'').length,comma=m[2].indexOf(',')>-1;
    if(!isFinite(target)||target===0)return;
    var fmt=function(v){return comma?v.toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp}):v.toFixed(dp);};
    var final=m[1]+fmt(target)+m[3],t0=null,dur=Math.min(1800,900+Math.log(Math.abs(target)+1)/Math.LN10*300);
    el.setAttribute('aria-label',final);
    function step(ts){
      if(t0===null)t0=ts;
      var p=Math.min((ts-t0)/dur,1),e=p===1?1:1-Math.pow(2,-10*p);
      el.textContent=p===1?final:m[1]+fmt(target*e)+m[3];
      if(p<1)requestAnimationFrame(step);else el.removeAttribute('aria-label');
    }
    el.textContent=m[1]+fmt(0)+m[3];
    requestAnimationFrame(step);
  }

  function whenSeen(el,fn){
    if(!io){fn(el);return;}
    var o=new IntersectionObserver(function(es){if(es[0].isIntersecting){o.disconnect();fn(el);}},{rootMargin:'0px 0px -10% 0px'});
    o.observe(el);
  }

  function scan(){
    if(fine)[].forEach.call(document.querySelectorAll('.bb-card'),spotlight); // a light under the pointer, not movement: kept for reduced motion too
    if(reduce)return;
    [].forEach.call(document.querySelectorAll('.bb-hire .bb-cta:not([data-bb-pass])'),function(a){
      a.setAttribute('data-bb-pass','1');whenSeen(a,function(){a.classList.add('bb-pass-on');});
    });
    [].forEach.call(document.querySelectorAll('[data-bb-count]:not([data-bb-seen]),.bb-course-hero-stat strong:not([data-bb-seen])'),function(el){
      el.setAttribute('data-bb-seen','1');whenSeen(el,countUp);
    });
  }

  function run(){
    scan();
    // Cards and course figures the theme draws later (homepage top-up, courses page).
    if('MutationObserver' in window){
      var pending=0,mo=new MutationObserver(function(){if(!pending)pending=setTimeout(function(){pending=0;scan();},120);});
      mo.observe(document.body,{childList:true,subtree:true});
      setTimeout(function(){mo.disconnect();},15000);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
(function(){
  // v1.48: DotGrid from React Bits, ported to a 2D canvas. Dots near the pointer light up and are
  // pushed away on a spring; a click or tap sends a ring outward; with no pointer (phones) a slow
  // wave crosses the grid so the hero still moves. Pauses off screen and in background tabs.
  var mm=function(q){return window.matchMedia&&matchMedia(q).matches;};
  var reduce=mm('(prefers-reduced-motion: reduce)');
  var hero=document.querySelector('.bb-hero');
  if(!hero)return;
  if(!reduce){
    hero.classList.add('bb-seq');
    var tools=document.querySelector('.bb-tools');
    if(tools){[].forEach.call(tools.children,function(li,i){li.style.setProperty('--i',i);});tools.classList.add('bb-seq');}
  }

  var cv=document.createElement('canvas');cv.className='bb-dots';cv.setAttribute('aria-hidden','true');
  hero.insertBefore(cv,hero.firstChild);
  var ctx=cv.getContext('2d');if(!ctx)return;
  var GAP=24,R=1.6,PROX=150,dpr=1,W=0,H=0,dots=[],px=-1e4,py=-1e4,rings=[],raf=0,visible=true,last=0,base='',on='';

  function colors(){var cs=getComputedStyle(hero);base=cs.getPropertyValue('--dot').trim()||'rgba(128,128,128,.2)';on=cs.getPropertyValue('--dot-on').trim()||'#ffc000';if(reduce)draw(0);}
  function build(){
    var r=hero.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);
    W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    dots=[];
    var cols=Math.floor(W/GAP),rows=Math.floor(H/GAP),ox=(W-(cols-1)*GAP)/2,oy=(H-(rows-1)*GAP)/2;
    for(var y=0;y<rows;y++)for(var x=0;x<cols;x++)dots.push({x:ox+x*GAP,y:oy+y*GAP,dx:0,dy:0,vx:0,vy:0});
    colors();
  }
  function draw(t){
    ctx.clearRect(0,0,W,H);
    var wave=reduce?-9:(t/1000*.18)%1.6-.3; // a soft band that drifts across the grid
    for(var i=0;i<dots.length;i++){
      var d=dots[i],x=d.x+d.dx,y=d.y+d.dy,ex=x-px,ey=y-py,dist=Math.sqrt(ex*ex+ey*ey),k=0;
      if(dist<PROX)k=1-dist/PROX;
      for(var j=0;j<rings.length;j++){var rg=rings[j],rx=d.x-rg.x,ry=d.y-rg.y,band=Math.abs(Math.sqrt(rx*rx+ry*ry)-rg.r);if(band<26)k=Math.max(k,(1-band/26)*rg.a);}
      if(wave>-9){var u=(d.x/W+d.y/H*.35)-wave,w=Math.max(0,1-Math.abs(u)/.12)*.45;if(w>k)k=w;}
      ctx.globalAlpha=1;ctx.fillStyle=base;ctx.beginPath();ctx.arc(x,y,R,0,6.283);ctx.fill();
      if(k>.02){ctx.globalAlpha=Math.min(1,k);ctx.fillStyle=on;ctx.beginPath();ctx.arc(x,y,R+k*1.6,0,6.283);ctx.fill();}
    }
    ctx.globalAlpha=1;
  }
  function step(t){
    raf=0;if(!visible)return;
    var dt=Math.min(.05,(t-(last||t))/1000);last=t;
    for(var i=0;i<dots.length;i++){
      var d=dots[i],ex=d.x-px,ey=d.y-py,dist=Math.sqrt(ex*ex+ey*ey),fx=0,fy=0;
      if(dist<PROX&&dist>.01){var f=(1-dist/PROX)*900;fx=ex/dist*f;fy=ey/dist*f;}
      for(var j=0;j<rings.length;j++){var rg=rings[j],rx=d.x-rg.x,ry=d.y-rg.y,rd=Math.sqrt(rx*rx+ry*ry)||1,band=Math.abs(rd-rg.r);if(band<30){var g=(1-band/30)*2600*rg.a;fx+=rx/rd*g;fy+=ry/rd*g;}}
      d.vx+=(fx-d.dx*90-d.vx*12)*dt;d.vy+=(fy-d.dy*90-d.vy*12)*dt;d.dx+=d.vx*dt;d.dy+=d.vy*dt;
    }
    for(var k=rings.length-1;k>=0;k--){rings[k].r+=520*dt;rings[k].a-=.7*dt;if(rings[k].a<=0)rings.splice(k,1);}
    draw(t);raf=requestAnimationFrame(step);
  }
  function go(){if(!raf&&!reduce&&visible)raf=requestAnimationFrame(step);}
  function local(e){var r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}

  build();
  window.addEventListener('resize',build,{passive:true});
  new MutationObserver(colors).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(reduce){
    // Reduced motion: the grid stays still, but dots near the pointer still light up.
    hero.addEventListener('pointermove',function(e){var p=local(e);px=p[0];py=p[1];draw(0);},{passive:true});
    hero.addEventListener('pointerleave',function(){px=py=-1e4;draw(0);},{passive:true});
    return;
  }
  hero.addEventListener('pointermove',function(e){var p=local(e);px=p[0];py=p[1];go();},{passive:true});
  hero.addEventListener('pointerleave',function(){px=py=-1e4;},{passive:true});
  hero.addEventListener('pointerdown',function(e){var p=local(e);rings.push({x:p[0],y:p[1],r:0,a:1});go();},{passive:true});
  if('IntersectionObserver' in window)new IntersectionObserver(function(es){visible=es[0].isIntersecting;last=0;if(visible)go();}).observe(hero);
  document.addEventListener('visibilitychange',function(){visible=!document.hidden;last=0;go();});
  // One ring out of the name as the page opens, so the grid announces itself.
  setTimeout(function(){var h=hero.querySelector('h1');if(h){var a=h.getBoundingClientRect(),c=cv.getBoundingClientRect();rings.push({x:a.right-c.left,y:a.top+a.height/2-c.top,r:0,a:.9});}go();},900);
  go();
})();
(function(){
  // v1.48: spotlight on the free-tool tiles (same light as the post cards), mouse users only.
  if(!(window.matchMedia&&matchMedia('(hover: hover) and (pointer: fine)').matches))return;
  [].forEach.call(document.querySelectorAll('.bb-tools a'),function(t){
    if(t.querySelector('.bb-spot'))return;
    var a=document.createElement('span');a.className='bb-spot';a.setAttribute('aria-hidden','true');
    var b=document.createElement('span');b.className='bb-spot-edge';b.setAttribute('aria-hidden','true');
    t.insertBefore(a,t.firstChild);t.appendChild(b);
    var raf=0,x=0,y=0;
    t.addEventListener('pointermove',function(e){var r=t.getBoundingClientRect();x=e.clientX-r.left;y=e.clientY-r.top;
      if(!raf)raf=requestAnimationFrame(function(){raf=0;t.style.setProperty('--mx',x+'px');t.style.setProperty('--my',y+'px');});});
    t.addEventListener('pointerenter',function(){t.classList.add('is-lit');});
    t.addEventListener('pointerleave',function(){t.classList.remove('is-lit');});
  });
})();
(function(){
  // bb-motion 1.1.0: motion for posts and pages, an animated image pop-up, the rail pop-up's
  // contents and the mobile menu. Pages with their own motion (Hire Me, Projects) are left alone.
  var d=document,mm=function(q){return window.matchMedia&&matchMedia(q).matches;};
  var reduce=mm('(prefers-reduced-motion: reduce)'),fine=mm('(hover: hover) and (pointer: fine)');
  var EASE='cubic-bezier(.16,1,.3,1)';

  function light(el){
    if(el.querySelector(':scope > .bb-spot'))return;
    el.classList.add('bb-spotable');
    var a=d.createElement('span');a.className='bb-spot';a.setAttribute('aria-hidden','true');
    var b=d.createElement('span');b.className='bb-spot-edge';b.setAttribute('aria-hidden','true');
    el.insertBefore(a,el.firstChild);el.appendChild(b);
    var raf=0,x=0,y=0;
    el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect();x=e.clientX-r.left;y=e.clientY-r.top;
      if(!raf)raf=requestAnimationFrame(function(){raf=0;el.style.setProperty('--mx',x+'px');el.style.setProperty('--my',y+'px');});});
    el.addEventListener('pointerenter',function(){el.classList.add('is-lit');});
    el.addEventListener('pointerleave',function(){el.classList.remove('is-lit');});
  }

  // ---------- 1. Content reveal inside posts and pages ----------
  function reveal(){
    var body=d.querySelector('.post-body');
    if(!body||!('IntersectionObserver' in window))return;
    var SKIP='.bb-reveal,.hp-pro,.px-pro,.bb-member-card,.bb-premium-pay-card,.bbn,.bb-hire,[class*="hp-anim"],form';
    var SEL='h2,h3,pre,table,blockquote,figure,.separator,ul,ol,.bb-toolinfo,img';
    var fold=window.innerHeight*0.92,io=new IntersectionObserver(function(es){
      var n=0;
      es.forEach(function(en){if(!en.isIntersecting)return;var t=en.target;io.unobserve(t);
        if(!t.classList.contains('bb-rv-grid'))t.style.transitionDelay=(n++*70)+'ms';
        t.classList.add('is-in');
        setTimeout(function(){t.style.transitionDelay='';},1200);});
    },{rootMargin:'0px 0px -8% 0px'});
    [].forEach.call(body.querySelectorAll(SEL),function(n){
      if(n.closest(SKIP))return;
      for(var p=n.parentElement;p&&p!==body;p=p.parentElement){if(p.matches(SEL))return;}
      if(n.getBoundingClientRect().top<fold)return; // already on screen: never hide what was seen
      var cs=getComputedStyle(n);
      if((n.tagName==='UL'||n.tagName==='OL')&&/grid|flex/.test(cs.display)&&n.children.length>1){
        [].forEach.call(n.children,function(li,i){li.style.setProperty('--i',Math.min(i,12));});
        n.classList.add('bb-rv-grid');
      }else{
        n.classList.add('bb-rv');
        if(n.tagName==='IMG'||n.tagName==='FIGURE'||n.classList.contains('separator'))n.classList.add('bb-rv-img');
      }
      io.observe(n);
    });
    // Card grids inside pages: pointer light on each link card.
    if(fine)[].forEach.call(body.querySelectorAll('ul > li > a'),function(a){
      var ul=a.parentElement.parentElement;
      if(a.closest(SKIP)||!/grid|flex/.test(getComputedStyle(ul).display))return;
      if(/^(block|flex|grid)$/.test(getComputedStyle(a).display))light(a);
    });
    // Safety net: show anything still hidden after a while that is on screen.
    setTimeout(function(){[].forEach.call(d.querySelectorAll('.bb-rv:not(.is-in),.bb-rv-grid:not(.is-in)'),function(n){
      if(n.getBoundingClientRect().top<window.innerHeight)n.classList.add('is-in');});},4000);
  }

  // ---------- 2. Image pop-up ----------
  var IMGHREF=/\.(png|jpe?g|webp|gif|avif)(\?|$)|googleusercontent\.com|bp\.blogspot\.com/i;
  function big(src){return src.replace(/\/s\d+(-[a-z0-9-]+)?\//,'/s1600/').replace(/\/w\d+-h\d+(-[a-z0-9-]+)?\//,'/s1600/').replace(/=s\d+(-[a-z0-9-]+)?$/,'=s1600').replace(/=w\d+-h\d+(-[a-z0-9-]+)?$/,'=s1600');}
  function zoomable(img){
    if(img.closest('.hp-pro,.px-pro,.bb-member-card,.bb-premium-pay-card,.bb-card,.bbn'))return false;
    var a=img.closest('a');
    if(a&&!IMGHREF.test(a.getAttribute('href')||''))return false; // a real link stays a link
    return img.getBoundingClientRect().width>=160;
  }
  function openLb(img){
    var a=img.closest('a'),src=a&&IMGHREF.test(a.href)?a.href:big(img.currentSrc||img.src);
    var from=img.getBoundingClientRect(),opener=d.activeElement;
    var lb=d.createElement('div');lb.className='bb-lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label',img.alt||'Image');
    lb.innerHTML='<div class="bb-lb-scrim"></div><button class="bb-lb-x" type="button" aria-label="Close image">×</button>';
    var im=d.createElement('img');im.className='bb-lb-img';im.alt=img.alt||'';im.src=img.currentSrc||img.src;
    lb.appendChild(im);
    if(img.alt){var cap=d.createElement('p');cap.className='bb-lb-cap';cap.textContent=img.alt;lb.appendChild(cap);}
    d.body.appendChild(lb);d.documentElement.classList.add('bb-lb-lock');
    if(src!==im.src){var hi=new Image();hi.onload=function(){im.src=src;};hi.src=src;}
    var to=im.getBoundingClientRect();
    function flip(r1,r2){return 'translate('+(r1.left-r2.left)+'px,'+(r1.top-r2.top)+'px) scale('+(r1.width/r2.width)+','+(r1.height/r2.height)+')';}
    requestAnimationFrame(function(){lb.classList.add('is-open');});
    if(!reduce&&im.animate)im.animate([{transform:flip(from,to),borderRadius:'10px'},{transform:'none',borderRadius:'12px'}],{duration:480,easing:EASE});
    else if(im.animate)im.animate([{opacity:0},{opacity:1}],{duration:250});
    var x=lb.querySelector('.bb-lb-x');x.focus();
    var closing=false;
    function close(){
      if(closing)return;closing=true;
      lb.classList.remove('is-open');
      var back=img.getBoundingClientRect(),now=im.getBoundingClientRect();
      var anim=(!reduce&&im.animate&&back.bottom>0&&back.top<window.innerHeight)
        ?im.animate([{transform:'none'},{transform:flip(back,now)}],{duration:360,easing:EASE,fill:'forwards'})
        :(im.animate?im.animate([{opacity:1},{opacity:0}],{duration:200,fill:'forwards'}):null);
      var done=function(){lb.remove();d.documentElement.classList.remove('bb-lb-lock');d.removeEventListener('keydown',key);if(opener&&opener.focus)opener.focus();};
      if(anim)anim.onfinish=done;else done();
    }
    function key(e){if(e.key==='Escape')close();else if(e.key==='Tab'){e.preventDefault();x.focus();}}
    lb.addEventListener('click',close);d.addEventListener('keydown',key);
  }
  function lightbox(){
    var body=d.querySelector('.post-body');if(!body)return;
    [].forEach.call(body.querySelectorAll('img'),function(img){
      var mark=function(){if(zoomable(img)){img.classList.add('bb-zoomable');if(!img.closest('a')){img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Open image'+(img.alt?': '+img.alt:''));}}};
      if(img.complete)mark();else img.addEventListener('load',mark,{once:true});
    });
    // Window capture phase: runs before Blogger's own image lightbox, which would otherwise open
    // underneath this one and stay behind after it closes.
    window.addEventListener('click',function(e){
      var img=e.target.closest&&e.target.closest('img.bb-zoomable');
      if(!img||!body.contains(img)||e.metaKey||e.ctrlKey||e.shiftKey)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openLb(img);
    },true);
    body.addEventListener('keydown',function(e){
      if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('img.bb-zoomable')){e.preventDefault();openLb(e.target);}
    });
  }

  // ---------- 3. Rail pop-up: its contents cascade in when it opens ----------
  function railPop(){
    if(reduce||!Element.prototype.animate)return;
    function watch(pop){
      var was=false;
      new MutationObserver(function(){
        var open=pop.classList.contains('is-open');
        if(open&&!was){[].forEach.call(pop.children,function(c,i){
          c.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:420,delay:70+Math.min(i,8)*40,easing:EASE,fill:'backwards'});});}
        was=open;
      }).observe(pop,{attributes:true,attributeFilter:['class']});
    }
    var pop=d.getElementById('bb-pop');
    if(pop){watch(pop);return;}
    var mo=new MutationObserver(function(){var p=d.getElementById('bb-pop');if(p){mo.disconnect();watch(p);}});
    mo.observe(d.body,{childList:true,subtree:true});setTimeout(function(){mo.disconnect();},20000);
  }

  // ---------- 4. Mobile menu: number the links so they cascade ----------
  function nav(){
    var m=d.getElementById('bb-menu');if(!m)return;
    [].forEach.call(m.children,function(li,i){li.style.setProperty('--i',Math.min(i,10));});
  }

  function run(){
    try{reveal();}catch(e){}
    try{lightbox();}catch(e){}
    try{railPop();}catch(e){}
    try{nav();}catch(e){}
  }
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',run);else run();
})();
