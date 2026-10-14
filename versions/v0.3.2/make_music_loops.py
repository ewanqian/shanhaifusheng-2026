"""Derived loops only. Original supplied music is never modified."""
from pathlib import Path
import json, subprocess, wave
import numpy as np

base = Path(__file__).resolve().parent
rate = 24000
overlap = rate * 4
source = base / 'assets/score.mp3'
out = base / 'assets/audio'
out.mkdir(exist_ok=True)
report = []
for name, start in [('quiet', 5), ('stones', 38), ('vault', 72)]:
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', str(start),
        '-i', str(source), '-t', '32', '-ar', str(rate), '-ac', '2', '-f', 'f32le', '-'])
    x = np.frombuffer(raw, dtype='<f4').reshape(-1, 2)
    theta = np.linspace(0, np.pi / 2, overlap, endpoint=True)[:, None]
    seam = x[-overlap:] * np.cos(theta) + x[:overlap] * np.sin(theta)
    y = np.concatenate([x[overlap:-overlap], seam])
    peak = float(np.max(np.abs(y)))
    y *= min(1, .88 / max(peak, 1e-8))
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2')
    with wave.open(str(out / f'{name}.wav'), 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(rate); f.writeframes(pcm.tobytes())
    report.append({'name': name, 'source_start_seconds': start, 'source_duration_seconds': 32,
        'loop_duration_seconds': len(y) / rate, 'overlap_seconds': 4,
        'peak': float(np.max(np.abs(y))), 'seam_step': float(np.max(np.abs(y[-1] - y[0]))),
        'rms': float(np.sqrt(np.mean(y*y)))})
(out / 'edit-report.json').write_text(json.dumps({'source': '../score.mp3',
    'method': '4-second equal-power head/tail overlap; PCM avoids codec padding',
    'musical_review': 'Provisional excerpts; listening approval pending', 'loops': report}, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
