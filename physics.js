export const GROUND=280, GRAVITY=1650, JUMP=-620;
export const speedAt=t=>Math.min(410,210+t*2.2);
export const scoreAt=(t,bonus=0)=>Math.floor(t*10)+bonus;
export const speedForWidth=(t,width)=>speedAt(t)*Math.max(.6,Math.min(1,(width-150)/810));
export function intersects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
export function playerBox(x,y,duck){return {x:x+20,y:y-(duck?24:60),w:38,h:duck?22:55};}
export function obstacleBox(o){return o.type==='bird'?{x:o.x+4,y:GROUND-54,w:32,h:21}:{x:o.x+5,y:GROUND-o.h+4,w:o.w-10,h:o.h-4};}
