/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Game Entities: Dungeoneer (Player), Obstacles, Collectibles, and Particle System
 */

import { CONFIG } from './config.js';
import { audio } from './audio.js';
import { upgrades } from './upgrades.js';
import { storage } from './storage.js';

export class Dungeoneer {
  constructor(x = 180, y = 300) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.radius = 20; // Hitbox radius
    this.rotation = 0; // Visual tilt in radians
    
    this.shields = 0;
    this.maxShields = 0;
    this.hasUsedSecondWind = false;
    this.invulnerableTimer = 0;
    
    // Spell Casting
    this.activeSpell = null;
    this.spellTimeRemaining = 0;
    this.spellCooldowns = {
      DISMISS: 0,
      EYESHIELD: 0,
      ANVIL: 0,
      LEVITATE: 0
    };
    
    // Auto-hover / single-switch hold state
    this.isHoldingRise = false;

    // Juice: Squash & Stretch, Motion Trail & Combos
    this.squashX = 1;
    this.squashY = 1;
    this.trailHistory = [];
    this.comboCount = 0;
    this.comboTimer = 0;
    this.selectedHelmet = storage.get('equippedHelmet') || 'JUSTICE';

    // In-Run Active Power-Up State
    this.activePowerup = null;
    this.powerupTimeRemaining = 0;
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.vy = 0;
    this.rotation = 0;
    this.shields = upgrades.getStartingShields();
    this.maxShields = this.shields;
    this.hasUsedSecondWind = false;
    this.invulnerableTimer = 0;
    this.activeSpell = null;
    this.spellTimeRemaining = 0;
    
    for (const k in this.spellCooldowns) {
      this.spellCooldowns[k] = 0;
    }

    this.squashX = 1;
    this.squashY = 1;
    this.trailHistory = [];
    this.comboCount = 0;
    this.comboTimer = 0;
    this.activePowerup = null;
    this.powerupTimeRemaining = 0;
    this.selectedHelmet = storage.get('equippedHelmet') || 'JUSTICE';
  }

  flap(customImpulse = null) {
    const impulse = customImpulse || CONFIG.BASE_FLAP_IMPULSE;
    this.vy = impulse;

    // Juice: Dynamic squash on flap
    this.squashX = 1.22;
    this.squashY = 0.8;

    audio.playFlap(this.selectedHelmet);
  }

  update(dt, gravity, maxFallSpeed, boundsHeight) {
    // Cooldown ticks
    for (const s in this.spellCooldowns) {
      if (this.spellCooldowns[s] > 0) {
        this.spellCooldowns[s] = Math.max(0, this.spellCooldowns[s] - dt);
      }
    }

    // Active spell tick
    if (this.activeSpell && this.spellTimeRemaining > 0) {
      this.spellTimeRemaining -= dt;
      if (this.spellTimeRemaining <= 0) {
        this.activeSpell = null;
      }
    }

    // Invulnerability tick
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Spell: LEVITATE active
    if (this.activeSpell === 'LEVITATE') {
      this.vy = Math.sin(Date.now() / 200) * 30; // Gentle float
    } else if (this.isHoldingRise) {
      // Assist mode: hold to rise
      this.vy = Math.max(-280, this.vy - 1100 * dt);
    } else {
      // Normal gravity application
      this.vy += gravity * dt;
      if (this.vy > maxFallSpeed) this.vy = maxFallSpeed;
    }

    this.y += this.vy * dt;

    // Boundary constraints
    const floorLimit = boundsHeight - 35;
    const ceilingLimit = 35;

    if (this.y > floorLimit) {
      this.y = floorLimit;
      this.vy = 0;
    }
    if (this.y < ceilingLimit) {
      this.y = ceilingLimit;
      this.vy = 0;
    }

    // Dynamic Squash & Stretch recovery
    this.squashX += (1 - this.squashX) * Math.min(1, 14 * dt);
    this.squashY += (1 - this.squashY) * Math.min(1, 14 * dt);

    // Trail history recording for speed ghosting
    this.trailHistory.unshift({ x: this.x, y: this.y, rotation: this.rotation, alpha: 0.45 });
    if (this.trailHistory.length > 5) {
      this.trailHistory.pop();
    }
    for (const t of this.trailHistory) {
      t.alpha -= dt * 1.5;
    }

    // Combo countdown timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    // Power-up countdown timer
    if (this.activePowerup && this.powerupTimeRemaining > 0) {
      this.powerupTimeRemaining -= dt;
      if (this.powerupTimeRemaining <= 0) {
        this.activePowerup = null;
      }
    }

    // Rotation calculation
    const targetRotation = Math.max(-0.45, Math.min(0.7, this.vy * 0.0018));
    this.rotation += (targetRotation - this.rotation) * CONFIG.ROTATION_SPEED * dt;
  }

  addCombo() {
    this.comboCount++;
    // Jester helmet extends combo window
    const baseWindow = this.selectedHelmet === 'JESTER' ? 3.5 : 2.5;
    this.comboTimer = baseWindow;
    return this.comboCount;
  }

  applyPowerup(powerupId) {
    const def = CONFIG.POWERUPS[powerupId];
    if (!def) return;
    this.activePowerup = powerupId;
    this.powerupTimeRemaining = def.duration;
  }

  canCastSpell(spellId) {
    return this.spellCooldowns[spellId] <= 0 && this.activeSpell === null;
  }

  castSpell(spellId) {
    if (!this.canCastSpell(spellId)) return false;
    const def = CONFIG.SPELLS[spellId];
    if (!def) return false;

    this.activeSpell = spellId;
    const durationMult = upgrades.getSpellDurationMultiplier();
    const cooldownMult = upgrades.getSpellCooldownMultiplier();

    this.spellTimeRemaining = def.duration * durationMult;
    this.spellCooldowns[spellId] = def.cooldown * cooldownMult;

    audio.playSpellCast(def.name);
    return true;
  }

  absorbHit() {
    if (this.invulnerableTimer > 0) return true;
    if (this.activeSpell === 'ANVIL') {
      audio.playShieldDeflect();
      return true;
    }

    if (this.shields > 0) {
      this.shields--;
      this.invulnerableTimer = 1.2; // 1.2s invulnerability grace
      if (this.shields > 0) {
        audio.playShieldDeflect();
      } else {
        audio.playShieldBreak();
      }
      return true;
    }
    return false;
  }
}

