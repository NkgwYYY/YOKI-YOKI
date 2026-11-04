"""Original four-voice chiptunes for YOKI YOKI. No samples or borrowed melodies.

Run: python3 scripts/render_music.py
Requires numpy. Output: mono PCM WAV, 32 kHz; battle has an exact 16-bar loop.
"""
from pathlib import Path
import json
import math
import wave
import numpy as np

RATE = 32000
OUT = Path(__file__).resolve().parents[1] / 'dist' / 'assets' / 'music'
NOTES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
RNG = np.random.default_rng(20261104)


def frequency(note):
    accidental = 1 if '#' in note else -1 if 'b' in note else 0
    midi = (int(note[-1]) + 1) * 12 + NOTES[note[0]] + accidental
    return 440 * 2 ** ((midi - 69) / 12)


def synth(note, duration, voice):
    n = max(1, round(duration * RATE))
    t = np.arange(n) / RATE
    if voice == 'noise':
        # A softly filtered, deterministic noise burst gives the fourth channel.
        noise = RNG.uniform(-1, 1, n)
        signal = np.convolve(noise, np.ones(3) / 3, mode='same')
        signal *= np.exp(-t / .035)
    else:
        f = frequency(note)
        phase = 2 * math.pi * f * t
        signal = np.zeros(n)
        if voice == 'bass':
            for k in range(1, min(18, int(RATE / (2 * f))), 2):
                signal += (-1) ** ((k - 1) // 2) * np.sin(k * phase) / k ** 2
        else:
            duty = .25 if voice == 'lead' else .125
            for k in range(1, min(13, int(RATE / (2 * f)))):
                signal += (2 * np.sin(math.pi * k * duty) / (math.pi * k)) * np.cos(k * phase - math.pi * k * duty)
            signal *= .73 + .27 * np.exp(-t / .055)
    attack, release = min(round(.004 * RATE), n // 3), min(round(.018 * RATE), n // 3)
    envelope = np.ones(n)
    if attack:
        envelope[:attack] = np.linspace(0, 1, attack)
    if release:
        envelope[-release:] = np.linspace(1, 0, release)
    return signal * envelope


class Score:
    def __init__(self, bpm, beats):
        self.beat = 60 / bpm
        self.beats = beats
        self.data = np.zeros(round(beats * self.beat * RATE))
        self.events = 0

    def add(self, at, note, beats, voice='lead', level=.22, gate=.86):
        if note == '-':
            return
        signal = synth(note, beats * self.beat * gate, voice) * level
        start = round(at * self.beat * RATE)
        end = min(len(self.data), start + len(signal))
        self.data[start:end] += signal[:end-start]
        self.events += 1

    def melody(self, at, notes):
        for note, duration in notes:
            self.add(at, note, duration)
            at += duration

    def save(self, name, loop=False):
        peak = np.max(np.abs(self.data))
        data = self.data * (.68 / peak)
        pcm = np.rint(data * 32767).astype('<i2')
        with wave.open(str(OUT / f'{name}.wav'), 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(RATE)
            wav.writeframes(pcm.tobytes())
        return {'file': f'{name}.wav', 'seconds': len(data) / RATE, 'loop': loop,
                'events': self.events, 'peak': round(float(np.max(np.abs(data))), 3),
                'rms': round(float(np.sqrt(np.mean(data ** 2))), 3), 'edge': [int(pcm[0]), int(pcm[-1])]}


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    metadata = {}
    # Encounter: eight beats, quick ascending question and suspended landing.
    score = Score(168, 8)
    score.melody(0, [('D5',.5),('A4',.5),('D5',.5),('F5',.5),('A5',.5),('G5',.5),('E5',.5),('C#5',.5),('D5',.5),('F5',.5),('A5',.5),('D6',.5),('A5',1.5),('-',.5)])
    for i, note in enumerate(['D3','D3','Bb2','A2']):
        score.add(i*2, note, 1.8, 'bass', .31)
    for at in [0, 1, 2, 3, 4, 5, 5.5, 6]:
        score.add(at, 'D4', .22, 'noise', .14)
    for i,note in enumerate(['D4','F4','A4','D5','E4','G4','A4','C#5']):
        score.add(i*.5+2, note, .4, 'arp', .12)
    metadata['encounter'] = score.save('encounter')

    # Battle: A minor-colour section, a brighter B section, and a dominant turn.
    score = Score(144, 64)
    melodies = [
        [('D5',.5),('A4',.5),('D5',.5),('F5',.5),('E5',1),('D5',.5),('A4',.5)],
        [('Bb4',.5),('F5',.5),('D5',1),('F5',.5),('G5',.5),('F5',1)],
        [('A5',.75),('G5',.25),('F5',.5),('E5',.5),('F5',1),('C5',1)],
        [('E5',.5),('G5',.5),('E5',.5),('C5',.5),('D5',.5),('E5',.5),('G5',1)],
        [('A5',.5),('F5',.5),('D5',.5),('A4',.5),('D5',1),('F5',.5),('E5',.5)],
        [('G5',.5),('D5',.5),('Bb4',1),('D5',.5),('F5',.5),('G5',1)],
        [('F5',.5),('D5',.5),('Bb4',.5),('D5',.5),('F5',.5),('G5',.5),('A5',1)],
        [('G5',.5),('E5',.5),('C#5',1),('E5',.5),('A5',.5),('G5',.5),('E5',.5)],
        [('F5',.5),('A5',.5),('C6',1),('A5',.5),('G5',.5),('F5',1)],
        [('E5',.5),('G5',.5),('C6',.5),('B5',.5),('G5',1),('E5',1)],
        [('A5',.5),('D6',.5),('C6',.5),('A5',.5),('F5',.5),('E5',.5),('D5',1)],
        [('F5',.5),('Bb5',.5),('A5',.5),('F5',.5),('D5',1),('F5',1)],
        [('G5',.5),('Bb5',.5),('A5',1),('G5',.5),('F5',.5),('D5',1)],
        [('F5',.5),('A5',.5),('D6',1),('C6',.5),('A5',.5),('F5',1)],
        [('E5',.5),('C#5',.5),('E5',.5),('G5',.5),('A5',1),('E5',1)],
        [('G5',.5),('E5',.5),('C#5',.5),('E5',.5),('A4',.5),('C#5',.5),('E5',.5),('-',.5)],
    ]
    harmony = [('D3','A3',['D4','F4','A4']),('Bb2','F3',['Bb3','D4','F4']),('F3','C4',['F4','A4','C5']),('C3','G3',['C4','E4','G4']),('D3','A3',['D4','F4','A4']),('G2','D3',['G3','Bb3','D4']),('Bb2','F3',['Bb3','D4','F4']),('A2','E3',['A3','C#4','E4']),('F3','C4',['F4','A4','C5']),('C3','G3',['C4','E4','G4']),('D3','A3',['D4','F4','A4']),('Bb2','F3',['Bb3','D4','F4']),('G2','D3',['G3','Bb3','D4']),('D3','A3',['D4','F4','A4']),('A2','E3',['A3','C#4','E4']),('A2','E3',['A3','C#4','E4'])]
    for bar, (melody, (root, fifth, chord)) in enumerate(zip(melodies, harmony)):
        assert sum(d for _,d in melody) == 4
        score.melody(bar*4, melody)
        for step in range(8):
            at = bar*4+step*.5
            score.add(at, root if step%4<2 else fifth, .5, 'bass', .26, .82)
            score.add(at+.25, chord[step%3], .25, 'arp', .11, .72)
            score.add(at, 'D4', .14 if step%2 else .19, 'noise', .025 if step%2 else .05)
        for beat in [1,3]:
            score.add(bar*4+beat, 'D4', .27, 'noise', .1)
    metadata['battle'] = score.save('battle', True)

    # Victory: the encounter's rising gesture resolves to warm D major.
    score = Score(132, 12)
    score.melody(0, [('D5',.5),('F#5',.5),('A5',1),('D6',1),('A5',.5),('B5',.5),('A5',1),('F#5',.5),('G5',.5),('E5',1),('A5',1),('F#5',.5),('A5',.5),('D6',2.5),('-',.5)])
    for bar,(root,chord) in enumerate([('D3',['D4','F#4','A4']),('G2',['G3','B3','D4']),('D3',['D4','F#4','A4'])]):
        score.add(bar*4, root, 3.8, 'bass', .27)
        for step in range(8):
            score.add(bar*4+step*.5, chord[step%3], .45, 'arp', .14)
    for at in [0, .5, 1, 2, 4, 6, 8]:
        score.add(at, 'D4', .25, 'noise', .08)
    metadata['victory'] = score.save('victory')
    (OUT / 'credits.json').write_text(json.dumps({'composition':'Original music for YOKI YOKI, 2026-11-04','samples':'None; pulse, triangle and noise synthesized from the source score','tracks':metadata},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(metadata,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    build()
