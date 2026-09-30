/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Automated Test Suite (Node.js test runner)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../js/config.js';
import { StorageManager } from '../js/storage.js';
import { UpgradeManager, IN_RUN_RELICS } from '../js/upgrades.js';
import { LifeForceClock, LIFE_STAGE } from '../js/lifeforce.js';
import { Dungeoneer, Obstacle, Collectible, ParticleSystem } from '../js/entities.js';

// --- SUITE 1: CONFIGURATION & LORE INTEGRITY ---
test('CONFIG: Constants & Knightmare Game Rules Integrity', () => {
  assert.equal(CONFIG.CANVAS_WIDTH, 960);
  assert.equal(CONFIG.CANVAS_HEIGHT, 640);
  assert.equal(CONFIG.BASE_MAX_LIFE_FORCE, 100);

  // Spells defined
  const spellKeys = Object.keys(CONFIG.SPELLS);
  assert.ok(spellKeys.includes('DISMISS'));
  assert.ok(spellKeys.includes('EYESHIELD'));
  assert.ok(spellKeys.includes('ANVIL'));
  assert.ok(spellKeys.includes('LEVITATE'));
  assert.equal(CONFIG.SPELLS.DISMISS.incantation, 'D-I-S-M-I-S-S');

  // 8 Sanctuary Upgrades
  const upgradeKeys = Object.keys(CONFIG.UPGRADES);
  assert.equal(upgradeKeys.length, 8);
  assert.ok(upgradeKeys.includes('HORNS_OF_RESILIENCE'));
  assert.ok(upgradeKeys.includes('PLUME_OF_LEVITATION'));
  assert.ok(upgradeKeys.includes('DUNSHELM_MASONRY'));
  assert.ok(upgradeKeys.includes('ALCHEMISTS_SATCHEL'));
  assert.ok(upgradeKeys.includes('ARMOR_OF_JUSTICE'));
  assert.ok(upgradeKeys.includes('SECOND_WIND'));
  assert.ok(upgradeKeys.includes('SPELL_AFFINITY'));
  assert.ok(upgradeKeys.includes('SCAVENGERS_LORE'));

  // Chambers
  assert.equal(CONFIG.CHAMBERS.length, 4);
  assert.equal(CONFIG.CHAMBERS[0].id, 'catacombs');
  assert.equal(CONFIG.CHAMBERS[1].id, 'blades');
});

// --- SUITE 2: STORAGE & PERSISTENCE ---
test('StorageManager: Gold, Upgrades, High Scores & JSON Export/Import', () => {
  const sm = new StorageManager();

  // Test gold transactions
  sm.set('gold', 100);
  assert.equal(sm.get('gold'), 100);
  sm.addGold(50);
  assert.equal(sm.get('gold'), 150);
  
  const spent = sm.spendGold(120);
  assert.equal(spent, true);
  assert.equal(sm.get('gold'), 30);

  const overspend = sm.spendGold(500);
  assert.equal(overspend, false);
  assert.equal(sm.get('gold'), 30);

  // Test high scores
  sm.set('highScore', 200);
  assert.equal(sm.updateHighScore(150), false);
  assert.equal(sm.updateHighScore(350), true);
  assert.equal(sm.get('highScore'), 350);

  // Test upgrade tier setting
  sm.setUpgradeTier('HORNS_OF_RESILIENCE', 3);
  assert.equal(sm.getUpgradeTier('HORNS_OF_RESILIENCE'), 3);

  // Test export & import
  const exported = sm.exportDataJson();
  assert.ok(exported.includes('"highScore": 350'));

  const clone = new StorageManager();
  const imported = clone.importDataJson(exported);
  assert.equal(imported, true);
  assert.equal(clone.get('highScore'), 350);
  assert.equal(clone.getUpgradeTier('HORNS_OF_RESILIENCE'), 3);
});

// --- SUITE 3: ROGUELITE UPGRADE MANAGER ---
test('UpgradeManager: Meta-Progression Math & Relic Modifiers', () => {
  const um = new UpgradeManager();
  
  // Base calculations
  assert.equal(um.getMaxLifeForce(), 100);
  assert.equal(um.getStartingShields(), 0);
  assert.equal(um.hasSecondWind(), false);
  assert.equal(um.getGapBonus(), 0);

  // Relics
  um.resetRunRelics();
  assert.equal(um.hasRelic('SMIRKYS_AMULET'), false);
  um.addRunRelic('SMIRKYS_AMULET');
  assert.equal(um.hasRelic('SMIRKYS_AMULET'), true);
  assert.equal(um.getActiveRelicsList().length, 1);

  // Gwen's Chalice decay reduction
  assert.equal(um.getLifeForceDecayMultiplier(), 1.0);
  um.addRunRelic('GWENS_CHALICE');
  assert.equal(um.getLifeForceDecayMultiplier(), 0.75);

  // Chrono Hourglass spell cooldown reduction
  const normalCd = um.getSpellCooldownMultiplier();
  um.addRunRelic('CHRONO_HOURGLASS');
  const reducedCd = um.getSpellCooldownMultiplier();
  assert.ok(reducedCd < normalCd);
});

