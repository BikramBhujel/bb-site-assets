/* bb-motion.js v1.0.0 for bikrambhujel.com.np. Motion ported from React Bits (reactbits.dev, MIT + Commons Clause). */
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
    if(fine&&!reduce)[].forEach.call(document.querySelectorAll('.bb-card'),spotlight);
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
  if(reduce)return;
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
  if(!(window.matchMedia&&matchMedia('(hover: hover) and (pointer: fine)').matches)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
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
