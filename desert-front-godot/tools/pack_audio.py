import json, subprocess, wave, shutil, tempfile
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'desert-strike/assets/audio'
DEST=ROOT/'desert-front-godot/assets/audio'
FFMPEG=ROOT.parent/'tools/python-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
assert FFMPEG.is_file() and SRC.resolve().is_relative_to(ROOT.resolve())
cast=json.loads((SRC/'voice_cast.json').read_text(encoding='utf8'))
clips={}
files=[]
rate=16000
for skin in ('default','moe'):
 for faction in range(10):
  group=[]
  offset=0
  pcm=[]
  for role in range(8):
   for event in ('spawn','attack','hit','death'):
    key=f'{skin}/{faction}-{role}-{event}'
    path=SRC/'voices'/skin/f'{faction}-{role}-{event}.wav'
    if not path.is_file(): continue
    with wave.open(str(path),'rb') as sound:
     raw=sound.readframes(sound.getnframes())
     source_rate=sound.getframerate()
     channels=sound.getnchannels()
     sample_width=sound.getsampwidth()
    assert sample_width==2 and channels in (1,2)
    samples=np.frombuffer(raw,dtype='<i2').reshape((-1,channels)).astype(np.float32).mean(axis=1)
    if source_rate!=rate:
     src=np.arange(len(samples),dtype=np.float64)
     dst=np.arange(round(len(samples)*rate/source_rate),dtype=np.float64)*source_rate/rate
     samples=np.interp(dst,src,samples)
    samples=np.clip(samples,-32768,32767).astype('<i2')
    duration=len(samples)/rate
    clips[key]={'atlas':f'f{faction}-{skin}.ogg','start':round(offset/rate,5),'duration':round(duration,5)}
    pcm.append(samples)
    pcm.append(np.zeros(1600,dtype='<i2'))
    offset+=len(samples)+1600
    group.append(key)
  if not group: continue
  atlas=DEST/'voices'/f'f{faction}-{skin}.ogg'
  atlas.parent.mkdir(parents=True,exist_ok=True)
  data=np.concatenate(pcm).tobytes()
  proc=subprocess.run([str(FFMPEG),'-hide_banner','-loglevel','error','-y','-f','s16le','-ar','16000','-ac','1','-i','pipe:0','-c:a','libvorbis','-qscale:a','0',str(atlas)],input=data,capture_output=True)
  assert proc.returncode==0,proc.stderr.decode(errors='replace')
  files.append(atlas)
  print(atlas.name,atlas.stat().st_size,flush=True)
assert len(clips)==544,len(clips)
(DEST/'voice_index.json').write_text(json.dumps({'schema':1,'clips':clips},ensure_ascii=False,separators=(',',':')),encoding='utf8')
shutil.copyfile(SRC/'voice_cast.json',DEST/'voice_cast.json')
for source in (SRC/'music').glob('*.ogg'):
 out=DEST/'music'/source.name
 with tempfile.NamedTemporaryFile(suffix='.ogg',dir=out.parent,delete=False) as tmp:
  temp=Path(tmp.name)
 proc=subprocess.run([str(FFMPEG),'-hide_banner','-loglevel','error','-y','-i',str(source),'-t','30','-ac','1','-ar','24000','-c:a','libvorbis','-qscale:a','-1',str(temp)],capture_output=True)
 assert proc.returncode==0,proc.stderr.decode(errors='replace')
 temp.replace(out)
 print(out.name,out.stat().st_size,flush=True)
voice_dir=DEST/'voices'
assert voice_dir.resolve().is_relative_to(ROOT.resolve())
for old in voice_dir.rglob('*.wav'): old.unlink()
for folder in sorted((x for x in voice_dir.rglob('*') if x.is_dir()),key=lambda x:len(x.parts),reverse=True):
 if not any(folder.iterdir()): folder.rmdir()
assert SRC.resolve().is_relative_to(ROOT.resolve())
shutil.rmtree(SRC)
print('packed',len(clips),'clips into',len(files),'atlases',flush=True)

