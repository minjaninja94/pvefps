'use strict';

const packEffects = (() => {
  const layer = document.getElementById('reveal-effects');
  const game = document.querySelector('main');
  const toggle = document.getElementById('sound-toggle');
  const icon = document.getElementById('sound-icon');
  const voiceLengths = {
    rare: [1.48,2.37,2.50],
    legendary: [1.57,2.51,2.48,6.27,3.65],
    'golden-rare': [2.34,3.22,4.28],
    'golden-legendary': [2.99,3.82,3.33,6.64,3.76]
  };
  const voices = Object.fromEntries(Object.entries(voiceLengths).map(([key,lengths]) => [
    key, lengths.map((seconds,index) => {
      const suffix = index === 0 ? '' : '-' + (index + 1);
      const cue = new Audio('pack-reveal/' + key + '-card' + suffix + '.wav?v=11');
      cue.preload = 'auto';
      cue.volume = .96;
      return {cue,seconds};
    })
  ]));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let muted = false;
  let audio;
  let compressor;
  const playingNotes = new Set();
  let master;
  let timer;
  let activeCard;
  let voice;
  let packTimers = [];
  let previewPacks = [];
  try { muted = localStorage.getItem('pack-shop-muted') === 'true'; } catch {}

  function updateSoundButton() {
    toggle.setAttribute('aria-pressed', !muted);
    toggle.title = muted ? '효과음 켜기' : '효과음 끄기';
    icon.textContent = muted ? '♩' : '♫';
  }

  function stopVoice() {
    if (!voice) return;
    voice.pause();
    voice.currentTime = 0;
    voice = null;
  }

  function sound() {
    if (muted) return false;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return false;
    try {
      if (!audio) {
        audio = new AudioEngine();
        compressor = audio.createDynamicsCompressor();
        master = audio.createGain();
        master.gain.value = .72;
        compressor.connect(master).connect(audio.destination);
      }
      if (audio.state !== 'running') audio.resume().catch(() => {});
      return true;
    } catch { return false; }
  }

  function note(freq, start, duration, gain, wave = 'sine', endFreq = freq) {
    const source = audio.createOscillator();
    const amp = audio.createGain();
    source.type = wave;
    source.frequency.setValueAtTime(freq, start);
    source.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    amp.gain.setValueAtTime(.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + .014);
    amp.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(amp).connect(compressor);
    source.start(start);
    source.stop(start + duration);
    playingNotes.add(source);
    source.onended = () => playingNotes.delete(source);
  }

  function play(rank, golden = false, announceBest = false) {
    const ready = sound();
    let voiceDuration = 0;
    if ((rank >= 3 || (rank === 2 && announceBest)) && !muted) {
      stopVoice();
      const key = rank === 4 ? 'legendary' : 'rare';
      const variants = voices[golden ? 'golden-' + key : key];
      const {cue,seconds} = variants[Math.floor(Math.random() * variants.length)];
      voice = cue;
      voiceDuration = (Number.isFinite(cue.duration) ? cue.duration : seconds) * 1000;
      voice.play().catch(() => {});
    }
    if (!ready) return voiceDuration;
    const now = audio.currentTime + .015;
    if (rank === 1) {
      note(250,now,.12,.10,'triangle',110);
      note(420,now + .028,.13,.05);
    }
    if (rank === 2) {
      note(1820,now,.10,.14,'triangle',1390);
      note(659,now,.20,.12,'triangle');
      if (golden) note(1319,now + .042,.26,.095);
    }
    if (rank === 3) {
      note(149,now,.62,.34,'sine',44);
      note(780,now,.28,.13,'triangle',123);
      [392,523,659,784,1175].forEach((freq,i) => note(freq,now + .75 + i * .064,.46,.095,'triangle'));
    }
    if (rank === 4) {
      note(148,now,.18,.14,'triangle',660);
      note(115,now + .17,1,.47,'sine',32);
      note(195,now + .17,.33,.12,'sawtooth',51);
      note(96,now + .94,.64,.36,'sine',38);
      [262,330,392,523,659,784,1047].forEach((freq,i) => note(freq,now + .89 + i * .067,.83,.115,'triangle'));
      [262,392,523,659].forEach(freq => note(freq,now + 1.42,.98,.08,'sawtooth'));
      [1047,1319,1568,2093].forEach((freq,i) => note(freq,now + 1.59 + i * .09,.71,.10));
    }
    if (golden && rank >= 3) {
      const accent = now + (rank === 4 ? 2.62 : 1.91);
      [1175,1568,2093,2637].forEach((freq,i) => note(freq,accent + i * .075,.68,.12,'triangle'));
      note(100,accent,.42,.24,'sine',42);
    }
    if (rank === 4 && golden) {
      note(128,now + 3.18,.79,.44,'sine',32);
      note(420,now + 3.18,.36,.15,'triangle',58);
      [523,784,1047,1319,1568,2093].forEach((freq,i) => note(freq,now + 3.19 + i * .045,.71,.11));
    }
    return voiceDuration;
  }

  function clear(stopSound = false) {
    clearTimeout(timer);
    packTimers.forEach(clearTimeout);
    packTimers = [];
    for (const pack of previewPacks) {
      pack.classList.remove('pack-strike');
    }
    previewPacks = [];
    layer.replaceChildren();
    layer.removeAttribute('data-rank');
    layer.removeAttribute('data-golden');
    layer.removeAttribute('data-finale');
    game.classList.remove('reveal-impact');
    game.classList.remove('reveal-finale');
    activeCard?.classList.remove('reveal-hit');
    activeCard = null;
    stopVoice();
    if (stopSound) {
      for (const source of playingNotes) source.stop();
      playingNotes.clear();
    }
  }

  function open() {
    clear();
    if (!sound()) return;
    const start = audio.currentTime + .012;
    note(120,start,.28,.17,'triangle',47);
    note(270,start,.18,.075,'triangle',760);
    note(820,start + .10,.16,.04,'sine',1450);
  }

  function packChime(rank, golden) {
    if (!sound()) return;
    const now = audio.currentTime + .01;
    if (rank === 1) {
      note(530,now,.10,.07,'triangle',320);
      return;
    }
    const root = [0,0,659,784,988][rank];
    note(root * 3.02,now,.105,.13,'triangle',root * 2.36);
    note(root,now,.22,.12,'triangle');
    if (rank >= 3) {
      note(root * 1.5,now + .037,.24,.10);
      note(root * 2,now + .064,.28,.10,'triangle');
    }
    if (rank === 4) {
      note(160,now,.24,.25,'sine',54);
      note(root * 2.52,now + .10,.42,.09);
    }
    if (golden) note(root * (rank === 2 ? 2 : 4),now + .08,.26,.08);
  }

  function scanPacks(packs) {
    previewPacks = packs;
    packs.forEach((pack,i) => {
      const hit = setTimeout(() => {
        pack.classList.add('pack-strike');
        packChime(Number(pack.dataset.hint),Object.hasOwn(pack.dataset,'goldenHint'));
      }, 370 + i * 165);
      const finish = setTimeout(() => pack.classList.remove('pack-strike'), 1120 + i * 165);
      packTimers.push(hit,finish);
    });
  }

  function reveal(card, rank, rarity, golden = false, {announceBest = false} = {}) {
    const spectacular = rank >= 3 && golden;
    const finale = rank === 4 && golden;
    clear();
    activeCard = card;
    const voiceDuration = play(rank,golden,announceBest);
    if (rank > 1) {
      const box = card.getBoundingClientRect();
      const x = box.left + box.width * .5;
      const y = box.top + box.height * .5;
      layer.dataset.rank = rank;
      if (spectacular) layer.dataset.golden = '';
      if (finale) layer.dataset.finale = '';
      const center = (rank === 4 || spectacular) && !reduceMotion.matches;
      layer.style.setProperty('--burst-x', center ? '50%' : Math.min(innerWidth - 16,Math.max(16,x)) + 'px');
      layer.style.setProperty('--burst-y', center ? '50%' : Math.min(innerHeight - 16,Math.max(16,y)) + 'px');
      const burst = document.createElement('div');
      burst.className = 'reveal-burst';
      const count = reduceMotion.matches ? 0 : finale ? 192 : spectacular ? 114 : [0,0,12,70,138][rank];
      for (let i = 0; i < count; i++) {
        const particle = document.createElement('i');
        const angle = i / count * 2 * Math.PI + Math.random() * .24;
        const distance = center ? (0.26 + Math.random() * .65) * Math.max(innerWidth,innerHeight) : (26 + Math.random() * 84) * (rank - 1);
        particle.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
        particle.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
        particle.style.setProperty('--turn', (i * 97 % 360) + 'deg');
        particle.style.setProperty('--size', 3 + Math.random() * rank * 2 + 'px');
        const delay = finale && i % 5 >= 3 ? 3.18 + (i % 5 - 3) * .23 : center ? .20 + i % 3 * .43 : .02 + i % 2 * (rank === 3 ? .26 : 0);
        particle.style.setProperty('--delay', (delay + Math.random() * .19) + 's');
        particle.style.setProperty('--spark', ['#fff4a9','#ffb457','#ff77cd','#fcfeff'][i % 4]);
        burst.append(particle);
      }
      layer.append(burst);
      if (center) {
        game.classList.add(finale ? 'reveal-finale' : 'reveal-impact');
        const flare = document.createElement('div');
        flare.className = 'reveal-flare';
        layer.append(flare);
        if (finale) {
          const shock = document.createElement('div');
          shock.className = 'reveal-last-wave';
          layer.append(shock);
        }
        const art = card.querySelector('img');
        if (art) {
          const featured = art.cloneNode();
          featured.src = art.currentSrc || art.src;
          featured.alt = '';
          featured.className = 'reveal-featured';
          featured.style.setProperty('--from-x', x - innerWidth / 2 + 'px');
          featured.style.setProperty('--from-y', y - innerHeight / 2 + 'px');
          featured.style.setProperty('--from-scale', Math.min(1,box.width / Math.min(innerWidth * .49,innerHeight * .44,330)));
          layer.append(featured);
        }
      }
      if (rank >= 3) {
        const callout = document.createElement('div');
        callout.className = 'reveal-callout';
        const label = document.createElement('small');
        label.textContent = rarity;
        const title = document.createElement('strong');
        title.textContent = golden ? (rank === 4 ? '와아아우!! 황금 전설 카드!!' : '오우! 황금 희귀 카드!!!') :
          rank === 4 ? '전설 카드!!!' : '희귀 카드!';
        callout.append(label,title);
        layer.append(callout);
      }
    }
    card.classList.add('reveal-hit');
    const effectDuration = finale ? 4900 : spectacular ? 3700 : [0,360,640,1950,3250][rank];
    const duration = Math.max(effectDuration,voiceDuration + 100);
    timer = setTimeout(clear,duration);
    return duration;
  }

  toggle.onclick = () => {
    muted = !muted;
    try { localStorage.setItem('pack-shop-muted',String(muted)); } catch {}
    updateSoundButton();
    if (master) master.gain.value = muted ? 0 : .72;
    if (muted) stopVoice();
    else play(1);
  };
  updateSoundButton();
  return {clear,open,reveal,scanPacks,unlockSound:sound};
})();
