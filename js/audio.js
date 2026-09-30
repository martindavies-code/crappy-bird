/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Pure Web Audio API Synthesizer & Accessibility Audio/Captions Dispatcher
 * Zero external audio dependencies - 100% offline-ready, leak-free & instant loading.
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
    this.bgmTimeout = null;
    this.heartbeatInterval = null;
    this.captionListeners = [];
    this.speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this.isUnlocked = false;
    this.coinStreak = 0;
    this.lastCoinTime = 0;

    this.setupAutoUnlock();
  }

  setupAutoUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (this.isUnlocked) return;
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'running') {
        this.isUnlocked = true;
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
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
      const masterVol = Number.isFinite(storage.getSetting('masterVolume')) ? storage.getSetting('masterVolume') : 0.8;
      this.masterGain.gain.setValueAtTime(masterVol, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      const sfxVol = Number.isFinite(storage.getSetting('sfxVolume')) ? storage.getSetting('sfxVolume') : 0.8;
      this.sfxGain.gain.setValueAtTime(sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Gain
      this.musicGain = this.ctx.createGain();
      const musicVol = Number.isFinite(storage.getSetting('musicVolume')) ? storage.getSetting('musicVolume') : 0.4;
      this.musicGain.gain.setValueAtTime(musicVol, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio API not supported in this browser.', e);
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  onCaption(listener) {
    if (typeof listener === 'function') {
      this.captionListeners.push(listener);
    }
  }

  offCaption(listener) {
    this.captionListeners = this.captionListeners.filter(l => l !== listener);
  }

  emitCaption(text, icon = '🔊', priority = 'normal') {
    const payload = { text, icon, priority, timestamp: Date.now() };
    for (const listener of this.captionListeners.slice()) {
      try {
        listener(payload);
      } catch (err) {
        console.error('Caption listener error:', err);
      }
    }
  }

  setMasterVolume(val) {
    if (this.masterGain && this.ctx && Number.isFinite(val)) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }

  setSfxVolume(val) {
    if (this.sfxGain && this.ctx && Number.isFinite(val)) {
      this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    if (this.musicGain && this.ctx && Number.isFinite(val)) {
      this.musicGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }

  registerCleanup(osc, ...nodes) {
    if (!osc) return;
    osc.onended = () => {
      try {
        osc.disconnect();
        for (const n of nodes) {
          if (n && typeof n.disconnect === 'function') n.disconnect();
        }
      } catch (e) {}
    };
  }

  // --- SOUND EFFECTS ---

  playFlap(helmetSkin = 'JUSTICE') {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    this.registerCleanup(osc, gain);
    osc.start(now);
    osc.stop(now + 0.12);

    // Motley's Jester Cap Jingle Bell Bonus
    if (helmetSkin === 'JESTER') {
      [2093, 2637, 3136].forEach((f, i) => {
        const bell = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();
        bell.type = 'sine';
        bell.frequency.setValueAtTime(f, now + i * 0.02);
        bellGain.gain.setValueAtTime(0.12, now + i * 0.02);
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.02 + 0.15);
        bell.connect(bellGain);
        bellGain.connect(this.sfxGain);
        this.registerCleanup(bell, bellGain);
        bell.start(now + i * 0.02);
        bell.stop(now + i * 0.02 + 0.15);
      });
    }

    this.emitCaption('Wing flap flutter', '🪶', 'low');
  }

  playCoin() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const realNow = performance.now();

    // Pentatonic scale escalation on fast consecutive coins (Pure arcade dopamine!)
    if (realNow - this.lastCoinTime < 1300) {
      this.coinStreak = Math.min(this.coinStreak + 1, 8);
    } else {
      this.coinStreak = 0;
    }
    this.lastCoinTime = realNow;

    const scale = [987.77, 1174.66, 1318.51, 1567.98, 1760.00, 2093.00, 2349.32, 2637.02];
    const baseFreq = scale[this.coinStreak % scale.length];

    [baseFreq, baseFreq * 1.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.24, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.26);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      this.registerCleanup(osc, gain);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.26);
    });

    const caption = this.coinStreak > 3 ? `Gold Coin Streak! (${this.coinStreak}x)` : 'Gold coin collected';
    this.emitCaption(caption, '🪙');
  }

  playNearMiss() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Razor blade resonance swish
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.16);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(8, now);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    this.registerCleanup(osc, filter, gain);
    osc.start(now);
    osc.stop(now + 0.18);

    // High sparkling resonance ping
    const ping = this.ctx.createOscillator();
    const pingGain = this.ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(2489, now + 0.02);
    pingGain.gain.setValueAtTime(0.25, now + 0.02);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    ping.connect(pingGain);
    pingGain.connect(this.sfxGain);
    this.registerCleanup(ping, pingGain);
    ping.start(now + 0.02);
    ping.stop(now + 0.22);

    this.emitCaption('CLOSE SHAVE! Adrenaline surge!', '⚡', 'high');
  }

  playPowerup(name = 'Arcane Boon') {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.28, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      this.registerCleanup(osc, gain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.4);
    });

    this.emitCaption(`Power-Up Invoked: ${name}!`, '✨', 'high');
  }

  playChestOpen() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Latch click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.registerCleanup(osc, gain);
    osc.start(now);
    osc.stop(now + 0.05);

    // Mystery chime
    this.playPowerup('Mystery Treasure Chest');
  }

  playMidasShatter() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [1760, 2200, 2640, 3100].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + Math.random() * 80, now + idx * 0.03);
      gain.gain.setValueAtTime(0.3, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      this.registerCleanup(osc, gain);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.35);
    });

    this.emitCaption('Midas Gold Portcullis Shattered into coins!', '👑');
  }

  playAdvisorCallout() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [440, 880].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.15, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      this.registerCleanup(osc, gain);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.1);
    });
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

      this.registerCleanup(osc, gain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.45);
    });

    this.emitCaption('Blood Ruby acquired!', '💎', 'high');
  }

  playEatFood(foodName = 'Rations') {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

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

      this.registerCleanup(osc, gain);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.3);
    });

    this.emitCaption(`Nourishment consumed: ${foodName}`, '🥧');
  }

  playBladeWhoosh() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

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

    this.registerCleanup(osc, filter, gain);
    osc.start(now);
    osc.stop(now + 0.25);

    this.emitCaption('Blade whoosh!', '⚔️');
  }

  playSpellCast(spellName) {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

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

    this.registerCleanup(osc1, gain);
    this.registerCleanup(osc2);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);

    this.emitCaption(`Spell invoked: ${spellName}!`, '⚡', 'high');
  }

  playSpellCooldownFizzle() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.Q.setValueAtTime(6, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    this.registerCleanup(osc, filter, gain);
    osc.start(now);
    osc.stop(now + 0.15);

    this.emitCaption('Spell recharging: Not ready yet!', '⏳', 'low');
  }

  playShieldDeflect() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.3);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    this.registerCleanup(osc, gain);
    osc.start(now);
    osc.stop(now + 0.3);

    this.emitCaption('Armor of Justice absorbed impact!', '🛡️', 'high');
  }

  playShieldBreak() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

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

    this.registerCleanup(osc1, gain);
    this.registerCleanup(osc2);
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

      this.registerCleanup(osc, gain);
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

      this.registerCleanup(osc, gain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });

    this.emitCaption('Life Force critical: Heartbeat pounding!', '❤️‍🔥', 'urgent');
  }

  playTreguardFanfare() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

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

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now + n.t);

      gain.gain.setValueAtTime(0.28, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      this.registerCleanup(osc, filter, gain);
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

      this.registerCleanup(osc, gain);
      osc.start(now);
      osc.stop(now + 2.2);
    });

    this.emitCaption('Funeral Gong: Life Force Extinguished', '💀', 'urgent');
  }

  playRevive() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

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

      this.registerCleanup(osc, gain);
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
    if (this.bgmTimeout) {
      clearTimeout(this.bgmTimeout);
      this.bgmTimeout = null;
    }
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

    const progression = [
      {
        chord: [146.83, 220.00, 261.63], // D minor
        bass: [73.42, 110.00, 146.83, 110.00, 130.81, 146.83, 110.00, 146.83]
      },
      {
        chord: [130.81, 196.00, 261.63], // C major
        bass: [65.41, 98.00, 130.81, 98.00, 116.54, 130.81, 98.00, 130.81]
      },
      {
        chord: [116.54, 174.61, 233.08], // Bb major
        bass: [58.27, 87.31, 116.54, 87.31, 103.83, 116.54, 87.31, 116.54]
      },
      {
        chord: [110.00, 164.81, 220.00], // A minor
        bass: [55.00, 82.41, 110.00, 82.41, 98.00, 110.00, 123.47, 146.83]
      }
    ];

    let chordIndex = 0;
    const chordDuration = 3.2; // seconds per chord measure

    const playNextChord = () => {
      if (!this.isBgmPlaying || !this.ctx) return;

      const now = this.ctx.currentTime;
      const current = progression[chordIndex % progression.length];
      chordIndex++;

      // 1. Lush Gothic Pad Chord
      current.chord.forEach(freq => {
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
        gain.gain.linearRampToValueAtTime(0.14, now + 0.6);
        gain.gain.setValueAtTime(0.14, now + chordDuration - 0.6);
        gain.gain.linearRampToValueAtTime(0.001, now + chordDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        this.registerCleanup(osc, filter, gain);
        osc.start(now);
        osc.stop(now + chordDuration);
        this.bgmOscillators.push(osc);
      });

      // 2. Energetic 8-note Chiptune Dungeon Bass Arpeggio
      const noteStep = chordDuration / current.bass.length;
      current.bass.forEach((bFreq, bIdx) => {
        const bNow = now + bIdx * noteStep;
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(bFreq, bNow);

        const bFilter = this.ctx.createBiquadFilter();
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(320, bNow);

        bGain.gain.setValueAtTime(0.12, bNow);
        bGain.gain.exponentialRampToValueAtTime(0.001, bNow + noteStep * 0.85);

        bOsc.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(this.musicGain);

        this.registerCleanup(bOsc, bFilter, bGain);
        bOsc.start(bNow);
        bOsc.stop(bNow + noteStep * 0.85);
        this.bgmOscillators.push(bOsc);
      });

      // Cleanup finished oscillators and schedule next chord
      this.bgmTimeout = setTimeout(() => {
        this.bgmOscillators = this.bgmOscillators.slice(-16);
        if (this.isBgmPlaying) {
          playNextChord();
        }
      }, (chordDuration - 0.08) * 1000);
    };

    playNextChord();
  }

  // --- TREGUARD VOICE SPEECH SYNTHESIS (Optional Accessibility Voice) ---
  speakTreguard(phrase) {
    if (!storage.getSetting('treguardVoice')) return;
    if (this.speechAvailable && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.pitch = 0.85; // Regal, deep, theatrical
        utterance.rate = 0.95;
        const masterVol = Number.isFinite(storage.getSetting('masterVolume')) ? storage.getSetting('masterVolume') : 0.8;
        utterance.volume = masterVol * 0.9;
        
        // Try to choose an English UK voice for authentic British Knightmare vibe
        const voices = window.speechSynthesis.getVoices();
        const ukVoice = voices.find(v => v.lang.includes('en-GB') || v.name.includes('UK') || v.name.includes('British'));
        if (ukVoice) utterance.voice = ukVoice;

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
      }
    }
    this.emitCaption(`Treguard: "${phrase}"`, '🧙', 'normal');
  }
}

export const audio = new SoundSynthesizer();
