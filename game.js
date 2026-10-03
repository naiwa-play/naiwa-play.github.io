import {GROUND,GRAVITY,JUMP,speedAt,speedForWidth,scoreAt,intersects,playerBox,obstacleBox} from './physics.js?v=2';
const $=id=>document.getElementById(id), canvas=$('game'),ctx=canvas.getContext('2d');
const images={};let assetsReady=false,assetsFailed=false;
const assetPromise=Promise.all(Object.entries({frog:'naiwa.webp',tiles:'tiles.png',bg:'backgrounds.png',birds:'characters.png'}).map(([k,file])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[k]=im;resolve();};im.onerror=reject;im.src='./assets/'+file;}))).then(()=>{assetsReady=true;}).catch(()=>{assetsFailed=true;$('save-status').textContent='角色素材加载失败，请刷新页面重试';$('start').disabled=true;});
let W=960, mode='ready', time=0, y=GROUND,vy=0,duck=false,obstacles=[],nextSpawn=2.1,travel=0,last=0,acc=0,deadAt=0,toastTimer;
let crouchBlend=0, poseTime=0;
let stars=[],collected=0,bonus=0,shield=false,invincible=0,cleared=0,combo=0,flash=0;
const themes=[{name:'晨光草原',sky:'#e4efc8',sun:'#f8e998'},{name:'橘子落日',sky:'#f3d5b7',sun:'#f49e68'},{name:'星光夜跑',sky:'#384963',sun:'#e6e9bd'}];
function syncRun(){ $('score').textContent=fmt(scoreAt(time,bonus));$('stars').textContent='★ '+collected;$('shield').textContent=shield?'护盾已就绪':'再收集 '+(5-collected%5)+' 星得护盾';$('streak').textContent='连续躲过 '+combo;const theme=themes[Math.floor(time/30)%themes.length];$('biome').textContent=theme.name;}
function collectStar(){collected++;bonus+=25;if(collected%5===0){shield=true;toast('星星集满！获得一次护盾');}syncRun();}

