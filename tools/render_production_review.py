"""Flat CPU triangle previews, not the browser's lighting/shaders/shadows."""
import json
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
folder=Path(__file__).resolve().parents[1]/'docs/record/production-v9-review'
for source in folder.glob('*.json'):
    triangles=json.loads(source.read_text())
    pixels=np.full((960,540,3),[198,210,213],dtype=np.uint8)
    depth=np.full((960,540),np.inf)
    for zs, points, color in triangles:
        x0,y0,x1,y1,x2,y2=points
        left=max(0,int(min(x0,x1,x2)));right=min(539,int(max(x0,x1,x2))+1)
        top=max(0,int(min(y0,y1,y2)));bottom=min(959,int(max(y0,y1,y2))+1)
        den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
        if left>right or top>bottom or abs(den)<1e-8:continue
        yy,xx=np.mgrid[top:bottom+1,left:right+1];xx=xx+.5;yy=yy+.5
        a=((y1-y2)*(xx-x2)+(x2-x1)*(yy-y2))/den
        b=((y2-y0)*(xx-x2)+(x0-x2)*(yy-y2))/den
        c=1-a-b;z=a*zs[0]+b*zs[1]+c*zs[2]
        current=depth[top:bottom+1,left:right+1]
        mask=(a>=0)&(b>=0)&(c>=0)&(z<current)
        current[mask]=z[mask]
        pixels[top:bottom+1,left:right+1][mask]=[int(color[i:i+2],16) for i in (1,3,5)]
    image=Image.fromarray(pixels)
    ImageDraw.Draw(image).text((12,12),'GEOMETRY REVIEW - NOT BROWSER CAPTURE',fill='#151515')
    image.save(source.with_suffix('.png'))
    print(source.with_suffix('.png'))
