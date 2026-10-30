/* Local-only vector ink editor. A single owned pointer supplies real strokes. */
(function(){
'use strict';
const MAX_STROKES=window.AsobiDoodleGeometry.maxStrokes,MAX_POINTS=window.AsobiDoodleGeometry.maxPoints;
const COLORS=['#ef755f','#63a7d8','#e7b64d','#78ac79','#b185ce','#354657'];
const copy=value=>JSON.parse(JSON.stringify(value));
function sanitize(value){
 const strokes=[];let remaining=MAX_POINTS;
 for(const item of Array.isArray(value?.strokes)?value.strokes.slice(0,MAX_STROKES):[]){
  if(!item||!Array.isArray(item.points))continue;const points=[];
  for(const p of item.points.slice(0,Math.min(256,remaining)))if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))points.push({x:Math.max(0,Math.min(240,p.x)),y:Math.max(0,Math.min(160,p.y))});
  remaining-=points.length;if(points.length)strokes.push({color:/^#[0-9a-f]{6}$/i.test(item.color)?item.color.toLowerCase():COLORS[0],width:[6,12,18].includes(item.width)?item.width:12,points});
 }
 return{version:1,name:typeof value?.name==='string'?Array.from(value.name).slice(0,16).join(''):'',strokes};
}
class DoodleEditor{
 constructor(canvas,{drawing,onChange,onInk,onReject}={}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.drawing=sanitize(drawing);this.onChange=onChange||(()=>{});this.onInk=onInk||(()=>{});this.onReject=onReject||(()=>{});this.color=COLORS[0];this.width=12;this.enabled=true;this.pointer=null;this.before=null;this.history=[];this.redoStack=[];this.raf=0;this.dirty=true;this.lastInk=0;this.disposed=false;this.labels={grip:'持つところ',guide:'ここから自由に描こう'};
  this.down=event=>{if(!this.enabled||this.disposed||this.pointer!==null||event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();if(this.drawing.strokes.length>=MAX_STROKES||this.drawing.strokes.reduce((n,s)=>n+s.points.length,0)>=MAX_POINTS){this.onReject('strokes');return;}this.before=copy(this.drawing);this.pointer=event.pointerId;this.drawing.strokes.push({color:this.color,width:this.width,points:[this.point(event)]});canvas.setPointerCapture(event.pointerId);this.queue();};
  this.move=event=>{if(this.pointer!==event.pointerId)return;event.preventDefault();const stroke=this.drawing.strokes.at(-1),p=this.point(event),last=stroke.points.at(-1);if(Math.hypot(p.x-last.x,p.y-last.y)<1.4)return;if(stroke.points.length>=256)stroke.points=stroke.points.filter((_,i)=>i%2===0);stroke.points.push(p);if(performance.now()-this.lastInk>85){this.lastInk=performance.now();this.onInk();}this.queue();};
  this.end=event=>{if(this.pointer!==event.pointerId)return;const cancelled=event.type==='pointercancel'||event.type==='lostpointercapture';this.finish(cancelled);};
  canvas.addEventListener('pointerdown',this.down);canvas.addEventListener('pointermove',this.move);for(const type of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,this.end);this.resize();
 }
 point(event){const rect=this.canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(240,(event.clientX-rect.left)/Math.max(1,rect.width)*240)),y:Math.max(0,Math.min(160,(event.clientY-rect.top)/Math.max(1,rect.height)*160))};}
 finish(cancelled=false){
  if(this.pointer===null)return;const id=this.pointer;this.pointer=null;
  const compiled=window.AsobiDoodleGeometry.compile(this.drawing);
  if(cancelled||!compiled.ok){this.drawing=this.before;if(!cancelled)this.onReject(compiled.key||'ink');}else{this.remember(this.before);this.redoStack=[];}
  this.before=null;try{if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);}catch{}this.queue();this.onChange(this.getDrawing());
 }
 remember(drawing){this.history.push(copy(drawing));if(this.history.length>24)this.history.shift();}
 getDrawing(){return copy(this.drawing);}
 setDrawing(value,notify=true){this.finish(true);if(notify)this.remember(this.drawing);else this.history=[];this.drawing=sanitize(value);this.redoStack=[];this.queue();if(notify)this.onChange(this.getDrawing());}
 setName(name){this.drawing.name=Array.from(String(name)).slice(0,16).join('');for(const item of[...this.history,...this.redoStack])item.name=this.drawing.name;this.onChange(this.getDrawing());}
 setEnabled(value){if(!value)this.finish(true);this.enabled=Boolean(value);this.canvas.setAttribute('aria-disabled',String(!this.enabled));}
 setBrush(color,width){if(COLORS.includes(color))this.color=color;if([6,12,18].includes(width))this.width=width;}
 undo(){this.finish(true);const previous=this.history.pop();if(!previous)return false;this.redoStack.push(this.getDrawing());this.drawing=previous;this.queue();this.onChange(this.getDrawing());return true;}
 redo(){this.finish(true);const next=this.redoStack.pop();if(!next)return false;this.remember(this.drawing);this.drawing=next;this.queue();this.onChange(this.getDrawing());return true;}
 clear(){this.finish(true);this.remember(this.drawing);this.drawing.strokes=[];this.redoStack=[];this.queue();this.onChange(this.getDrawing());}
 setLabels(labels){this.labels={...this.labels,...labels};this.queue();}
 resize(){if(this.disposed)return;const rect=this.canvas.getBoundingClientRect(),ratio=Math.min(2,window.devicePixelRatio||1);this.canvas.width=Math.max(240,Math.round(rect.width*ratio));this.canvas.height=Math.max(160,Math.round(rect.height*ratio));this.queue();}
 queue(){this.dirty=true;if(this.raf||this.disposed)return;this.raf=requestAnimationFrame(()=>{this.raf=0;if(this.dirty)this.render();});}
 render(){
  if(this.disposed)return;this.dirty=false;const c=this.ctx;c.setTransform(this.canvas.width/240,0,0,this.canvas.height/160,0,0);c.clearRect(0,0,240,160);c.fillStyle='#fff6df';c.fillRect(0,0,240,160);c.strokeStyle='#e8ddc3';c.lineWidth=.6;c.beginPath();for(let x=0;x<=240;x+=16){c.moveTo(x,0);c.lineTo(x,160);}for(let y=0;y<=160;y+=16){c.moveTo(0,y);c.lineTo(240,y);}c.stroke();
  if(this.drawing.strokes.length===0){c.setLineDash([3,4]);c.strokeStyle='#d0b78b';c.lineWidth=2;c.beginPath();c.moveTo(40,100);c.lineTo(198,62);c.stroke();c.setLineDash([]);c.fillStyle='#957d60';c.textAlign='center';c.font='10px sans-serif';c.fillText(this.labels.guide,143,38);}
  for(const stroke of this.drawing.strokes){c.strokeStyle=stroke.color;c.fillStyle=stroke.color;c.lineWidth=stroke.width;c.lineCap='round';c.lineJoin='round';if(stroke.points.length===1){const p=stroke.points[0];c.beginPath();c.arc(p.x,p.y,stroke.width/2,0,Math.PI*2);c.fill();}else{c.beginPath();stroke.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}}
  c.fillStyle='#fff9e8';c.strokeStyle='#384b53';c.lineWidth=1.5;c.beginPath();c.arc(40,100,8,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(34,100);c.lineTo(46,100);c.moveTo(40,94);c.lineTo(40,106);c.stroke();c.fillStyle='#384b53';c.textAlign='center';c.font='bold 8px sans-serif';c.fillText(this.labels.grip,40,123);
 }
 cleanup(){if(this.disposed)return;this.finish(true);this.disposed=true;cancelAnimationFrame(this.raf);this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('pointermove',this.move);for(const type of['pointerup','pointercancel','lostpointercapture'])this.canvas.removeEventListener(type,this.end);}
}
window.AsobiDoodleEditor=DoodleEditor;window.AsobiDoodleEditor.colors=COLORS;window.AsobiDoodleEditor.sanitize=sanitize;
})();
