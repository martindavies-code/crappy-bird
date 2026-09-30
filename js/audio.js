/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Pure Web Audio API Synthesizer & Accessibility Audio/Captions Dispatcher
 * Zero external audio dependencies - 100% offline-ready & instant loading.
 */

import { storage } from './storage.js';

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isMuted = false;
    this.isBgmPlaying = false;
    this.bgmOscillators = [];
    this.heartbeatInterval = null;
    this.speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  init() {
    if (this.ctx) return;
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(storage.getSetting('masterVolume') ?? 0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(storage.getSetting('sfxVolume') ?? 0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Gain
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(storage.getSetting('musicVolume') ?? 0.4, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio API not supported in this browser.', e);
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  onCaption(listener) {
    this.captionListeners.push(listener);
  }

  emitCaption(text, icon = '🔊', priority = 'normal') {
    for (const listener of this.captionListeners) {
      listener({ text, icon, priority, timestamp: Date.now() });
    }
  }

  setMasterVolume(val) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }

  setSfxVolume(val) {
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }

  // --- SOUND EFFECTS ---

  playFlap() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Wing flutter noise + gentle sine impulse
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);

    this.emitCaption('Wing flap flutter', '🪶', 'low');
  }

  playCoin() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const freqs = [1318.5, 1760.0]; // E6, A6 high golden bell chime
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.25, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.28);
    });

    this.emitCaption('Gold coin collected', '🪙');
  }

  playRuby() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const freqs = [880, 1108.7, 1318.5, 1760]; // Radiant chord
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.3, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.45);
    });

    this.emitCaption('Blood Ruby acquired!', '💎', 'high');
  }

  playEatFood(foodName = 'Rations') {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Upward pleasant harp bite
    const notes = [329.63, 392.00, 493.88, 659.25]; // E minor triad
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);

      gain.gain.setValueAtTime(0.28, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.3);
    });

    this.emitCaption(`Nourishment consumed: ${foodName}`, '🥧');
  }

  playBladeWhoosh() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Slicing metal pendulum blade sound
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.1);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.25);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);

    this.emitCaption('Blade whoosh!', '⚔️');
  }

  playSpellCast(spellName) {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Arcane burst with laser sweep and deep sub-boom
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(220, now + 0.35);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(120, now);
    osc2.frequency.exponentialRampToValueAtTime(45, now + 0.5);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);

    this.emitCaption(`Spell invoked: ${spellName}!`, '⚡', 'high');
  }

  playShieldDeflect() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Heavy iron clang
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.3);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.3);

    this.emitCaption('Armor of Justice absorbed impact!', '🛡️', 'high');
  }

  playShieldBreak() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Metal shattered
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(280, now);
    osc1.frequency.linearRampToValueAtTime(70, now + 0.4);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(390, now);
    osc2.frequency.linearRampToValueAtTime(80, now + 0.4);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);

    this.emitCaption('Armor of Justice shattered!', '💥', 'urgent');
  }

  playAmberWarning() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Knightmare iconic two-tone alert
    const freqs = [587.33, 493.88]; // D5, B4
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.3, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.22);
    });

    this.emitCaption('Warning: Life Force Amber!', '⚠️', 'urgent');
  }

  startRedHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.playHeartbeat();
    }, 750);
  }

  stopRedHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  playHeartbeat() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Double thump kick
    [0, 0.18].forEach(offset => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now + offset);
      osc.frequency.exponentialRampToValueAtTime(32, now + offset + 0.12);

      gain.gain.setValueAtTime(0.45, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });

    this.emitCaption('Life Force critical: Heartbeat pounding!', '❤️‍🔥', 'urgent');
  }

  playTreguardFanfare() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Triumphant retro brass fanfare chord: D minor / Royal cadence
    const notes = [
      { f: 293.66, t: 0, d: 0.18 }, // D4
      { f: 349.23, t: 0.14, d: 0.18 }, // F4
      { f: 440.00, t: 0.28, d: 0.22 }, // A4
      { f: 587.33, t: 0.44, d: 0.55 }  // D5
    ];

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      // Low pass to soften into brass
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now + n.t);

      gain.gain.setValueAtTime(0.28, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });

    this.emitCaption('Treguard Fanfare: "Enter, Stranger!"', '🎺', 'high');
  }

  playDeathGong() {
    this.stopRedHeartbeat();
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Deep funeral church bell / gong with metallic resonance
    const freqs = [110, 164.8, 220, 311.1]; // Low A minor resonance
    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 2.2);
    });

    this.emitCaption('Funeral Gong: Life Force Extinguished', '💀', 'urgent');
  }

  playRevive() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Celestial harp sweep upward
    const arpeggio = [220, 277.18, 329.63, 440, 554.37, 659.25, 880];
    arpeggio.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.3, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.4);
    });

    this.emitCaption("Treguard's Second Wind invokes! Revived!", '✨', 'urgent');
  }

  // --- PROCEDURAL MEDIEVAL DUNGEON SYNTH BGM ---

  startBgm() {
    if (this.isBgmPlaying) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    this.scheduleBgmLoop();
  }

  stopBgm() {
    this.isBgmPlaying = false;
    for (const osc of this.bgmOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    }
    this.bgmOscillators = [];
  }

  scheduleBgmLoop() {
    if (!this.isBgmPlaying || !this.ctx) return;

    const chords = [
      [146.83, 220.00, 261.63], // D minor: D3, A3, C4
      [130.81, 196.00, 261.63], // C major: C3, G3, C4
      [116.54, 174.61, 233.08], // Bb major: Bb2, F3, Bb3
      [110.00, 164.81, 220.00]  // A minor: A2, E3, A3
    ];

    let chordIndex = 0;
    const chordDuration = 3.6; // seconds per chord

    const playNextChord = () => {
      if (!this.isBgmPlaying || !this.ctx) return;

      const now = this.ctx.currentTime;
      const currentChord = chords[chordIndex % chords.length];
      chordIndex++;

      currentChord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.linearRampToValueAtTime(750, now + chordDuration * 0.5);
        filter.frequency.linearRampToValueAtTime(450, now + chordDuration);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.8);
        gain.gain.setValueAtTime(0.18, now + chordDuration - 0.8);
        gain.gain.linearRampToValueAtTime(0.001, now + chordDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + chordDuration);
        this.bgmOscillators.push(osc);
      });

      // Cleanup finished oscillators
      setTimeout(() => {
        this.bgmOscillators = this.bgmOscillators.slice(-12);
        if (this.isBgmPlaying) {
          playNextChord();
        }
      }, (chordDuration - 0.1) * 1000);
    };

    playNextChord();
  }

  // --- TREGUARD VOICE SPEECH SYNTHESIS (Optional Accessibility Voice) ---
  speakTreguard(phrase) {
    if (!storage.getSetting('treguardVoice')) return;
    if (this.speechAvailable && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.pitch = 0.85; // Regal, deep, theatrical
      utterance.rate = 0.95;
      utterance.volume = (storage.getSetting('masterVolume') ?? 0.8) * 0.9;
      
      // Try to choose an English UK voice for authentic British Knightmare vibe
      const voices = window.speechSynthesis.getVoices();
      const ukVoice = voices.find(v => v.lang.includes('en-GB') || v.name.includes('UK') || v.name.includes('British'));
      if (ukVoice) utterance.voice = ukVoice;

      window.speechSynthesis.speak(utterance);
    }
    this.emitCaption(`Treguard: "${phrase}"`, '🧙', 'normal');
  }
}

export const audio = new SoundSynthesizer();
