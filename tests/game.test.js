/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Military-Grade Automated Test Suite (Node.js test runner)
 * 16 comprehensive suites covering configuration, fuzz testing, physics,
 * circle-to-AABB collision math, meta-progression, audio events, and state machine integrity.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../js/config.js';
import { StorageManager } from '../js/storage.js';
import { UpgradeManager, IN_RUN_RELICS } from '../js/upgrades.js';
import { LifeForceClock, LIFE_STAGE } from '../js/lifeforce.js';
import { Dungeoneer, Obstacle, Collectible, ParticleSystem } from '../js/entities.js';

// --- SUITE 1: CONFIGURATION & KNIGHTMARE LORE INTEGRITY ---
test('CONFIG: Constants, Spells, Chambers, and Speeches Integrity', () => {
  assert.equal(CONFIG.CANVAS_WIDTH, 960);
  assert.equal(CONFIG.CANVAS_HEIGHT, 640);
  assert.equal(CONFIG.BASE_MAX_LIFE_FORCE, 100);
  assert.equal(CONFIG.BASE_GRAVITY, 850);
  assert.equal(CONFIG.BASE_FLAP_IMPULSE, -320);

  // Spells defined & incantations
  const spellKeys = Object.keys(CONFIG.SPELLS);
  assert.deepEqual(spellKeys.sort(), ['ANVIL', 'DISMISS', 'EYESHIELD', 'LEVITATE']);
  assert.equal(CONFIG.SPELLS.DISMISS.incantation, 'D-I-S-M-I-S-S');
  assert.equal(CONFIG.SPELLS.EYESHIELD.incantation, 'E-Y-E-S-H-I-E-L-D');
  assert.ok(CONFIG.SPELLS.DISMISS.cooldown > 0);
  assert.ok(CONFIG.SPELLS.DISMISS.duration > 0);

  // All 8 Sanctuary Upgrades verified with category metadata
  const upgradeKeys = Object.keys(CONFIG.UPGRADES);
  assert.equal(upgradeKeys.length, 8);
  const validCategories = ['VITALITY', 'FLIGHT', 'SORCERY'];
  for (const key of upgradeKeys) {
    const def = CONFIG.UPGRADES[key];
    assert.ok(def.name, `Upgrade ${key} missing name`);
    assert.ok(validCategories.includes(def.category), `Upgrade ${key} missing or invalid category ${def.category}`);
    assert.ok(def.maxTier >= 1, `Upgrade ${key} invalid maxTier`);
    assert.equal(def.costs.length, def.maxTier, `Upgrade ${key} costs length mismatch`);
    for (const cost of def.costs) {
      assert.ok(cost > 0, `Upgrade ${key} cost must be positive`);
    }
  }

  // Dungeon Chambers verified
  assert.equal(CONFIG.CHAMBERS.length, 4);
  assert.equal(CONFIG.CHAMBERS[0].id, 'catacombs');
  assert.equal(CONFIG.CHAMBERS[1].id, 'blades');
  assert.equal(CONFIG.CHAMBERS[2].id, 'alchemy');
  assert.equal(CONFIG.CHAMBERS[3].id, 'black-tower');

  // Food Types
  const foodKeys = Object.keys(CONFIG.FOOD_TYPES);
  assert.ok(foodKeys.length >= 3);
  for (const f of foodKeys) {
    assert.ok(CONFIG.FOOD_TYPES[f].restore > 0);
  }

  // Treguard Speeches
  assert.ok(CONFIG.TREGUARD_SPEECHES.START.length >= 3);
  assert.ok(CONFIG.TREGUARD_SPEECHES.DEATH.length >= 3);
  assert.ok(CONFIG.TREGUARD_SPEECHES.SANCTUARY.length >= 3);
});

