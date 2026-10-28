import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
audio=root/'desert-front-godot/assets/audio'
cast=json.loads((audio/'voice_cast.json').read_text(encoding='utf8'))['units']
index=json.loads((audio/'voice_index.json').read_text(encoding='utf8'))['clips']
assert len(cast)==80 and len(index)==544
atlases={p.name for p in (audio/'voices').glob('*.ogg')}
assert len(atlases)==17
for key,clip in index.items():
 assert clip['atlas'] in atlases and clip['start']>=0 and 0.06<clip['duration']<5
for name in ('title','sector','airy','pulse','urgent','transmission','victory','hover'):
 assert (audio/'music'/f'{name}.ogg').stat().st_size>1000
for name in ('blade','rifle','breaker','armor','antiair','siege','flyer','heal','hit','death','explosion','building','alarm'):
 assert (audio/'sfx'/f'{name}.wav').stat().st_size>1000
assert not (root/'desert-strike/assets/audio').exists()
web=(root/'desert-strike/audio-manager.js').read_text(encoding='utf8')
assert "../desert-front-godot/assets/audio/" in web
assert len([p for p in audio.rglob('*') if p.is_file() and not p.name.endswith('.import')])<=50
print('Audio verified: 80 casts, 544 indexed clips, 17 voice atlases, 13 cues, 8 tracks')

