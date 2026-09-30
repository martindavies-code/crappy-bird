/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Roguelite ("Gongueslike") Meta-Progression & Sanctuary Manager
 */

import { CONFIG } from './config.js';
import { storage } from './storage.js';
import { audio } from './audio.js';

export const IN_RUN_RELICS = {
  MERLINS_FEATHER: {
    id: 'MERLINS_FEATHER',
    name: "Merlin's Feather",
    description: 'Grants a gentle glide on every flap, reducing downward speed.',
    icon: '🪶'
  },
  SMIRKYS_AMULET: {
    id: 'SMIRKYS_AMULET',
    name: "Smirky's Lucky Charm",
    description: 'Gold coins and rubies are magnetically drawn towards the dungeoneer.',
    icon: '🧲'
  },
  GWENS_CHALICE: {
    id: 'GWENS_CHALICE',
    name: "Gwen's Golden Chalice",
    description: 'Life force drains 25% slower while traveling.',
    icon: '🏆'
  },
  CHRONO_HOURGLASS: {
    id: 'CHRONO_HOURGLASS',
    name: 'Hourglass of Dunshelm',
    description: 'Spells recharge 35% faster throughout this run.',
    icon: '⏳'
  }
};

export class UpgradeManager {
  constructor() {
    this.activeRunRelics = new Set();
  }

  // --- STAT CALCULATIONS FROM PERMANENT SANCTUARY UPGRADES ---

  getMaxLifeForce() {
    const tier = storage.getUpgradeTier('HORNS_OF_RESILIENCE');
    const bonus = tier * CONFIG.UPGRADES.HORNS_OF_RESILIENCE.perTierValue;
    return Math.round(CONFIG.BASE_MAX_LIFE_FORCE * (1 + bonus));
  }

  getGravityMultiplier() {
    const tier = storage.getUpgradeTier('PLUME_OF_LEVITATION');
    const reduction = tier * CONFIG.UPGRADES.PLUME_OF_LEVITATION.perTierValue;
    return Math.max(0.55, 1 - reduction);
  }

  getGapBonus() {
    const tier = storage.getUpgradeTier('DUNSHELM_MASONRY');
    return tier * CONFIG.UPGRADES.DUNSHELM_MASONRY.perTierValue;
  }

  getGoldMultiplier() {
    const tier = storage.getUpgradeTier('ALCHEMISTS_SATCHEL');
    return 1 + (tier * CONFIG.UPGRADES.ALCHEMISTS_SATCHEL.perTierValue);
  }

  getStartingShields() {
    const tier = storage.getUpgradeTier('ARMOR_OF_JUSTICE');
    return tier; // 0, 1, 2, or 3 shields
  }

  hasSecondWind() {
    const tier = storage.getUpgradeTier('SECOND_WIND');
    return tier > 0;
  }

  getSpellCooldownMultiplier() {
    const tier = storage.getUpgradeTier('SPELL_AFFINITY');
    let mod = 1 - (tier * CONFIG.UPGRADES.SPELL_AFFINITY.perTierValue);
    if (this.activeRunRelics.has('CHRONO_HOURGLASS')) {
      mod *= 0.65;
    }
    return Math.max(0.4, mod);
  }

  getSpellDurationMultiplier() {
    const tier = storage.getUpgradeTier('SPELL_AFFINITY');
    return 1 + (tier * 0.15);
  }

  getFoodNutritionMultiplier() {
    const tier = storage.getUpgradeTier('SCAVENGERS_LORE');
    return 1 + (tier * CONFIG.UPGRADES.SCAVENGERS_LORE.perTierValue);
  }

  getLifeForceDecayMultiplier() {
    let mult = 1.0;
    if (this.activeRunRelics.has('GWENS_CHALICE')) {
      mult *= 0.75;
    }
    return mult;
  }

  // --- SANCTUARY PURCHASE ACTIONS ---

  getUpgradeInfo(id) {
    const def = CONFIG.UPGRADES[id];
    if (!def) return null;
    const currentTier = storage.getUpgradeTier(id);
    const isMax = currentTier >= def.maxTier;
    const nextCost = isMax ? null : def.costs[currentTier];

    return {
      ...def,
      currentTier,
      isMax,
      nextCost
    };
  }

  canAfford(id) {
    const info = this.getUpgradeInfo(id);
    if (!info || info.isMax) return false;
    return storage.get('gold') >= info.nextCost;
  }

  purchase(id) {
    const info = this.getUpgradeInfo(id);
    if (!info || info.isMax) return { success: false, reason: 'Already at maximum tier' };

    if (storage.spendGold(info.nextCost)) {
      const newTier = info.currentTier + 1;
      storage.setUpgradeTier(id, newTier);
      audio.playRuby();
      return { success: true, newTier, remainingGold: storage.get('gold') };
    }

    return { success: false, reason: 'Insufficient Dunshelm Gold' };
  }

  // --- IN-RUN RELICS ---

  resetRunRelics() {
    this.activeRunRelics.clear();
  }

  addRunRelic(relicId) {
    if (IN_RUN_RELICS[relicId]) {
      this.activeRunRelics.add(relicId);
      audio.playRuby();
      return IN_RUN_RELICS[relicId];
    }
    return null;
  }

  hasRelic(relicId) {
    return this.activeRunRelics.has(relicId);
  }

  getActiveRelicsList() {
    return Array.from(this.activeRunRelics).map(id => IN_RUN_RELICS[id]);
  }
}

export const upgrades = new UpgradeManager();
