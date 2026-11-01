/* A small, bounded machine workbench. Local coordinates match the physics. */
(function(){
'use strict';
const clone=value=>JSON.parse(JSON.stringify(value)),COLORS=window.AsobiJunkPhysics.colors;
class Editor{
 constructor(canvas,options={}){
  this.canvas=canvas;this.options=options;this.enabled=true;this.selectedId=null;this.tool=null;this.history=[];this.redoStack=[];this.drag=null;this.serial=0;this.labels={};
  this.draft=window.AsobiJunkPhysics.normalize(options.draft||window.AsobiJunkPhysics.defaultDraft()).draft;
  this.down=e=>this.pointerDown(e);this.move=e=>this.pointerMove(e);this.up=e=>this.pointerUp(e);this.cancel=e=>this.pointerCancel(e);this.key=e=>this.keyDown(e);
  canvas.addEventListener('pointerdown',this.down);canvas.addEventListener('pointermove',this.move);canvas.addEventListener('pointerup',this.up);canvas.addEventListener('pointercancel',this.cancel);canvas.addEventListener('lostpointercapture',this.cancel);canvas.addEventListener('keydown',this.key);this.resize();
 }
 getDraft(){return clone(this.draft);}
 point(e){const r=this.canvas.getBoundingClientRect();return{x:((e.clientX-r.left)/r.width*360-180)/1.05,y:(109-(e.clientY-r.top)/r.height*210)/1.05};}
 snap(p){return{x:Math.max(-96,Math.min(96,Math.round(p.x/8)*8)),y:Math.max(-48,Math.min(64,Math.round(p.y/8)*8))};}
 part(){return this.draft.parts.find(p=>p.id===this.selectedId)||null;}
 saveUndo(){this.history.push(this.getDraft());if(this.history.length>24)this.history.shift();this.redoStack.length=0;}
 notify(){this.options.onChange?.(this.getDraft());this.draw();}
 select(id){this.selectedId=id;this.tool=null;this.options.onSelect?.();this.draw();}
 setTool(type){this.finish();this.tool=type;this.selectedId=null;this.options.onSelect?.();this.draw();}
 setEnabled(value){if(!value)this.finish(true);this.enabled=!!value;}
 setDraft(draft,record=true){this.finish();if(record)this.saveUndo();this.draft=window.AsobiJunkPhysics.normalize(draft).draft;this.selectedId=null;this.tool=null;if(!record){this.history.length=0;this.redoStack.length=0;}this.notify();}
 setName(name){this.draft.name=window.AsobiJunkPhysics.normalize({...this.draft,name}).draft.name;this.notify();}
 setColor(color){if(!COLORS.includes(color)||color===this.draft.color)return;this.saveUndo();this.draft.color=color;this.notify();}
 add(type,point){if(this.draft.parts.length>=8){this.options.onReject?.('limit');return;}const limits={fan:2,ballast:2},count=this.draft.parts.filter(p=>p.type===type).length,wheels=this.draft.parts.filter(p=>p.type.includes('wheel')).length;if(limits[type]&&count>=limits[type]||type.includes('wheel')&&wheels>=4){this.options.onReject?.('typeLimit');return;}this.saveUndo();const p=this.snap(point),id='p'+Date.now().toString(36)+(++this.serial).toString(36);this.draft.parts.push({id,type,x:p.x,y:p.y,angle:0});this.selectedId=id;this.tool=null;this.options.onAction?.('place');this.notify();}
 moveSelected(dx,dy,record=true){const p=this.part();if(!this.enabled||!p)return;if(record)this.saveUndo();Object.assign(p,this.snap({x:p.x+dx,y:p.y+dy}));this.notify();}
 rotate(){const p=this.part();if(!this.enabled||!p||p.type!=='fan')return;this.saveUndo();p.angle=(p.angle+Math.PI/2)%(Math.PI*2);this.options.onAction?.('rotate');this.notify();}
 remove(){if(!this.enabled||!this.part())return;this.saveUndo();this.draft.parts=this.draft.parts.filter(p=>p.id!==this.selectedId);this.selectedId=null;this.options.onAction?.('remove');this.notify();}
 undo(){if(!this.enabled||!this.history.length)return;this.finish();const name=this.draft.name;this.redoStack.push(this.getDraft());this.draft=this.history.pop();this.draft.name=name;this.selectedId=null;this.tool=null;this.notify();}
 redo(){if(!this.enabled||!this.redoStack.length)return;this.finish();const name=this.draft.name;this.history.push(this.getDraft());this.draft=this.redoStack.pop();this.draft.name=name;this.selectedId=null;this.tool=null;this.notify();}
 hit(point){return [...this.draft.parts].reverse().find(p=>Math.hypot(p.x-point.x,p.y-point.y)<(p.type==='big-wheel'?31:p.type==='ballast'?19:25));}
 pointerDown(e){if(!this.enabled||this.drag||e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();this.canvas.focus({preventScroll:true});const point=this.point(e);if(this.tool){this.add(this.tool,point);return;}const p=this.hit(point);if(!p){this.select(null);return;}this.select(p.id);this.drag={pointer:e.pointerId,part:p.id,origin:{x:p.x,y:p.y},start:point,before:this.getDraft(),moved:false};try{this.canvas.setPointerCapture(e.pointerId);}catch{}}
 pointerMove(e){if(!this.enabled||!this.drag||e.pointerId!==this.drag.pointer)return;const point=this.point(e),part=this.part();if(!part)return;e.preventDefault();const next=this.snap({x:this.drag.origin.x+point.x-this.drag.start.x,y:this.drag.origin.y+point.y-this.drag.start.y});if(part.x===next.x&&part.y===next.y)return;this.drag.moved=true;Object.assign(part,next);this.notify();}
 pointerUp(e){if(!this.drag||e.pointerId!==this.drag.pointer)return;this.finish();}
 pointerCancel(e){if(!this.drag||e.pointerId!==this.drag.pointer)return;this.finish(true);}
 finish(cancel=false){const d=this.drag;if(!d)return;this.drag=null;if(d.moved){if(cancel)this.draft=d.before;else{this.history.push(d.before);if(this.history.length>24)this.history.shift();this.redoStack.length=0;this.options.onAction?.('place');}this.notify();}try{if(this.canvas.hasPointerCapture(d.pointer))this.canvas.releasePointerCapture(d.pointer);}catch{}}
 keyDown(e){if(!this.enabled||e.ctrlKey||e.altKey||e.metaKey||e.isComposing)return;const key=e.key.toLowerCase(),move={arrowleft:[-8,0],arrowright:[8,0],arrowup:[0,8],arrowdown:[0,-8]}[key];if(move){e.preventDefault();e.stopPropagation();this.moveSelected(...move);}else if(key==='r'){e.preventDefault();e.stopPropagation();if(!e.repeat)this.rotate();}else if(key==='delete'||key==='backspace'){e.preventDefault();e.stopPropagation();if(!e.repeat)this.remove();}}
 resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);this.canvas.width=Math.round(Math.max(1,r.width||360)*dpr);this.canvas.height=Math.round(this.canvas.width*210/360);this.draw();}
 setLabels(labels){this.labels=labels;this.draw();}
 draw(){if(!this.canvas.width)return;const c=this.canvas.getContext('2d'),scale=this.canvas.width/360;c.setTransform(scale,0,0,scale,0,0);c.fillStyle='#f6f0dc';c.fillRect(0,0,360,210);c.strokeStyle='#dcdcc9';c.lineWidth=.65;for(let x=0;x<=360;x+=10){c.beginPath();c.moveTo(x,0);c.lineTo(x,210);c.stroke();}for(let y=2;y<210;y+=10){c.beginPath();c.moveTo(0,y);c.lineTo(360,y);c.stroke();}c.fillStyle='#d4dbc8';c.fillRect(0,195,360,15);window.AsobiJunkVisual.drawMachine(c,this.draft,{x:180,y:109,scale:1.05,selectedId:this.selectedId});const stats=window.AsobiJunkPhysics.stats(this.draft),cx=180+stats.com.x*1.05,cy=109-stats.com.y*1.05;c.strokeStyle='#e9674b';c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,5,0,Math.PI*2);c.moveTo(cx-8,cy);c.lineTo(cx+8,cy);c.moveTo(cx,cy-8);c.lineTo(cx,cy+8);c.stroke();c.font='bold 10px system-ui,sans-serif';c.textAlign='left';c.fillStyle='#687963';c.fillText(this.labels.front||'FRONT →',290,188);c.fillText(this.labels.com||'⊕ CENTER OF MASS',10,188);if(this.tool){c.fillStyle='#1b545b';c.fillRect(0,0,360,24);c.fillStyle='#fff7d8';c.textAlign='center';c.fillText(this.labels.place||'Tap the grid to place',180,16);}c.resetTransform();}
 cleanup(){this.finish(true);this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerup',this.up);this.canvas.removeEventListener('pointercancel',this.cancel);this.canvas.removeEventListener('lostpointercapture',this.cancel);this.canvas.removeEventListener('keydown',this.key);}
}
Editor.colors=COLORS;window.AsobiJunkEditor=Editor;
})();