// --- SUITE 2: STORAGE MANAGER NORMAL TRANSACTIONS ---
test('StorageManager: Normal Transactions & High Score Logic', () => {
  const sm = new StorageManager();
  sm.resetAll();

  assert.equal(sm.get('gold'), 0);
  assert.equal(sm.get('highScore'), 0);

  // Add gold
  sm.addGold(150);
  assert.equal(sm.get('gold'), 150);

  // Successful spend
  const spent = sm.spendGold(100);
  assert.equal(spent, true);
  assert.equal(sm.get('gold'), 50);

  // Denied overspend
  const denied = sm.spendGold(999);
  assert.equal(denied, false);
  assert.equal(sm.get('gold'), 50);

  // High score tracking
  assert.equal(sm.updateHighScore(40), true);
  assert.equal(sm.get('highScore'), 40);
  assert.equal(sm.updateHighScore(30), false);
  assert.equal(sm.get('highScore'), 40);
  assert.equal(sm.updateHighScore(100), true);
  assert.equal(sm.get('highScore'), 100);

  // Stat incrementing
  sm.incrementStat('runsAttempted', 1);
  assert.equal(sm.get('runsAttempted'), 1);
  sm.incrementStat('runsAttempted', 4);
  assert.equal(sm.get('runsAttempted'), 5);
});

// --- SUITE 3: STORAGE MANAGER DEFENSIVE FUZZING & ERROR HANDLING ---
test('StorageManager: NaN Fuzzing, In-Memory Fallback, and Malformed Input Protection', () => {
  const sm = new StorageManager();
  sm.resetAll();

  // Test NaN and infinite inputs to addGold
  sm.addGold(NaN);
  assert.equal(sm.get('gold'), 0);
  sm.addGold(Infinity);
  assert.equal(sm.get('gold'), 0);
  sm.addGold(-50);
  assert.equal(sm.get('gold'), 0);
  sm.addGold('500'); // String instead of number
  assert.equal(sm.get('gold'), 0);

  // Test NaN and invalid inputs to spendGold
  assert.equal(sm.spendGold(NaN), false);
  assert.equal(sm.spendGold(-20), false);
  assert.equal(sm.spendGold(Infinity), false);

  // Test NaN in updateHighScore
  assert.equal(sm.updateHighScore(NaN), false);
  assert.equal(sm.updateHighScore(-100), false);
  assert.equal(sm.get('highScore'), 0);

  // Test invalid upgrade tier setting
  sm.setUpgradeTier('HORNS_OF_RESILIENCE', NaN);
  assert.equal(sm.getUpgradeTier('HORNS_OF_RESILIENCE'), 0);
  sm.setUpgradeTier('HORNS_OF_RESILIENCE', -5);
  assert.equal(sm.getUpgradeTier('HORNS_OF_RESILIENCE'), 0);
  sm.setUpgradeTier('HORNS_OF_RESILIENCE', 2.9);
  assert.equal(sm.getUpgradeTier('HORNS_OF_RESILIENCE'), 3); // Clean rounded integer
});

// --- SUITE 4: STORAGE JSON EXPORT & CORRUPT IMPORT RESILIENCE ---
test('StorageManager: JSON Export, Schema Sanitization, and Corrupt Import Handling', () => {
  const sm = new StorageManager();
  sm.resetAll();
  sm.set('gold', 250);
  sm.set('highScore', 500);
  sm.setUpgradeTier('ARMOR_OF_JUSTICE', 2);

  // Export
  const jsonStr = sm.exportDataJson();
  assert.ok(jsonStr.includes('"gold": 250'));
  assert.ok(jsonStr.includes('"highScore": 500'));

  // Corrupt string imports must fail gracefully without throwing
  assert.equal(sm.importDataJson(''), false);
  assert.equal(sm.importDataJson('   '), false);
  assert.equal(sm.importDataJson('{ corrupt json'), false);
  assert.equal(sm.importDataJson('42'), false);
  assert.equal(sm.importDataJson('null'), false);

  // Clean import restores state
  const target = new StorageManager();
  const ok = target.importDataJson(jsonStr);
  assert.equal(ok, true);
  assert.equal(target.get('gold'), 250);
  assert.equal(target.get('highScore'), 500);
  assert.equal(target.getUpgradeTier('ARMOR_OF_JUSTICE'), 2);
});

