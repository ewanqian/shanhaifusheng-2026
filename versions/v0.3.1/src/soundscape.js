export const MUSIC_STATES = ['quiet', 'stones', 'vault'];
export function musicForChapter(chapter) {
  return chapter === 2 ? 'stones' : chapter === 3 || chapter === 4 ? 'vault' : 'quiet';
}
// Linear interpolation between equal-power endpoints stays bounded even when
// a user rapidly changes chapters during an existing transition.
export function gainAt(from, to, progress) {
  const t = Math.max(0, Math.min(1, progress));
  return from.map((value, i) => value * (1 - t) + to[i] * t);
}
export class Soundscape {
  constructor() {
    this.buffers = [];
    this.voices = [];
    this.muted = false;
    this.error = null;
    this.target = null;
    this.ramp = { start: 0, duration: 0, from: [0,0,0], to: [0,0,0] };
  }
  unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : .3;
        this.master.connect(this.context.destination);
      }
      return this.context.resume().catch(error => { this.error = error.message; });
    } catch (error) { this.error = error.message; return Promise.resolve(); }
  }
  async load(progress = () => {}) {
    // Decoding does not require a live output context or a user gesture.
    const decoder = new OfflineAudioContext(2, 1, 24000);
    for (const [i, name] of MUSIC_STATES.entries()) {
      const response = await fetch(`./assets/audio/${name}.wav`);
      if (!response.ok) throw new Error(`Music ${name}: HTTP ${response.status}`);
      this.buffers[i] = await decoder.decodeAudioData(await response.arrayBuffer());
      progress(i + 1, MUSIC_STATES.length);
    }
  }
  start() {
    this.unlock();
    this.disposeVoices();
    this.target = null;
    this.ramp = { start: this.context?.currentTime || 0, duration: 0, from: [0,0,0], to: [0,0,0] };
    if (!this.context || this.buffers.length !== 3) return;
    const when = this.context.currentTime + .03;
    this.voices = this.buffers.map(buffer => {
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer; source.loop = true; gain.gain.value = 0;
      source.connect(gain).connect(this.master); source.start(when);
      return { source, gain };
    });
    this.setState('quiet', 3);
  }
  values(now = this.context?.currentTime || 0) {
    const r = this.ramp;
    return gainAt(r.from, r.to, r.duration ? (now - r.start) / r.duration : 1);
  }
  setState(name, duration = 4) {
    if (!this.context || this.target === name) return;
    this.target = name;
    this.ramp = { start: this.context.currentTime, duration, from: this.values(),
      to: MUSIC_STATES.map(state => state === name ? 1 : 0) };
  }
  tick() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.values(now).forEach((gain, i) => {
      // A short audio-clock ramp avoids XR-frame stepping. No DOM RAF dependency.
      this.voices[i]?.gain.gain.setTargetAtTime(gain, now, .04);
    });
  }
  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : .3, this.context.currentTime, .06);
  }
  fadeOut(duration = 4) { this.setState(null, duration); }
  disposeVoices() {
    for (const {source, gain} of this.voices) { source.stop(); source.disconnect(); gain.disconnect(); }
    this.voices = [];
  }
  stop() { this.disposeVoices(); this.target = null; }
  status() {
    return { loaded: this.buffers.length, state: this.target, muted: this.muted,
      context: this.context?.state || 'unopened', voices: this.voices.length, error: this.error,
      gains: this.values().map(v => Math.round(v * 1000) / 1000) };
  }
}
