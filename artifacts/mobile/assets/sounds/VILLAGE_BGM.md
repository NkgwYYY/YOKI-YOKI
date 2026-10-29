# 村の午後 — original YOKI YOKI loop

`village-afternoon.mp3`: original 31.304-second, 16-bar 3/4 loop at 92 BPM. Newly composed melody and procedural wood mallet, airy flute, plucked accompaniment, soft bass and brushed percussion. No commercial recording, sample pack, or existing game melody is used. The requested reference is used only for the broad whimsical/pastoral mood.

Source score and synthesizer: `scripts/audio/compose_village.py` (numpy). Generate WAV with `python3 scripts/audio/compose_village.py /tmp/village.wav`, then encode with `ffmpeg -i /tmp/village.wav -codec:a libmp3lame -q:a 3 assets/sounds/village-afternoon.mp3` from the mobile directory. Circular reflections carry notes over the loop boundary. Verified peak -4.0 dBFS, mean -17.2 dBFS; app playback volume 20%.

The BGM button starts/stops playback, and the preference persists. Web starts from a real button press when autoplay is blocked. It pauses off-screen/in the background and during the conversation panel, and disposes the player on unmount. Map transitions do not restart the music.