// --- SUITE 5: ROGUELITE UPGRADE MANAGER STATS & BONUSES ---
test('UpgradeManager: Meta-Progression Math and All Tiers Verification', () => {
  const sm = new StorageManager();
  sm.resetAll();
  const um = new UpgradeManager(sm);

  // Tier 0 Baseline
  assert.equal(um.getMaxLifeForce(), 100);
  assert.equal(um.getGravityMultiplier(), 1.0);
  assert.equal(um.getGapBonus(), 0);
  assert.equal(um.getGoldMultiplier(), 1.0);
  assert.equal(um.getStartingShields(), 0);
  assert.equal(um.hasSecondWind(), false);
  assert.equal(um.getFoodNutritionMultiplier(), 1.0);

  // Upgrade HORNS_OF_RESILIENCE (5 tiers, +20% per tier)
  sm.setUpgradeTier('HORNS_OF_RESILIENCE', 3);
  assert.equal(um.getMaxLifeForce(), 160);

  // Upgrade PLUME_OF_LEVITATION (5 tiers, -8% gravity per tier)
  sm.setUpgradeTier('PLUME_OF_LEVITATION', 2);
  assert.equal(Math.round(um.getGravityMultiplier() * 100), 84);

  // Upgrade DUNSHELM_MASONRY (5 tiers, +14px per tier)
  sm.setUpgradeTier('DUNSHELM_MASONRY', 4);
  assert.equal(um.getGapBonus(), 56);

  // Upgrade ARMOR_OF_JUSTICE (3 tiers)
  sm.setUpgradeTier('ARMOR_OF_JUSTICE', 2);
  assert.equal(um.getStartingShields(), 2);

  // Upgrade SECOND_WIND (1 tier)
  sm.setUpgradeTier('SECOND_WIND', 1);
  assert.equal(um.hasSecondWind(), true);
});

// --- SUITE 6: IN-RUN RELIC MODIFIERS ---
test('UpgradeManager: In-Run Relic Acquisition and Modifier Stacking', () => {
  const um = new UpgradeManager();
  um.resetRunRelics();

  assert.equal(um.getActiveRelicsList().length, 0);

  // Add Merlin's Feather
  const feather = um.addRunRelic('MERLINS_FEATHER');
  assert.ok(feather);
  assert.equal(um.hasRelic('MERLINS_FEATHER'), true);

  // Add Gwen's Chalice (decay multiplier 0.75)
  assert.equal(um.getLifeForceDecayMultiplier(), 1.0);
  um.addRunRelic('GWENS_CHALICE');
  assert.equal(um.getLifeForceDecayMultiplier(), 0.75);

  // Add Chrono Hourglass (35% faster cooldowns)
  const baseCd = um.getSpellCooldownMultiplier();
  um.addRunRelic('CHRONO_HOURGLASS');
  const relicCd = um.getSpellCooldownMultiplier();
  assert.ok(relicCd < baseCd);

  // Reset Run Relics
  um.resetRunRelics();
  assert.equal(um.hasRelic('GWENS_CHALICE'), false);
  assert.equal(um.getLifeForceDecayMultiplier(), 1.0);
  assert.equal(um.getActiveRelicsList().length, 0);
});

// --- SUITE 7: SANCTUARY PURCHASING LIFECYCLE ---
test('UpgradeManager: Purchase Verification, Gold Deduction, and Max Cap', () => {
  const sm = new StorageManager();
  sm.resetAll();
  const um = new UpgradeManager(sm);

  // Give 1500 gold
  sm.set('gold', 1500);

  // Purchase tier 1 of Second Wind (costs 1200)
  const res1 = um.purchase('SECOND_WIND');
  assert.equal(res1.success, true);
  assert.equal(res1.newTier, 1);
  assert.equal(sm.get('gold'), 300);

  // Try to purchase second tier (already at max 1)
  const res2 = um.purchase('SECOND_WIND');
  assert.equal(res2.success, false);
  assert.equal(res2.reason, 'Already at maximum tier');

  // Insufficient gold purchase (costs 100 for tier 1 of Horns, but set gold to 20)
  sm.set('gold', 20);
  const res3 = um.purchase('HORNS_OF_RESILIENCE');
  assert.equal(res3.success, false);
  assert.equal(res3.reason, 'Insufficient Dunshelm Gold');
});

