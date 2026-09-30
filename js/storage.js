/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Persistent State & Storage Manager (localStorage with validation & export/import)
 */

import { CONFIG } from './config.js';

const STORAGE_KEY = 'knightmare_dungeoneer_save_v1';

const DEFAULT_STATE = {
  version: 1,
  gold: 0,
  rubies: 0,
  highScore: 0,
  runsAttempted: 0,
  totalPaces: 0,
  totalFoodEaten: 0,
  totalSpellsCast: 0,
  totalObstaclesCleared: 0,
  
  // Permanent Upgrades (upgrade ID -> current tier integer)
  upgrades: {
    HORNS_OF_RESILIENCE: 0,
    PLUME_OF_LEVITATION: 0,
    DUNSHELM_MASONRY: 0,
    ALCHEMISTS_SATCHEL: 0,
    ARMOR_OF_JUSTICE: 0,
    SECOND_WIND: 0,
    SPELL_AFFINITY: 0,
    SCAVENGERS_LORE: 0
  },
  
  // Accessibility & User Preferences
  settings: {
    highContrast: false,
    reducedMotion: false,
    dyslexicFont: false,
    captionsEnabled: true,
    soundVisualizer: true,
    gameSpeed: 1.0,         // 0.5, 0.75, 1.0, 1.25
    holdToRise: false,       // Single switch / hold to ascend
    practiceMode: false,     // Invincibility training mode
    masterVolume: 0.8,
    sfxVolume: 0.8,
    musicVolume: 0.5,
    treguardVoice: true,
    screenShake: true,
    customKeys: {
      flap: 'Space',
      spell: 'KeyE',
      pause: 'Escape'
    }
  }
};

export class StorageManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_STATE);
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      
      const parsed = JSON.parse(raw);
      // Merge with default in case new fields were added
      return {
        ...DEFAULT_STATE,
        ...parsed,
        upgrades: { ...DEFAULT_STATE.upgrades, ...(parsed.upgrades || {}) },
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) }
      };
    } catch (err) {
      console.warn('Failed to load save from localStorage; using defaults.', err);
      return structuredClone(DEFAULT_STATE);
    }
  }

  save() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, val) {
    this.data[key] = val;
    this.save();
  }

  getSetting(key) {
    return this.data.settings[key];
  }

  setSetting(key, val) {
    this.data.settings[key] = val;
    this.save();
  }

  getUpgradeTier(id) {
    return this.data.upgrades[id] || 0;
  }

  setUpgradeTier(id, tier) {
    this.data.upgrades[id] = tier;
    this.save();
  }

  addGold(amount) {
    this.data.gold = Math.max(0, (this.data.gold || 0) + Math.round(amount));
    this.save();
    return this.data.gold;
  }

  spendGold(amount) {
    if (this.data.gold >= amount) {
      this.data.gold -= amount;
      this.save();
      return true;
    }
    return false;
  }

  updateHighScore(score) {
    if (score > this.data.highScore) {
      this.data.highScore = score;
      this.save();
      return true;
    }
    return false;
  }

  incrementStat(key, amount = 1) {
    if (typeof this.data[key] === 'number') {
      this.data[key] += amount;
      this.save();
    }
  }

  exportDataJson() {
    return JSON.stringify(this.data, null, 2);
  }

  importDataJson(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid JSON format');
      this.data = {
        ...DEFAULT_STATE,
        ...parsed,
        upgrades: { ...DEFAULT_STATE.upgrades, ...(parsed.upgrades || {}) },
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) }
      };
      this.save();
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  }

  resetAll() {
    this.data = structuredClone(DEFAULT_STATE);
    this.save();
  }
}

export const storage = new StorageManager();