let sound=false;try{sound=localStorage.getItem('frog-sound')==='yes';}catch{}
const sounds={jump:new Audio('./assets/jump.ogg'),hit:new Audio('./assets/hit.ogg')};
function syncSound(){$('sound').textContent='音效 '+(sound?'开':'关');$('sound').setAttribute('aria-pressed',String(sound));}
syncSound();
function playSound(name){if(!sound)return;const a=sounds[name];a.volume=.28;a.currentTime=0;a.play().catch(()=>{});}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
const storageKey='naiwa-records-v1';
let records={best:0,history:[]},storageOK=true;
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved&&Number.isFinite(saved.best)&&saved.best>=0&&Array.isArray(saved.history)){records.best=Math.floor(saved.best);records.history=saved.history.filter(r=>Number.isFinite(r.score)&&r.score>=0&&Number.isFinite(r.duration)&&r.duration>=0&&Number.isFinite(r.started)).slice(0,30);}}catch{storageOK=false;}
function fmt(n){return String(n).padStart(5,'0');}
function renderRecords(){ $('best').textContent=fmt(records.best);const list=$('record-list');list.replaceChildren();if(!records.history.length){const p=document.createElement('p');p.className='empty';p.textContent='还没有成绩。你的下一步，就是第一步。';list.append(p);return;}records.history.forEach((r,i)=>{const row=document.createElement('div');row.className='row';const rank=document.createElement('span');rank.className='rank';rank.textContent=String(i+1).padStart(2,'0');const name=document.createElement('span');name.textContent=new Date(r.started).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});const duration=document.createElement('small');duration.textContent=(r.duration/1000).toFixed(1)+' 秒';name.append(duration);const score=document.createElement('strong');score.textContent=fmt(r.score);row.append(rank,name,score);list.append(row);});}
renderRecords();
$('connection').textContent=storageOK?'成绩保存在当前浏览器':'浏览器存储不可用 · 成绩暂存本页';
function resize(){const r=canvas.parentElement.getBoundingClientRect();W=Math.max(1,Math.round(r.width/r.height*360));canvas.width=W;canvas.height=360;ctx.imageSmoothingEnabled=false;if(mode==='running')pause();}
new ResizeObserver(resize).observe(canvas.parentElement);
function tile(im,c,r,x,y,w,h,unit=18){ctx.drawImage(im,c*unit,r*unit,unit,unit,Math.round(x),Math.round(y),w,h);}
function draw(now){const poseDt=Math.min(.05,(now-poseTime)/1000||0);poseTime=now;
 const crouching=mode==='running'&&duck&&y===GROUND;
 const target=crouching?1:0;
 crouchBlend+=Math.sign(target-crouchBlend)*Math.min(Math.abs(target-crouchBlend),poseDt/(crouching?.085:.12));
 if(y<GROUND||mode==='dead'||mode==='ready')crouchBlend=0;
 const theme=themes[Math.floor(time/30)%themes.length];ctx.imageSmoothingEnabled=false;ctx.fillStyle=theme.sky;ctx.fillRect(0,0,W,360);if(!assetsReady)return;
 // Actual licensed tiles are repeated at integer scale, with slow parallax.
 const par=travel*.12;ctx.globalAlpha=.62;for(let i=-1;i<W/192+2;i++){const x=i*192-par%192;tile(images.bg,1,1,x,116,192,164,24);}ctx.globalAlpha=1;
 ctx.fillStyle=theme.sun;ctx.fillRect(W-124,44,36,36);ctx.fillStyle='#edf4d8';ctx.fillRect(W-128,40,8,8);ctx.fillRect(W-92,76,8,8);
 for(let i=-1;i<W/180+2;i++){const x=i*180-(travel*.22)%180;tile(images.tiles,13+(i%3+3)%3,7,x,65+(i%2)*31,72,36);}
 ctx.globalAlpha=.55;for(let i=-1;i<W/140+2;i++){const x=i*140-(travel*.5)%140;tile(images.tiles,4+(i%3+3)%3,6,x,GROUND-28,36,36);}ctx.globalAlpha=1;
 for(let x=-travel%36;x<W;x+=36){tile(images.tiles,1,0,x,GROUND,36,36);tile(images.tiles,1,1,x,GROUND+36,36,36);tile(images.tiles,1,1,x,GROUND+72,36,36);}
 ctx.fillStyle='#374d4220';ctx.fillRect(69,GROUND-3,70,4);
 for(const o of obstacles){if(o.type==='bird'){tile(images.birds,6+Math.floor(now/150)%3,2,o.x,GROUND-61,44,36,24);}else{tile(images.tiles,7,2,o.x,GROUND-o.h,o.w,o.h);}}
 for(const star of stars){const sy=star.y+Math.sin(time*5+star.x*.02)*3;ctx.fillStyle='#fff9db';ctx.fillRect(star.x-3,sy-12,6,24);ctx.fillRect(star.x-12,sy-3,24,6);ctx.fillStyle='#f7c838';ctx.fillRect(star.x-7,sy-7,14,14);ctx.fillStyle='#fffbe5';ctx.fillRect(star.x-3,sy-5,4,4);}
 if(shield||invincible>0){ctx.strokeStyle=invincible>0?'#fff7ce':'#50b8ca';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(108,y-38,46,50,0,0,Math.PI*2);ctx.stroke();}
 let row=0,frame=Math.floor(now/170)%6;let h=86,w=80,px=68,py=y-h+3;
 if(mode==='running'||mode==='paused'){row=1;frame=Math.floor(time*12)%8;if(y<GROUND){frame=3;}
  if(crouchBlend>0){
   // Use the folded-leg, tucked-head pose; never flatten running legs into the belly.
   row=5;frame=crouchBlend<.45?2:3;
   const ease=crouchBlend*crouchBlend*(3-2*crouchBlend);
   h=86-34*ease;w=80-9*ease;px=68+5*ease;
   py=GROUND-h+3+(crouching&&crouchBlend===1?Math.sin(time*16):0);
  }
 }
 if(mode==='dead'){row=5;frame=Math.min(7,Math.floor((now-deadAt)/110));}
 if(mode==='ready'){row=4;frame=Math.floor(now/170)%5;}
 ctx.globalAlpha=invincible>0&&Math.floor(time*14)%2?.45:1;ctx.drawImage(images.frog,frame*192,row*208,192,208,px,py,w,h);ctx.globalAlpha=1;
 if(flash>0){ctx.fillStyle='#fff2b955';ctx.fillRect(0,0,W,360);}if(mode==='running'&&y===GROUND){ctx.fillStyle='#dfc392';for(let i=0;i<3;i++){const d=(time*60+i*15)%42;ctx.fillRect(70-d,GROUND-2-i*3,3,3);}}
}
function setOverlay(title,description,button,overline){$('overlay').hidden=false;$('overlay-title').textContent=title;$('overlay-description').textContent=description;$('start').textContent=button;$('overline').textContent=overline;}
async function start(){if(mode==='loading'||mode==='running')return;if(mode==='paused'){mode='running';$('overlay').hidden=true;$('pause').textContent='Ⅱ';last=performance.now();document.activeElement?.blur();return;}mode='loading';$('start').disabled=true;$('start').textContent='奶蛙热身中…';if(!assetsReady){await assetPromise;if(assetsFailed)return;}time=0;travel=0;stars=[];collected=0;bonus=0;shield=false;invincible=0;cleared=0;combo=0;flash=0;held.clear();syncRun();y=GROUND;vy=0;duck=false;obstacles=[];nextSpawn=2.1;acc=0;mode='running';last=performance.now();document.activeElement?.blur();$('start').disabled=false;$('overlay').hidden=true;$('pause').textContent='Ⅱ';$('mood').textContent='大肚子也有大梦想';
}
function jump(){if(mode==='ready'||mode==='dead'){start();return;}if(mode==='paused')return;if(mode==='running'&&y>=GROUND-.1){duck=false;vy=JUMP;playSound('jump');}}
function pause(){duck=false;if(mode==='running'){mode='paused';setOverlay('奶蛙歇口气。','准备好了，就继续向前跑。','继续撒欢','PAUSED');$('save-status').textContent='暂停时间不计入成绩';$('pause').textContent='▶';}else if(mode==='paused'){start();}}
function die(now){mode='dead';duck=false;deadAt=now;playSound('hit');const score=scoreAt(time,bonus);const newBest=score>records.best;records.best=Math.max(records.best,score);records.history.unshift({score,duration:Math.floor(time*1000),started:Date.now()-Math.floor(time*1000)});records.history=records.history.slice(0,30);try{localStorage.setItem(storageKey,JSON.stringify(records));storageOK=true;}catch{storageOK=false;}renderRecords();setOverlay(newBest?'新纪录！奶蛙笑了。':'肚子先到了。',`本次得分 ${fmt(score)} · 坚持了 ${time.toFixed(1)} 秒 · ★ ${collected} · 躲过 ${cleared} 次`,'再跑亿次','GAME OVER');$('mood').textContent='摔倒没关系，笑着再来';$('save-status').textContent=storageOK?'成绩已保存到本机 · 再来一局':'无法写入浏览器存储 · 本局成绩仅暂存本页';$('connection').textContent=storageOK?'成绩保存在当前浏览器':'浏览器存储不可用 · 成绩暂存本页';}
function update(dt,now){time+=dt;const speed=speedForWidth(time,W);invincible=Math.max(0,invincible-dt);flash=Math.max(0,flash-dt);travel+=speed*dt;vy+=GRAVITY*dt;y=Math.min(GROUND,y+vy*dt);if(y===GROUND)vy=0;nextSpawn-=dt;
 if(nextSpawn<=0){const bird=time>9&&Math.random()<.35;obstacles.push({type:bird?'bird':'rock',x:W+30,w:bird?44:34+Math.floor(Math.random()*12),h:bird?28:30+Math.floor(Math.random()*14)});stars.push({x:W+50,y:GROUND-(bird?15:100)});nextSpawn=1.6+Math.random()*.6;}
 const box=playerBox(68,y,duck&&y===GROUND);
 for(const star of stars){star.x-=speed*dt;if(intersects(box,{x:star.x-12,y:star.y-12,w:24,h:24})){star.taken=true;collectStar();}}
 stars=stars.filter(star=>!star.taken&&star.x>-30);
 for(const o of obstacles){o.x-=speed*dt;if(intersects(box,obstacleBox(o))){if(invincible>0){o.broken=true;}else if(shield){shield=false;invincible=1;flash=.25;combo=0;o.broken=true;toast('护盾挡住了！继续跑');}else{die(now);break;}}if(!o.passed&&!o.broken&&o.x+o.w<box.x){o.passed=true;cleared++;combo++;if(combo%5===0){bonus+=50;toast('连续躲过 '+combo+' 次 · +50 分');}}}obstacles=obstacles.filter(o=>!o.broken&&o.x>-100);
 syncRun();$('distance').textContent=Math.floor(time)+' 秒';$('speed').textContent=(speedAt(time)/210).toFixed(1)+'× 速度';if(time>900&&mode==='running')die(now);
}
function loop(now){const dt=Math.min(.1,(now-last)/1000||0);last=now;if(mode==='running'){acc+=dt;while(acc>=1/120&&mode==='running'){update(1/120,now);acc-=1/120;}}else acc=0;draw(now);requestAnimationFrame(loop);}requestAnimationFrame(loop);
$('start').onclick=start;$('pause').onclick=pause;
$('sound').onclick=()=>{sound=!sound;try{localStorage.setItem('frog-sound',sound?'yes':'no');}catch{}syncSound();if(sound)playSound('jump');};
const held=new Set();document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName))return;if(['Space','ArrowUp','KeyW','ArrowDown','KeyS','KeyP','Escape'].includes(e.code)){e.preventDefault();if(e.repeat)return;if(['Space','ArrowUp','KeyW'].includes(e.code))jump();else if(['ArrowDown','KeyS'].includes(e.code)){held.add(e.code);duck=true;}else pause();}});
document.addEventListener('keyup',e=>{if(['ArrowDown','KeyS'].includes(e.code)){held.delete(e.code);duck=held.size>0;}});
for(const [id,press,release]of [['jump',jump,()=>{}],['duck',()=>{if(mode==='running')duck=true;},()=>{duck=false;}]]){const b=$(id);b.addEventListener('selectstart',e=>e.preventDefault());b.addEventListener('dragstart',e=>e.preventDefault());b.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);press();});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,release);b.addEventListener('contextmenu',e=>e.preventDefault());b.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)press();}});b.addEventListener('keyup',release);}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();jump();});window.addEventListener('blur',()=>{held.clear();duck=false;if(mode==='running')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='running')pause();});
$('share').onclick=async()=>{const url=new URL('./',location.href).href;try{if(navigator.share){await navigator.share({title:'奶蛙快跑 · 再跑亿次',text:'来比比谁的奶蛙跑得更远！',url});}else{await navigator.clipboard.writeText(url);toast('游戏链接已复制，发给奶家人吧！');}}catch(e){if(e.name!=='AbortError')toast('请复制浏览器地址，分享给奶家人');}};
const mc=document.modelContext;if(mc?.registerTool){try{Promise.resolve(mc.registerTool({name:'read_naiwa_game',description:'读取奶蛙游戏当前状态和个人最高分，不改变游戏。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(!input||Object.keys(input).length)throw new Error('不接受参数');return {state:mode,score:scoreAt(time,bonus),best:records.best,stars:collected,shield};}})).catch(()=>{});}catch{}}





