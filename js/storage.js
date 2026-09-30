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

function getSafeLocalStorage() {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage !== null) {
      const testKey = '__knightmare_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch (e) {
    // Access denied or quota exceeded (e.g. Safari private browsing or iframe)
    return null;
  }
  return null;
}

export class StorageManager {
  constructor() {
    this.storage = getSafeLocalStorage();
    this.memoryFallback = null;
    this.data = this.load();
  }

  load() {
    try {
      if (this.storage) {
        const raw = this.storage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return this.sanitizeState(parsed);
        }
      }
    } catch (err) {
      console.warn('Failed to load save from localStorage; using defaults.', err);
    }
    return structuredClone(DEFAULT_STATE);
  }

  sanitizeState(parsed) {
    if (typeof parsed !== 'object' || parsed === null) {
      return structuredClone(DEFAULT_STATE);
    }

    const cleanNumber = (val, fallback = 0) => {
      return (typeof val === 'number' && Number.isFinite(val) && val >= 0) ? Math.round(val) : fallback;
    };

    const cleanUpgrades = {};
    for (const k in DEFAULT_STATE.upgrades) {
      cleanUpgrades[k] = cleanNumber(parsed.upgrades?.[k], 0);
    }

    return {
      ...DEFAULT_STATE,
      ...parsed,
      gold: cleanNumber(parsed.gold, 0),
      rubies: cleanNumber(parsed.rubies, 0),
      highScore: cleanNumber(parsed.highScore, 0),
      runsAttempted: cleanNumber(parsed.runsAttempted, 0),
      totalPaces: cleanNumber(parsed.totalPaces, 0),
      totalFoodEaten: cleanNumber(parsed.totalFoodEaten, 0),
      totalSpellsCast: cleanNumber(parsed.totalSpellsCast, 0),
      totalObstaclesCleared: cleanNumber(parsed.totalObstaclesCleared, 0),
      upgrades: cleanUpgrades,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) }
    };
  }

  save() {
    try {
      if (this.storage) {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } else {
        this.memoryFallback = JSON.stringify(this.data);
      }
    } catch (err) {
      console.warn('Failed to write to localStorage (quota or privacy); using in-memory store.', err);
      this.memoryFallback = JSON.stringify(this.data);
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
    const cleanTier = (typeof tier === 'number' && Number.isFinite(tier) && tier >= 0) ? Math.round(tier) : 0;
    this.data.upgrades[id] = cleanTier;
    this.save();
  }

  addGold(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return this.data.gold;
    this.data.gold = Math.max(0, (this.data.gold || 0) + Math.round(amount));
    this.save();
    return this.data.gold;
  }

  spendGold(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const rounded = Math.round(amount);
    if (this.data.gold >= rounded) {
      this.data.gold -= rounded;
      this.save();
      return true;
    }
    return false;
  }

  updateHighScore(score) {
    if (Number.isFinite(score) && score > this.data.highScore) {
      this.data.highScore = Math.round(score);
      this.save();
      return true;
    }
    return false;
  }

  incrementStat(key, amount = 1) {
    if (typeof this.data[key] === 'number' && Number.isFinite(amount)) {
      this.data[key] += Math.round(amount);
      this.save();
    }
  }

  exportDataJson() {
    return JSON.stringify(this.data, null, 2);
  }

  importDataJson(jsonStr) {
    try {
      if (typeof jsonStr !== 'string' || !jsonStr.trim()) return false;
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed !== 'object' || parsed === null) return false;
      this.data = this.sanitizeState(parsed);
      this.save();
      return true;
    } catch (err) {
      return false;
    }
  }

  resetAll() {
    this.data = structuredClone(DEFAULT_STATE);
    this.save();
  }
}

export const storage = new StorageManager();