export class Obstacle {
  constructor(x, chamber, gapBonus = 0) {
    this.x = x;
    this.chamber = chamber;
    this.width = 72;
    this.gapHeight = (chamber.gapBase || 170) + gapBonus;
    this.passed = false;
    this.isDismissed = false;

    // Determine vertical center of passage gap
    const margin = 110;
    const minCenter = margin + this.gapHeight / 2;
    const maxCenter = CONFIG.CANVAS_HEIGHT - margin - this.gapHeight / 2;
    this.gapCenterY = Math.random() * (maxCenter - minCenter) + minCenter;

    // Near miss adrenaline & Midas state
    this.checkedNearMiss = false;
    this.isGold = false;

    // Pendulum blade mechanics if corridor of blades
    this.isPendulum = chamber.obstacleTheme === 'pendulum-guillotine';
    this.pendulumAngle = 0;
    this.pendulumSpeed = 2.2 + Math.random() * 1.2;
    this.pendulumTime = Math.random() * Math.PI * 2;
  }

  update(dt, speed) {
    this.x -= speed * dt;

    if (this.isPendulum) {
      this.pendulumTime += dt * this.pendulumSpeed;
      this.pendulumAngle = Math.sin(this.pendulumTime) * 0.85; // Oscillate ~48 degrees
    }
  }

  dismiss() {
    this.isDismissed = true;
  }

  collidesWith(dungeoneer, toleranceRadius = 0) {
    if (this.isDismissed) return false;

    const hitRadius = Math.max(6, dungeoneer.radius - toleranceRadius);
    const px = dungeoneer.x;
    const py = dungeoneer.y;

    const topPipeBottom = this.gapCenterY - this.gapHeight / 2;
    const bottomPipeTop = this.gapCenterY + this.gapHeight / 2;

    // Helper: Exact Circle to Axis-Aligned Bounding Box intersection
    const circleHitsRect = (rx, ry, rw, rh) => {
      const closestX = Math.max(rx, Math.min(px, rx + rw));
      const closestY = Math.max(ry, Math.min(py, ry + rh));
      const dx = px - closestX;
      const dy = py - closestY;
      return (dx * dx + dy * dy) < (hitRadius * hitRadius);
    };

    // 1. Check Top Stone Portcullis Pillar
    if (circleHitsRect(this.x, 0, this.width, topPipeBottom)) {
      return true;
    }

    // 2. Check Bottom Stone Portcullis Pillar
    if (circleHitsRect(this.x, bottomPipeTop, this.width, CONFIG.CANVAS_HEIGHT - bottomPipeTop)) {
      return true;
    }

    // 3. Pendulum blade special hitbox check if Corridor of Blades
    if (this.isPendulum) {
      const bladePivotX = this.x + this.width / 2;
      const bladePivotY = topPipeBottom;
      const chainLen = this.gapHeight * 0.45;
      const bladeX = bladePivotX + Math.sin(this.pendulumAngle) * chainLen;
      const bladeY = bladePivotY + Math.cos(this.pendulumAngle) * chainLen;

      const dist = Math.hypot(px - bladeX, py - bladeY);
      if (dist < hitRadius + 16) {
        return true;
      }
    }

    return false;
  }