// --- SUITE 4: LIFE FORCE CLOCK & DECAY ---
test('LifeForceClock: Degrading Face Stages, Feeding, and Death', () => {
  const clock = new LifeForceClock(null); // Headless without canvas
  clock.reset(100);

  assert.equal(clock.current, 100);
  assert.equal(clock.stage, LIFE_STAGE.GREEN);
  assert.equal(clock.isDead(), false);

  // Tick down to Amber
  clock.current = 50;
  clock.update(0);
  assert.equal(clock.stage, LIFE_STAGE.AMBER);
  assert.equal(clock.getStageDescription().label, 'Amber Guard');

  // Tick down to Red
  clock.current = 20;
  clock.update(0);
  assert.equal(clock.stage, LIFE_STAGE.RED);
  assert.equal(clock.getStageDescription().label, 'Red Menace');

  // Feed dungeoneer
  clock.feed(35);
  clock.update(0);
  assert.equal(clock.current, 55);
  assert.equal(clock.stage, LIFE_STAGE.AMBER);

  // Damage to 0 (Skull)
  clock.damage(60);
  clock.update(0);
  assert.equal(clock.current, 0);
  assert.equal(clock.stage, LIFE_STAGE.SKULL);
  assert.equal(clock.isDead(), true);
  assert.equal(clock.getStageDescription().label, 'Skull of Doom');
});

// --- SUITE 5: DUNGEONEER ENTITY & SPELLCASTING ---
test('Dungeoneer: Physics, Flap Impulse, Shield Absorption, and Spells', () => {
  const player = new Dungeoneer(180, 300);
  player.reset();

  assert.equal(player.x, 180);
  assert.equal(player.y, 300);
  assert.equal(player.vy, 0);

  // Flap impulse
  player.flap();
  assert.equal(player.vy, CONFIG.BASE_FLAP_IMPULSE);

  // Update with gravity
  player.update(0.1, CONFIG.BASE_GRAVITY, CONFIG.MAX_FALL_SPEED, CONFIG.CANVAS_HEIGHT);
  assert.ok(player.y < 300); // Flew upward
  assert.ok(player.vy > CONFIG.BASE_FLAP_IMPULSE); // Gravity acted downwards

  // Shield absorption
  player.shields = 2;
  const hit1 = player.absorbHit();
  assert.equal(hit1, true);
  assert.equal(player.shields, 1);
  assert.ok(player.invulnerableTimer > 0);

  // Spell Casting
  assert.equal(player.canCastSpell('DISMISS'), true);
  const cast = player.castSpell('DISMISS');
  assert.equal(cast, true);
  assert.equal(player.activeSpell, 'DISMISS');
  assert.ok(player.spellCooldowns.DISMISS > 0);
  assert.equal(player.canCastSpell('DISMISS'), false); // On cooldown
});

// --- SUITE 6: OBSTACLE MECHANICS & COLLISIONS ---
test('Obstacle: Passage Gaps, Moving Pendulums, and Hitbox Tolerance', () => {
  const chamber = CONFIG.CHAMBERS[0];
  const obs = new Obstacle(400, chamber, 20);

  assert.equal(obs.x, 400);
  assert.equal(obs.gapHeight, chamber.gapBase + 20);
  assert.equal(obs.isDismissed, false);

  // Place player right in the open gap -> no collision
  const playerInGap = new Dungeoneer(obs.x + obs.width / 2, obs.gapCenterY);
  assert.equal(obs.collidesWith(playerInGap, 0), false);

  // Place player inside top obstacle column -> collision
  const playerInSpike = new Dungeoneer(obs.x + obs.width / 2, obs.gapCenterY - obs.gapHeight / 2 - 30);
  assert.equal(obs.collidesWith(playerInSpike, 0), true);

  // Dismiss obstacle with spell -> collision ignored
  obs.dismiss();
  assert.equal(obs.isDismissed, true);
  assert.equal(obs.collidesWith(playerInSpike, 0), false);
});

// --- SUITE 7: COLLECTIBLES & PARTICLE SYSTEM ---
test('Collectibles & Particles: Spawns and Lifetime Decays', () => {
  const appleItem = new Collectible(200, 250, 'FOOD', CONFIG.FOOD_TYPES.APPLE);
  assert.equal(appleItem.type, 'FOOD');
  assert.equal(appleItem.collected, false);

  const player = new Dungeoneer(200, 250);
  assert.equal(appleItem.collidesWith(player), true);

  // Particle System
  const ps = new ParticleSystem();
  assert.equal(ps.particles.length, 0);

  ps.emitFlapFeathers(100, 100);
  assert.ok(ps.particles.length > 0);

  const countBefore = ps.particles.length;
  ps.update(0.1);
  assert.ok(ps.particles[0].life < 1.0); // Aging

  ps.update(5.0); // Fully age out
  assert.equal(ps.particles.length, 0); // All cleaned up
});