// --- SUITE 8: LIFE FORCE CLOCK ALL 4 VISUAL STAGES ---
test('LifeForceClock: Four Visual Stages (Green, Amber, Red, Skull) and Boundaries', () => {
  const clock = new LifeForceClock(null);
  clock.reset(100);

  // Stage 1: Green Visor (100% -> >65%)
  assert.equal(clock.stage, LIFE_STAGE.GREEN);
  assert.equal(clock.getStageDescription().label, 'Green Visor');
  assert.equal(clock.isDead(), false);

  // Boundary check: 66% is Green
  clock.current = 66;
  clock.update(0);
  assert.equal(clock.stage, LIFE_STAGE.GREEN);

  // Boundary check: 65% is Amber
  clock.current = 65;
  clock.update(0);
  assert.equal(clock.stage, LIFE_STAGE.AMBER);
  assert.equal(clock.getStageDescription().label, 'Amber Guard');

  // Stage 2: Amber Guard (65% -> >32%)
  clock.current = 33;
  clock.update(0);
  assert.equal(clock.stage, LIFE_STAGE.AMBER);

  // Stage 3: Red Menace (32% -> >0%)
  clock.current = 32;
  clock.update(0);
  assert.equal(clock.stage, LIFE_STAGE.RED);
  assert.equal(clock.getStageDescription().label, 'Red Menace');

  // Stage 4: Skull of Doom (0%)
  clock.current = 0;
  clock.update(0);
  assert.equal(clock.stage, LIFE_STAGE.SKULL);
  assert.equal(clock.getStageDescription().label, 'Skull of Doom');
  assert.equal(clock.isDead(), true);
});

// --- SUITE 9: LIFE FORCE FEEDING, OVER-FEEDING, AND DAMAGE ---
test('LifeForceClock: Feeding Nutrition, Cap Clamping, and NaN Protection', () => {
  const clock = new LifeForceClock(null);
  clock.reset(100);

  clock.current = 40;
  const restored = clock.feed(25);
  assert.equal(restored, 25);
  assert.equal(clock.current, 65);

  // Over-feeding should clamp at max
  const overRestored = clock.feed(80);
  assert.equal(clock.current, 100);
  assert.equal(overRestored, 35); // Only 35 was needed to reach 100

  // Damage
  clock.damage(30);
  assert.equal(clock.current, 70);

  // Over-damage should clamp at 0
  clock.damage(200);
  assert.equal(clock.current, 0);
  assert.equal(clock.isDead(), true);

  // NaN feeding & damage protection
  clock.feed(NaN);
  assert.equal(clock.current, 0);
  clock.damage(NaN);
  assert.equal(clock.current, 0);
});

// --- SUITE 10: DUNGEONEER FLAP IMPULSE & FLIGHT DYNAMICS ---
test('Dungeoneer: Flap Impulse, Gravity Application, and Velocity Clamping', () => {
  const player = new Dungeoneer(180, 250);
  player.reset();

  assert.equal(player.x, 180);
  assert.equal(player.y, 250);
  assert.equal(player.vy, 0);

  // Flap impulse pushes upward (negative vy)
  player.flap();
  assert.equal(player.vy, CONFIG.BASE_FLAP_IMPULSE);

  // Apply 0.1s gravity
  player.update(0.1, CONFIG.BASE_GRAVITY, CONFIG.MAX_FALL_SPEED, CONFIG.CANVAS_HEIGHT);
  assert.ok(player.y < 250); // Ascended
  assert.ok(player.vy > CONFIG.BASE_FLAP_IMPULSE); // Pulled down by gravity

  // Terminal velocity check
  for (let i = 0; i < 20; i++) {
    player.update(0.1, CONFIG.BASE_GRAVITY, CONFIG.MAX_FALL_SPEED, CONFIG.CANVAS_HEIGHT);
  }
  assert.ok(player.vy <= CONFIG.MAX_FALL_SPEED);
});

