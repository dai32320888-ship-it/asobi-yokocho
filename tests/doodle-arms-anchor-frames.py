"""Measure actual encoded video frames; labeled contact sheets are QC only."""
import argparse, json, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

p = argparse.ArgumentParser()
p.add_argument('--center', type=float, required=True)
p.add_argument('--radius', type=float, default=.4)
p.add_argument('--crop', default='0,0,390,740')
p.add_argument('--label', required=True)
a = p.parse_args()
tests = Path(__file__).resolve().parent
work = tests/'.doodle-media-proofs'
work.mkdir(exist_ok=True)
meta = json.loads((tests/'doodle-arms-media.json').read_text(encoding='utf-8'))
video = meta['video']
probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',video]))
frames = [(i,float(f['best_effort_timestamp_time'])) for i,f in enumerate(probe['frames'])]
chosen = [(i,t) for i,t in frames if a.center-a.radius <= t <= a.center+a.radius]
assert chosen
lo,hi = chosen[0][0],chosen[-1][0]
width,height = meta['viewport']['width'],meta['viewport']['height']
raw = subprocess.check_output(['ffmpeg','-v','error','-i',video,'-vf',f'select=between(n\\,{lo}\\,{hi})','-vsync','0','-pix_fmt','rgb24','-f','rawvideo','pipe:1'])
images = np.frombuffer(raw,dtype=np.uint8).reshape((-1,height,width,3))
assert len(images)==len(chosen),(len(images),len(chosen))
x,y,w,h = map(int,a.crop.split(','))
columns=4
rows=(len(images)+columns-1)//columns
sheet=Image.new('RGB',(columns*w,rows*(h+26)),'#e5e5e5')
try:
 font=ImageFont.truetype('DejaVuSans.ttf',16)
except OSError:
 font=ImageFont.load_default(size=16)
for n,((i,t),pixels) in enumerate(zip(chosen,images)):
 image=Image.fromarray(pixels).crop((x,y,x+w,y+h))
 image.save(work/f'doodle-anchor-{a.label}-{i:05}.png')
 dx=(n%columns)*w;dy=(n//columns)*(h+26)
 sheet.paste(image,(dx,dy+26))
 ImageDraw.Draw(sheet).text((dx+4,dy+4),f'#{i}  {t:.3f}s',fill='#102030',font=font)
file=work/f'doodle-anchor-{a.label}-contact.png'
sheet.save(file)
print(json.dumps({'contact':str(file),'crop':[x,y,w,h],'frames':chosen},ensure_ascii=False))
