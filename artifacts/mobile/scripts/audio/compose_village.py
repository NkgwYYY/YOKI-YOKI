"""Original score and procedural instruments for YOKI YOKI. No sampled music.
16 bars, 3/4, 92 BPM: wood mallet, airy flute, plucked accompaniment, soft bass.
Writes a seamless PCM loop; encode using ffmpeg as documented in the asset README.
"""
import sys, wave
import numpy as np
RATE=32000
BEAT=60/92
BARS=16
N=round(BARS*3*BEAT*RATE)
out=np.zeros((N,2),dtype=np.float64)
rng=np.random.default_rng(20261008)
def note(midi, beat, length, kind, amp=.1, pan=0):
    if midi is None:return
    duration=length*BEAT
    t=np.arange(round((duration+1.5)*RATE))/RATE
    f=440*2**((midi-69)/12)
    if kind=='wood':
        env=(1-np.exp(-t/.003))*np.exp(-t/.20)
        sig=(np.sin(2*np.pi*f*t)+.28*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/.10)+.08*np.sin(2*np.pi*f*5.4*t))*env
    elif kind=='flute':
        env=np.minimum(t/.06,1)*np.minimum(np.maximum(duration+.12-t,0)/.18,1)
        phase=2*np.pi*f*t+.007*np.sin(2*np.pi*4.7*t)
        sig=(np.sin(phase)+.13*np.sin(phase*2)+.06*np.sin(phase*3)+.022*rng.normal(size=len(t)))*env
    elif kind=='pluck':
        env=(1-np.exp(-t/.005))*np.exp(-t/.28)
        sig=sum(np.sin(2*np.pi*f*h*t)/h**1.65 for h in range(1,7))*env
    elif kind=='bass':
        env=np.minimum(t/.015,1)*np.exp(-t/.4)*np.minimum(np.maximum(duration+.1-t,0)/.1,1)
        sig=(np.sin(2*np.pi*f*t)+.14*np.sin(2*np.pi*f*2*t))*env
    else:
        env=np.exp(-t/.024)
        noise=rng.normal(size=len(t));noise[1:]-=.9*noise[:-1]
        sig=noise*env*.12
    mono=sig*amp
    stereo=np.stack([mono*np.sqrt((1-pan)/2),mono*np.sqrt((1+pan)/2)],axis=1)
    ids=(round(beat*BEAT*RATE)+np.arange(len(t)))%N
    np.add.at(out,ids,stereo)
chords=[(41,[57,60,64]),(43,[58,62,65]),(36,[55,58,64]),(41,[57,60,62]),(46,[57,62,65]),(45,[55,60,64]),(38,[57,60,65]),(43,[58,62,65]),(41,[57,60,64]),(46,[57,62,65]),(45,[55,60,64]),(38,[57,60,65]),(43,[58,62,65]),(36,[55,58,64]),(41,[57,60,62]),(36,[55,60,64])]
melody=[[77,81,84,None,81,79],[79,82,86,84,82,None],[76,79,82,None,74,76],[77,None,81,79,77,72],[74,77,81,None,79,77],[72,76,79,76,72,None],[74,77,81,None,76,74],[79,76,72,74,76,None],[81,84,89,None,84,81],[82,81,77,74,None,77],[79,None,76,72,76,79],[81,77,74,None,72,74],[79,82,86,None,84,82],[79,76,74,72,None,76],[77,None,81,79,77,None],[72,74,76,None,79,None]]
for bar,(root,chord) in enumerate(chords):
    b=bar*3
    note(root,b,1.1,'bass',.14,-.06);note(root+7,b+2,.7,'bass',.09,-.06)
    for j,n in enumerate(chord):
        note(n,b+1+j*.022,.55,'pluck',.032,-.35)
        note(n,b+2+j*.022,.5,'pluck',.025,.32)
    for j,n in enumerate(melody[bar]):
        at=b+j*.5+(0.035 if j%2 else 0)
        note(n,at,.41,'wood',.075,.16)
        if bar in (2,3,6,7,10,11,14,15) and j%2==0:note(n,at,.86,'flute',.065,-.23)
    for half in range(6):note(60,b+half*.5,.08,'brush',.095,.55 if half%2 else -.5)
# Circular early reflections preserve the tail over the loop boundary.
dry=out.copy()
for delay,gain in [(.071,.10),(.127,.075),(.211,.045),(.337,.028)]:
    out+=np.roll(dry,round(delay*RATE),axis=0)[:,::-1]*gain
out-=out.mean(axis=0)
peak=np.max(np.abs(out));out*=.63/max(peak,1e-8)
pcm=(np.clip(out,-1,1)*32767).astype('<i2')
with wave.open(sys.argv[1],'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
print(f'{N/RATE:.3f}s stereo loop; peak {20*np.log10(np.max(np.abs(out))):.1f}dBFS; boundary {np.max(np.abs(out[0]-out[-1])):.5f}')
