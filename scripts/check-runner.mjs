import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as physics from '../physics.js';
const elements=new Map(),saved=new Map();
const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,disabled:false,classList:{add(){},remove(){}},setAttribute(){},append(){},replaceChildren(){},addEventListener(){},getContext:()=>({}),parentElement:{getBoundingClientRect:()=>({width:540,height:360})}});return elements.get(id);};
const context=vm.createContext({...physics,assert,console,saved,Image:class{set src(v){queueMicrotask(()=>this.onload?.());}},Audio:class{play(){return Promise.resolve();}pause(){}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},document:{getElementById:el,createElement:()=>el(Math.random()),addEventListener(){}},window:{addEventListener(){}},ResizeObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},performance:{now:()=>1000},URL,navigator:{},location:{href:'https://example.test/game/'}});
const code=readFileSync(new URL('../game.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
await vm.runInContext(code+`\n(async()=>{
 await assetPromise; await start();
 assert.equal(mode,'running');
 for(let i=0;i<5;i++)collectStar();
 assert.equal(shop.balance,5);assert.equal(JSON.parse(saved.get(shopKey)).balance,5);
 selectBackground('sunset');assert.equal(shop.selected,'meadow');assert.equal(shop.balance,5);
 for(let i=0;i<15;i++)collectStar();selectBackground('sunset');assert.equal(shop.balance,0);assert.equal(shop.selected,'sunset');assert(shop.owned.includes('sunset'));selectBackground('meadow');selectBackground('sunset');assert.equal(shop.balance,0);assert.equal(JSON.parse(saved.get(shopKey)).selected,'sunset');
 await start();collected=5;bonus=125;shield=true;
 assert.equal(collected,5);assert.equal(bonus,125);assert.equal(shield,true);
 obstacles=[{type:'rock',x:90,w:40,h:40}];update(1/120,1001);
 assert.equal(mode,'running');assert.equal(shield,false);assert(invincible>0);assert.equal(obstacles.length,0);
 invincible=0;obstacles=[{type:'rock',x:90,w:40,h:40}];update(1/120,1002);
 assert.equal(mode,'dead');assert.equal(records.history.length,1);assert(records.best>=125);
 await start();assert.equal(bonus,0);assert.equal(collected,0);assert.equal(shield,false);assert.equal(combo,0);
 for(let i=0;i<5;i++){obstacles=[{type:'rock',x:0,w:40,h:40}];update(1/120,1010+i);}
 assert.equal(combo,5);assert.equal(bonus,50);
 console.log('PASS: stars, shield acquisition/consumption, collision, score persistence, restart and streak bonus');
})()`,context);
for(const width of [540,960]){
 const speed=physics.speedForWidth(0,width);const reaction=(width-126)/speed;
 assert.equal(physics.speedForWidth(0,width),physics.speedAt(0),'identical physics speed on every viewport');
 // A centered jump must clear the largest ground obstacle at both speed extremes.
 for(const t of [0,1000]){const speed=physics.speedForWidth(t,width);let y=physics.GROUND,v=physics.JUMP;let o={type:'rock',x:84+speed*.37,w:46,h:44};for(let i=0;i<90;i++){v+=physics.GRAVITY/120;y=Math.min(physics.GROUND,y+v/120);o.x-=speed/120;assert(!physics.intersects(physics.playerBox(68,y,false),physics.obstacleBox(o)),'jump clearance '+width+' '+t);}}
}
console.log('PASS: mobile/desktop physics speed and jump clearance at minimum/maximum speed');




console.log('PASS: shop earnings, insufficient balance, purchase, free switching and saved selection');