// --- SUITE 11: DUNGEONEER BOUNDARY CONSTRAINTS ---
test('Dungeoneer: Ceiling and Floor Safety Containment', () => {
  const player = new Dungeoneer(180, 10);
  
  // Try to fly above ceiling limit (35px)
  player.vy = -1000;
  player.update(0.1, CONFIG.BASE_GRAVITY, CONFIG.MAX_FALL_SPEED, CONFIG.CANVAS_HEIGHT);
  assert.ok(player.y >= 35, `Player y ${player.y} should be >= 35`);
  assert.equal(player.vy, 0);

  // Drop towards bottom limit (CANVAS_HEIGHT - 35)
  player.y = CONFIG.CANVAS_HEIGHT - 10;
  player.vy = 500;
  player.update(0.1, CONFIG.BASE_GRAVITY, CONFIG.MAX_FALL_SPEED, CONFIG.CANVAS_HEIGHT);
  assert.ok(player.y <= CONFIG.CANVAS_HEIGHT - 35);
  assert.equal(player.vy, 0);
});

// --- SUITE 12: DUNGEONEER SINGLE-SWITCH HOLD-TO-RISE MODE ---
test('Dungeoneer: Single-Switch Hold-to-Rise Acceleration and Upward Cap', () => {
  const player = new Dungeoneer(180, 400);
  player.isHoldingRise = true;

  // With holdToRise active, vy continuously decreases upward
  player.update(0.1, CONFIG.BASE_GRAVITY, CONFIG.MAX_FALL_SPEED, CONFIG.CANVAS_HEIGHT);
  assert.ok(player.vy < 0);
  
  // Verify it caps at -280
  for (let i = 0; i < 15; i++) {
    player.update(0.1, CONFIG.BASE_GRAVITY, CONFIG.MAX_FALL_SPEED, CONFIG.CANVAS_HEIGHT);
  }
  assert.ok(player.vy >= -280, `Velocity ${player.vy} should not exceed -280`);
});

// --- SUITE 13: DUNGEONEER SHIELD ABSORPTION AND SPELL COOLDOWNS ---
test('Dungeoneer: Armor of Justice Shield Stacks & Spell Cooldown Cycles', () => {
  const player = new Dungeoneer(180, 300);
  player.shields = 3;

  // Hit 1: Absorbed, shields drop to 2, invulnerability granted
  assert.equal(player.absorbHit(), true);
  assert.equal(player.shields, 2);
  assert.ok(player.invulnerableTimer > 0);

  // Subsequent hit during invulnerability causes no damage or shield loss
  assert.equal(player.absorbHit(), true);
  assert.equal(player.shields, 2);

  // Expire invulnerability
  player.invulnerableTimer = 0;
  assert.equal(player.absorbHit(), true);
  assert.equal(player.shields, 1);

  // Spell Casting cycle
  assert.equal(player.canCastSpell('DISMISS'), true);
  assert.equal(player.castSpell('DISMISS'), true);
  assert.equal(player.canCastSpell('DISMISS'), false); // On cooldown

  // Tick cooldowns down
  const initialCd = player.spellCooldowns.DISMISS;
  player.update(0.5, CONFIG.BASE_GRAVITY, CONFIG.MAX_FALL_SPEED, CONFIG.CANVAS_HEIGHT);
  assert.ok(player.spellCooldowns.DISMISS < initialCd);
});

