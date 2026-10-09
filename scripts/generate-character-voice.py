"""Original nonverbal mascot vowels; no sampled voices or game audio.
Recreate the small bundled clips with numpy/scipy and ffmpeg.
"""
from pathlib import Path
import subprocess, tempfile, wave
import numpy as np
from scipy.signal import lfilter
SR=32000
OUT=Path(__file__).resolve().parents[1]/'artifacts/mobile/assets/sounds/character'
OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(1026)
VOWELS={'u':(420,1150,2600),'o':(600,1050,2750),'a':(780,1550,3100),'i':(320,2200,3300),'m':(270,900,2000)}
def syllable(duration,pitch,end,vowel,to=None,soft=False):
 n=int(SR*duration);t=np.arange(n)/SR;q=t/duration
 # Small pitch scoops, breath and asymmetric glottal harmonics make a vocal chirp.
 f=pitch+(end-pitch)*(3*q*q-2*q*q*q)+11*np.sin(2*np.pi*6*t)*np.sin(np.pi*q)
 f*=1-.085*np.exp(-q*30)
 phase=np.cumsum(f)/SR
 a=np.array(VOWELS[vowel]);b=np.array(VOWELS[to or vowel])
 formants=a[None,:]+(b-a)[None,:]*q[:,None]
 out=np.zeros(n)
 for h in range(1,29):
  hz=f*h
  bands=np.exp(-.5*((hz[:,None]-formants)/np.array([140,220,330]))**2)
  strength=(.08+bands@np.array([1,.65,.18]))/(h**(.95 if not soft else 1.3))
  out+=strength*np.sin(2*np.pi*h*phase+.15*h)
 breath=lfilter([1,-.9],[1,-.15],rng.normal(0,.016,n))
 env=np.minimum(1,q/.11)*np.minimum(1,(1-q)/.24)
 env=np.maximum(0,env)**1.3
 out=(out+breath)*env*(.86+.14*np.cos(2*np.pi*3*t))
 return out
clips={
 'greet':[(.19,390,525,'u','i'),(.21,470,370,'o','u')],
 'happy':[(.14,440,560,'m','i'),(.16,515,610,'u','i'),(.23,500,410,'o','u')],
 'surprise':[(.27,330,660,'u','a')],
 'soft':[(.30,340,305,'m','u'),(.23,300,270,'u','o')],
 'chat':[(.16,405,475,'u','a'),(.12,530,430,'i','u'),(.24,370,480,'o','i')],
 'land':[(.20,460,300,'o','u')],
}
with tempfile.TemporaryDirectory() as tmp:
 for name,notes in clips.items():
  segments=[np.zeros(int(.025*SR))]
  for note in notes:
   segments.extend([syllable(*note,soft=name=='soft'),np.zeros(int(.055*SR))])
  data=np.concatenate(segments);data=.65*data/max(.01,np.max(np.abs(data)))
  wav=Path(tmp)/f'{name}.wav'
  with wave.open(str(wav),'wb') as f:
   f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((data*32767).astype('<i2').tobytes())
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','64k',str(OUT/f'{name}.mp3')],check=True)
  print(name,round(len(data)/SR,2),'sec', (OUT/f'{name}.mp3').stat().st_size,'bytes')
