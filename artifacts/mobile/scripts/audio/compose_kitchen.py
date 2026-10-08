"""Original procedural water sounds. No recordings or copyrighted samples."""
from pathlib import Path
import numpy as np, wave, subprocess
R=Path(__file__).resolve().parents[2]/'assets/sounds';R.mkdir(exist_ok=True)
rng=np.random.default_rng(240108);sr=32000

def save(name,signal):
 signal=np.clip(signal,-.9,.9);wav=R/(name+'.wav')
 with wave.open(str(wav),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes((signal*32767).astype('<i2').tobytes())
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','96k',str(R/(name+'.mp3'))],check=True)
 wav.unlink()
n=sr*8;t=np.arange(n)/sr
noise=rng.normal(0,1,n);soft=np.convolve(noise,np.ones(25)/25,mode='same')
y=soft*.11
for _ in range(190):
 start=int(rng.uniform(0,8)*sr);length=int(rng.uniform(.03,.17)*sr);q=np.arange(length)/sr
 freq=rng.uniform(160,650);bubble=np.sin(2*np.pi*(freq*q+170*q*q))*np.exp(-q*rng.uniform(25,60))*.10
 idx=(start+np.arange(length))%n;y[idx]+=bubble
# seamless loop envelope is periodic, with no abrupt global fade at the seam
save('kitchen-simmer',y*(.83+.17*np.sin(2*np.pi*t/8)))
q=np.arange(int(sr*1.15))/sr
splash=rng.normal(0,1,len(q))*.06*np.exp(-q*5)+np.sin(2*np.pi*(420*q-100*q*q))*.025*np.exp(-q*9)
for at in [.11,.2,.36,.55,.79]:
 d=q-at;mask=d>=0;splash[mask]+=np.sin(2*np.pi*850*d[mask])*np.exp(-d[mask]*35)*.11
save('kitchen-lift',splash)
print('Generated original simmer and water-lift effects')
