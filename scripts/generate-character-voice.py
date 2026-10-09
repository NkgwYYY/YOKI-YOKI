"""Original soft, rounded mascot chirps; no sampled voices or game audio.
Recreate with numpy/scipy and ffmpeg. Pitch, mouth shape and breath all move
independently so the little syllables feel alive rather than like UI beeps.
"""
from pathlib import Path
import subprocess, tempfile, wave
import numpy as np
from scipy.signal import butter, sosfilt
SR = 32000
OUT = Path(__file__).resolve().parents[1] / 'artifacts/mobile/assets/sounds/character'
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(10261010)
VOWELS = {'u': (590, 1450, 2850), 'o': (750, 1400, 2900),
          'a': (900, 1900, 3250), 'i': (430, 2550, 3600), 'm': (380, 1100, 2300)}

def syllable(duration, pitch, peak, end, vowel, to, airy=False):
    n = int(SR * duration)
    t = np.arange(n) / SR
    q = t / duration
    # A smiling upward scoop followed by a relaxed falling tail.
    bend = np.interp(q, [0, .17, .46, .72, 1], [pitch*.9, pitch, peak, peak*.985, end])
    wobble = 3*np.sin(2*np.pi*9*t) + 1.6*np.sin(2*np.pi*17*t + .7)
    f = bend + wobble*np.sin(np.pi*q)
    phase = np.cumsum(f)/SR
    mouth = np.clip((q-.10)/.68, 0, 1)
    mouth = mouth*mouth*(3-2*mouth)
    a, b = np.array(VOWELS[vowel]), np.array(VOWELS[to])
    formants = a[None, :] + (b-a)[None, :]*mouth[:, None]
    out = np.zeros(n)
    for h in range(1, 22):
        hz = f*h
        bands = np.exp(-.5*((hz[:, None]-formants)/np.array([210, 300, 420]))**2)
        # Rounded glottal source: suppress buzzy upper partials, retain vowel identity.
        strength = (.24 + bands @ np.array([1.0, .66, .22])) * np.exp(-h*.075) / h**1.48
        out += strength*np.sin(2*np.pi*h*phase - h*.24)
    air = sosfilt(butter(2, [700, 3600], btype='bandpass', fs=SR, output='sos'), rng.normal(0, 1, n))
    attack = np.sin(np.minimum(1, q/.20)*np.pi/2)**2
    release = np.sin(np.minimum(1, (1-q)/.30)*np.pi/2)**2
    envelope = attack*release*(.88+.12*np.sin(np.pi*q))
    out = (out + air*(.024 if airy else .012))*envelope
    return out

# Short "myu / pyu / kuri" contours, with no intelligible spoken words.
clips = {
    'greet': [(.22, 535, 695, 620, 'm', 'i'), (.26, 655, 710, 525, 'u', 'o')],
    'happy': [(.15, 590, 750, 690, 'm', 'i'), (.16, 655, 805, 720, 'u', 'i'), (.25, 690, 755, 535, 'i', 'u')],
    'surprise': [(.27, 565, 805, 675, 'm', 'u')],
    'soft': [(.29, 510, 605, 490, 'm', 'u'), (.24, 490, 550, 430, 'u', 'o')],
    'chat': [(.17, 555, 680, 615, 'm', 'u'), (.14, 630, 750, 590, 'u', 'i'), (.24, 545, 690, 540, 'i', 'u')],
    'land': [(.21, 580, 635, 420, 'u', 'o')],
    'welcome': [(.19, 565, 720, 650, 'm', 'i'), (.17, 650, 790, 725, 'u', 'i'), (.14, 690, 805, 750, 'i', 'u'), (.29, 695, 780, 540, 'u', 'o')],
}
with tempfile.TemporaryDirectory() as tmp:
    for name, notes in clips.items():
        segments = [np.zeros(int(.018*SR))]
        for i, note in enumerate(notes):
            segments.extend([syllable(*note, airy=name=='soft'), np.zeros(int((.045 if i%2 else .065)*SR))])
        data = np.concatenate(segments)
        data = sosfilt(butter(2, 4700, fs=SR, output='sos'), data)
        data = .60*data/max(.01, np.max(np.abs(data)))
        assert np.isfinite(data).all() and np.max(np.abs(data)) <= .61
        wav = Path(tmp)/f'{name}.wav'
        with wave.open(str(wav), 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
            f.writeframes((data*32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '80k', str(OUT/f'{name}.mp3')], check=True)
        print(name, round(len(data)/SR, 2), 'sec', (OUT/f'{name}.mp3').stat().st_size, 'bytes')