  checkNearMiss(dungeoneer) {
    if (this.checkedNearMiss || this.isDismissed) return false;

    // Check when dungeoneer is traversing through the obstacle column
    if (dungeoneer.x >= this.x - 8 && dungeoneer.x <= this.x + this.width + 8) {
      const topPipeBottom = this.gapCenterY - this.gapHeight / 2;
      const bottomPipeTop = this.gapCenterY + this.gapHeight / 2;

      const distToTop = dungeoneer.y - topPipeBottom;
      const distToBottom = bottomPipeTop - dungeoneer.y;

      // Close shave if skimmed within 26px of top or bottom spikes without collision
      if ((distToTop > 0 && distToTop < 28) || (distToBottom > 0 && distToBottom < 28)) {
        this.checkedNearMiss = true;
        return true;
      }

      if (this.isPendulum) {
        const bladePivotX = this.x + this.width / 2;
        const bladePivotY = topPipeBottom;
        const chainLen = this.gapHeight * 0.45;
        const bladeX = bladePivotX + Math.sin(this.pendulumAngle) * chainLen;
        const bladeY = bladePivotY + Math.cos(this.pendulumAngle) * chainLen;
        const distToBlade = Math.hypot(dungeoneer.x - bladeX, dungeoneer.y - bladeY);

        if (distToBlade > dungeoneer.radius + 14 && distToBlade < dungeoneer.radius + 36) {
          this.checkedNearMiss = true;
          return true;
        }
      }
    }
    return false;
  }
}

export class Collectible {
  constructor(x, y, type, payload) {
    this.x = x;
    this.y = y;
    this.type = type; // 'FOOD', 'GOLD', 'RUBY', 'SCROLL'
    this.payload = payload;
    this.collected = false;
    this.time = Math.random() * 10;
    this.radius = 16;
  }

  update(dt, speed, playerPos = null, hasMagnet = false) {
    this.x -= speed * dt;
    this.time += dt * 3.5;

    // Magnet relic pull
    if (hasMagnet && playerPos && !this.collected) {
      const dx = playerPos.x - this.x;
      const dy = playerPos.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 220 && dist > 1) {
        const pullSpeed = (220 - dist) * 2.8;
        this.x += (dx / dist) * pullSpeed * dt;
        this.y += (dy / dist) * pullSpeed * dt;
      }
    }
  }

  collidesWith(dungeoneer) {
    if (this.collected) return false;
    const dist = Math.hypot(dungeoneer.x - this.x, dungeoneer.y - this.y);
    return dist < (dungeoneer.radius + this.radius);
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
  }

  addFloatingText(text, x, y, color = '#ffd166', size = 18, isCombo = false) {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -55,
      alpha: 1,
      color,
      size,
      isCombo,
      scale: 1.35,
      life: 1.0
    });
  }

  emitNearMissSparks(x, y) {
    this.emit(x, y, 16, {
      color: '#ffd166',
      sizeMin: 2,
      sizeMax: 5,
      speedMin: 80,
      speedMax: 220,
      decayMin: 2.0,
      decayMax: 3.5
    });
  }

  emitConfetti(x, y) {
    const colors = ['#f72585', '#7209b7', '#3a86ff', '#4cc9f0', '#ffd166', '#06d6a0'];
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 280,
        vy: -140 - Math.random() * 220,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 1,
        decay: 0.8 + Math.random() * 0.8,
        gravity: 240
      });
    }
  }

  emit(x, y, count = 10, config = {}) {
    if (storage.getSetting('reducedMotion')) {
      count = Math.min(3, Math.ceil(count * 0.25)); // Substantially reduce for motion sensitivity
    }

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (config.speedMin || 30) + Math.random() * ((config.speedMax || 180) - (config.speedMin || 30));
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed + (config.vxBias || 0),
        vy: Math.sin(angle) * speed + (config.vyBias || 0),
        size: (config.sizeMin || 2) + Math.random() * ((config.sizeMax || 5) - (config.sizeMin || 2)),
        color: config.color || '#ffbe0b',
        alpha: 1,
        life: 1,
        decay: (config.decayMin || 1.2) + Math.random() * ((config.decayMax || 2.4) - (config.decayMin || 1.2)),
        gravity: config.gravity || 80
      });
    }
  }

  emitFlapFeathers(x, y) {
    this.emit(x - 12, y + 10, 4, {
      color: '#06d6a0',
      sizeMin: 2,
      sizeMax: 4,
      speedMin: 20,
      speedMax: 70,
      vxBias: -60,
      decayMin: 1.5,
      decayMax: 3.0
    });
  }

  emitGoldSparkles(x, y) {
    this.emit(x, y, 12, {
      color: '#ffc300',
      sizeMin: 2,
      sizeMax: 5,
      speedMin: 50,
      speedMax: 180,
      decayMin: 1.5,
      decayMax: 2.5
    });
  }

  emitSpellExplosion(x, y, color = '#e63946') {
    this.emit(x, y, 28, {
      color,
      sizeMin: 3,
      sizeMax: 8,
      speedMin: 80,
      speedMax: 260,
      decayMin: 1.0,
      decayMax: 2.0
    });
  }

  emitShieldImpact(x, y) {
    this.emit(x, y, 16, {
      color: '#4cc9f0',
      sizeMin: 3,
      sizeMax: 6,
      speedMin: 60,
      speedMax: 200,
      decayMin: 1.8,
      decayMax: 2.8
    });
  }

  update(dt) {
    // 1. Particle physics
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, p.life);
    }

    // 2. Floating combat/score text animations
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt * 1.15;
      ft.y += ft.vy * dt;
      ft.scale = Math.max(1.0, ft.scale - dt * 2.2);
      ft.alpha = Math.max(0, ft.life);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }
}