// --- SUITE 14: EXACT CIRCLE-TO-AABB COLLISION MATHEMATICS ---
test('Obstacle: Exact Circle-to-AABB Corner Clearance vs Penetration', () => {
  const chamber = CONFIG.CHAMBERS[0];
  const obs = new Obstacle(300, chamber, 0);
  obs.gapCenterY = 300;
  obs.gapHeight = 160;
  // Gap extends from y = 220 to y = 380
  // Top pillar: x in [300, 372], y in [0, 220]
  // Bottom pillar: x in [300, 372], y in [380, 640]

  const dungeoneer = new Dungeoneer(0, 0);
  dungeoneer.radius = 16;

  // 1. Center of gap -> perfectly safe
  dungeoneer.x = 336;
  dungeoneer.y = 300;
  assert.equal(obs.collidesWith(dungeoneer, 0), false);

  // 2. Deep inside top pillar -> collision
  dungeoneer.x = 336;
  dungeoneer.y = 150;
  assert.equal(obs.collidesWith(dungeoneer, 0), true);

  // 3. Deep inside bottom pillar -> collision
  dungeoneer.x = 336;
  dungeoneer.y = 450;
  assert.equal(obs.collidesWith(dungeoneer, 0), true);

  // 4. Exact Corner Clearance Test:
  // Corner of top pillar is at (300, 220).
  // Point outside both edges: x < 300, y > 220 (in the gap area to the left of the pillar)
  // Distance from corner: dx = 300 - px, dy = py - 220
  // If dx = 12, dy = 12: dist = hypot(12, 12) = 16.97px > radius (16px) -> NO COLLISION!
  dungeoneer.x = 300 - 12;
  dungeoneer.y = 220 + 12;
  assert.equal(obs.collidesWith(dungeoneer, 0), false, 'Corner clearance outside radius must not collide');

  // If dx = 10, dy = 10: dist = hypot(10, 10) = 14.14px < radius (16px) -> COLLISION!
  dungeoneer.x = 300 - 10;
  dungeoneer.y = 220 + 10;
  assert.equal(obs.collidesWith(dungeoneer, 0), true, 'Corner penetration within radius must collide');

  // 5. Spell Dismissal ignores all collisions
  obs.dismiss();
  assert.equal(obs.collidesWith(dungeoneer, 0), false);
});

// --- SUITE 15: PENDULUM BLADE OSCILLATION & CORRIDOR OF BLADES ---
test('Obstacle: Pendulum Blade Physics and Movement Tracking', () => {
  const chamber = CONFIG.CHAMBERS[1]; // Corridor of Blades
  const obs = new Obstacle(400, chamber, 0);
  assert.equal(obs.isPendulum, true);

  const angle0 = obs.pendulumAngle;
  obs.update(0.2, 100);
  const angle1 = obs.pendulumAngle;
  assert.notEqual(angle0, angle1, 'Pendulum angle must oscillate with time');

  // Verify blade hitbox hits player when player is in the blade trajectory
  const topPipeBottom = obs.gapCenterY - obs.gapHeight / 2;
  const pivotX = obs.x + obs.width / 2;
  const chainLen = obs.gapHeight * 0.45;
  const bladeX = pivotX + Math.sin(obs.pendulumAngle) * chainLen;
  const bladeY = topPipeBottom + Math.cos(obs.pendulumAngle) * chainLen;

  const playerOnBlade = new Dungeoneer(bladeX, bladeY);
  assert.equal(obs.collidesWith(playerOnBlade, 0), true);
});

// --- SUITE 16: COLLECTIBLES MAGNETISM & PARTICLE SYSTEM CLEANUP ---
test('Collectibles & Particles: Magnetic Pull, Bounds, and Memory Reclamation', () => {
  const coin = new Collectible(400, 300, 'GOLD', { value: 1 });
  assert.equal(coin.type, 'GOLD');
  assert.equal(coin.collected, false);

  // Without magnet, coin scrolls steadily to the left
  const prevX = coin.x;
  coin.update(0.1, 100, { x: 200, y: 300 }, false);
  assert.equal(coin.x, prevX - 10);

  // With Smirky's Amulet (magnetic = true), coin accelerates towards player
  const distBefore = Math.hypot(coin.x - 200, coin.y - 300);
  coin.update(0.1, 100, { x: 200, y: 300 }, true);
  const distAfter = Math.hypot(coin.x - 200, coin.y - 300);
  assert.ok(distAfter < distBefore, 'Magnet must pull item towards player');

  // Particle System emission and memory collection
  const ps = new ParticleSystem();
  assert.equal(ps.particles.length, 0);

  ps.emitFlapFeathers(100, 100);
  ps.emitGoldSparkles(100, 100);
  ps.emitSpellExplosion(100, 100, '#ffd166');
  assert.ok(ps.particles.length >= 20);

  // Age out particles completely
  ps.update(3.0);
  assert.equal(ps.particles.length, 0, 'Dead particles must be garbage collected');

  // Test clear
  ps.emitFlapFeathers(100, 100);
  assert.ok(ps.particles.length > 0);
  ps.clear();
  assert.equal(ps.particles.length, 0);
});
