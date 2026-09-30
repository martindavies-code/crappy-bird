/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Canvas 2D World Renderer (Knightmare Gothic Aesthetic, Parallax, Dungeoneer, & FX)
 */

import { CONFIG } from './config.js';
import { storage } from './storage.js';

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
    this.width = canvas ? canvas.width : CONFIG.CANVAS_WIDTH;
    this.height = canvas ? canvas.height : CONFIG.CANVAS_HEIGHT;

    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.torchFlickerTime = 0;

    // Background parallax scroll offsets
    this.bgOffsetFar = 0;
    this.bgOffsetMid = 0;
    this.bgOffsetFloor = 0;
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 2);
    
    // Fixed logical coordinate space 960x640 for deterministic physics & rendering
    this.canvas.width = Math.round(CONFIG.CANVAS_WIDTH * dpr);
    this.canvas.height = Math.round(CONFIG.CANVAS_HEIGHT * dpr);
    if (typeof this.ctx.setTransform === 'function') {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else if (typeof this.ctx.resetTransform === 'function') {
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
    }
    this.width = CONFIG.CANVAS_WIDTH;
    this.height = CONFIG.CANVAS_HEIGHT;
  }

  triggerShake(intensity = 8, duration = 0.3) {
    if (storage.getSetting('reducedMotion') || !storage.getSetting('screenShake')) return;
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  update(dt, speed) {
    this.torchFlickerTime += dt * 8;

    // Parallax scrolling
    this.bgOffsetFar = (this.bgOffsetFar + speed * 0.15 * dt) % this.width;
    this.bgOffsetMid = (this.bgOffsetMid + speed * 0.45 * dt) % this.width;
    this.bgOffsetFloor = (this.bgOffsetFloor + speed * dt) % 64;

    // Shake dampening
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) this.shakeIntensity = 0;
    }
  }

  render(gameState) {
    const ctx = this.ctx;
    ctx.save();

    // Apply Screen Shake
    if (this.shakeIntensity > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ctx.translate(offsetX, offsetY);
    }

    // 1. Background Layers
    this.renderBackground(gameState.currentChamber);

    // 2. Obstacles
    for (const obstacle of gameState.obstacles) {
      this.renderObstacle(obstacle);
    }

    // 3. Collectibles
    for (const item of gameState.collectibles) {
      this.renderCollectible(item);
    }

    // 4. Particle System
    this.renderParticles(gameState.particles);

    // 5. Dungeoneer Player
    this.renderDungeoneer(gameState.dungeoneer);

    // 6. Foreground Ambience (Torchglow, Vignette, Fog)
    this.renderForegroundAmbience(gameState.currentChamber);

    ctx.restore();
  }

  // --- BACKGROUND RENDERING ---
  renderBackground(chamber) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Base Sky / Vault Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (chamber.id === 'blades') {
      grad.addColorStop(0, '#1a0f0a');
      grad.addColorStop(0.5, '#2b140b');
      grad.addColorStop(1, '#0e0806');
    } else if (chamber.id === 'alchemy') {
      grad.addColorStop(0, '#061614');
      grad.addColorStop(0.5, '#0a2e23');
      grad.addColorStop(1, '#040d0a');
    } else if (chamber.id === 'black-tower') {
      grad.addColorStop(0, '#210609');
      grad.addColorStop(0.5, '#3b0b14');
      grad.addColorStop(1, '#110306');
    } else {
      // Catacombs default: deep castle navy/slate
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#121b2d');
      grad.addColorStop(1, '#070a10');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Far Layer: Distant Gothic Arches & Castle Walls
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    const archSpacing = 220;
    const archOffset = -this.bgOffsetFar;
    for (let x = archOffset - archSpacing; x < w + archSpacing; x += archSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, h - 50);
      ctx.lineTo(x, 140);
      ctx.quadraticCurveTo(x + archSpacing / 2, 40, x + archSpacing, 140);
      ctx.lineTo(x + archSpacing, h - 50);
      ctx.closePath();
      ctx.fill();
    }

    // Mid Layer: Stone Columns, Wall Bricks, and Hanging Torches
    const colSpacing = 320;
    const colOffset = -this.bgOffsetMid;
    for (let x = colOffset - colSpacing; x < w + colSpacing; x += colSpacing) {
      // Wall Stone Column
      ctx.fillStyle = '#1e2430';
      ctx.fillRect(x, 0, 36, h - 50);

      // Capital / Base trim
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x - 6, 0, 48, 20);
      ctx.fillRect(x - 6, h - 70, 48, 20);

      // Iron Torch Sconce on the column
      const torchX = x + 18;
      const torchY = 220;
      ctx.fillStyle = '#111';
      ctx.fillRect(torchX - 3, torchY, 6, 26);
      ctx.fillRect(torchX - 9, torchY - 6, 18, 8);

      // Flickering Torch Flame
      const flicker = Math.sin(this.torchFlickerTime + x) * 2;
      const flameGrad = ctx.createRadialGradient(torchX, torchY - 8 + flicker, 2, torchX, torchY - 8 + flicker, 18);
      flameGrad.addColorStop(0, '#fff3b0');
      flameGrad.addColorStop(0.4, '#ff9900');
      flameGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(torchX, torchY - 8 + flicker, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floor Cobblestones
    ctx.fillStyle = '#12161f';
    ctx.fillRect(0, h - 50, w, 50);

    // Cobblestone pattern
    ctx.strokeStyle = '#232a3b';
    ctx.lineWidth = 2;
    for (let x = -this.bgOffsetFloor; x < w + 64; x += 40) {
      ctx.beginPath();
      ctx.arc(x, h - 25, 14, 0, Math.PI);
      ctx.stroke();
    }

    // Ceiling Stalactites / Stone Moldings
    ctx.fillStyle = '#12161f';
    ctx.fillRect(0, 0, w, 28);
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 28);
      ctx.lineTo(x + 20, 46);
      ctx.lineTo(x + 40, 28);
      ctx.fill();
    }
  }

  // --- OBSTACLE RENDERING ---
  renderObstacle(obs) {
    if (obs.isDismissed) return;
    const ctx = this.ctx;
    const x = obs.x;
    const w = obs.width;
    const topEnd = obs.gapCenterY - obs.gapHeight / 2;
    const botStart = obs.gapCenterY + obs.gapHeight / 2;

    ctx.save();

    // 1. Top Obstacle (Carved Stone Pillar + Spiked Portcullis Grill)
    const stoneGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    stoneGrad.addColorStop(0, '#2c3340');
    stoneGrad.addColorStop(0.5, '#475569');
    stoneGrad.addColorStop(1, '#1e2430');

    ctx.fillStyle = stoneGrad;
    ctx.fillRect(x, 0, w, topEnd - 32);

    // Decorative lintel / gargoyle rune block
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - 5, topEnd - 42, w + 10, 14);

    // Spiked iron bars descending from top
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 6, topEnd - 28, w - 12, 28);

    // Iron spikes
    const spikeCount = 4;
    const spikeW = (w - 12) / spikeCount;
    ctx.fillStyle = '#94a3b8';
    for (let i = 0; i < spikeCount; i++) {
      const sx = x + 6 + i * spikeW;
      ctx.beginPath();
      ctx.moveTo(sx, topEnd - 2);
      ctx.lineTo(sx + spikeW / 2, topEnd + 14);
      ctx.lineTo(sx + spikeW, topEnd - 2);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Bottom Obstacle (Spiked Portcullis Gate rising from the floor)
    ctx.fillStyle = stoneGrad;
    ctx.fillRect(x, botStart + 32, w, this.height - (botStart + 32));

    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - 5, botStart + 28, w + 10, 14);

    // Spikes pointing up
    ctx.fillStyle = '#94a3b8';
    for (let i = 0; i < spikeCount; i++) {
      const sx = x + 6 + i * spikeW;
      ctx.beginPath();
      ctx.moveTo(sx, botStart + 2);
      ctx.lineTo(sx + spikeW / 2, botStart - 14);
      ctx.lineTo(sx + spikeW, botStart + 2);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Corridor of Blades - Swinging Pendulum Blade
    if (obs.isPendulum) {
      const pivotX = x + w / 2;
      const pivotY = topEnd;
      const chainLen = obs.gapHeight * 0.45;
      const bladeX = pivotX + Math.sin(obs.pendulumAngle) * chainLen;
      const bladeY = pivotY + Math.cos(obs.pendulumAngle) * chainLen;

      // Iron hanging chain
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bladeX, bladeY);
      ctx.stroke();

      // Curved Guillotine Blade
      ctx.save();
      ctx.translate(bladeX, bladeY);
      ctx.rotate(obs.pendulumAngle);

      // Blade body
      const bladeGrad = ctx.createLinearGradient(-24, 0, 24, 0);
      bladeGrad.addColorStop(0, '#f8fafc');
      bladeGrad.addColorStop(0.5, '#94a3b8');
      bladeGrad.addColorStop(1, '#334155');

      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI); // Half moon crescent
      ctx.closePath();
      ctx.fill();

      // Sharp razor edge shine
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  // --- COLLECTIBLES RENDERING ---
  renderCollectible(item) {
    if (item.collected) return;
    const ctx = this.ctx;
    const cx = item.x;
    const cy = item.y + Math.sin(item.time) * 6; // Gentle bobbing

    ctx.save();

    if (item.type === 'FOOD') {
      // Floating glowing food
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.payload.icon || '🥧', cx, cy);

      // Green nourishing aura
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(46, 196, 182, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

    } else if (item.type === 'GOLD') {
      // Golden Coin Medallion
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fb8500';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('D', cx, cy + 1); // "D" for Dunshelm

    } else if (item.type === 'RUBY') {
      // Blood Ruby
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx + 12, cy - 4);
      ctx.lineTo(cx + 8, cy + 12);
      ctx.lineTo(cx - 8, cy + 12);
      ctx.lineTo(cx - 12, cy - 4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

    } else if (item.type === 'SCROLL') {
      // Arcane Spell Scroll
      ctx.fillStyle = '#fefae0';
      ctx.fillRect(cx - 10, cy - 12, 20, 24);
      ctx.strokeStyle = '#bc6c25';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 10, cy - 12, 20, 24);

      // Mystic rune mark
      ctx.fillStyle = '#7209b7';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', cx, cy);
    }

    ctx.restore();
  }

  // --- DUNGEONEER PLAYER RENDERING ---
  renderDungeoneer(player) {
    const ctx = this.ctx;
    const px = player.x;
    const py = player.y;

    // Hit invulnerability flashing
    if (player.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(player.rotation);

    // 1. Billowing Cloak Behind
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.quadraticCurveTo(-38 - Math.abs(player.vy * 0.04), 10, -28, 22);
    ctx.quadraticCurveTo(-14, 18, -4, 10);
    ctx.closePath();
    ctx.fill();

    // 2. Traveler Knapsack / Pouch (iconic Knightmare food bag)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-18, 4, 14, 12);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-18, 4, 14, 12);

    // 3. Torso / Tunic
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(-2, 8, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. THE HELMET OF JUSTICE
    // Distinctive curved horned iron helmet
    // Left Horn
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(-8, -12);
    ctx.quadraticCurveTo(-24, -28, -20, -36);
    ctx.quadraticCurveTo(-12, -26, -4, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Horn
    ctx.beginPath();
    ctx.moveTo(8, -12);
    ctx.quadraticCurveTo(24, -28, 20, -36);
    ctx.quadraticCurveTo(12, -26, 4, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dome of Helmet
    const helmetGrad = ctx.createLinearGradient(-16, -20, 16, 8);
    helmetGrad.addColorStop(0, '#f1f5f9');
    helmetGrad.addColorStop(0.5, '#64748b');
    helmetGrad.addColorStop(1, '#1e293b');

    ctx.fillStyle = helmetGrad;
    ctx.beginPath();
    ctx.arc(0, -6, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Iconic T-Bar Visor (Covering the eyes completely, Knightmare style!)
    ctx.fillStyle = '#020617';
    ctx.fillRect(-12, -8, 24, 5);
    ctx.fillRect(-2.5, -8, 5, 16);

    // Mystic Visor Eyes (Glowing soft blue/green)
    ctx.fillStyle = '#2ec4b6';
    ctx.shadowColor = '#2ec4b6';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-6, -5.5, 2, 0, Math.PI * 2);
    ctx.arc(6, -5.5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Helmet Crest Plume
    ctx.fillStyle = '#06d6a0';
    ctx.beginPath();
    ctx.ellipse(0, -24, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Active Spell & Armor Overlays
    // Armor of Justice: Rotating orbital shield runic glyphs
    if (player.shields > 0) {
      const shieldTime = Date.now() / 400;
      for (let s = 0; s < player.shields; s++) {
        const angle = shieldTime + (s * (Math.PI * 2 / player.shields));
        const sx = Math.cos(angle) * 32;
        const sy = Math.sin(angle) * 32;

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Spell: ANVIL (Golden impenetrable iron barrier)
    if (player.activeSpell === 'ANVIL') {
      ctx.strokeStyle = '#ffbe0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffbe0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Spell: EYESHIELD (Time distortion bubble)
    if (player.activeSpell === 'EYESHIELD') {
      ctx.strokeStyle = 'rgba(58, 134, 255, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // --- PARTICLE RENDERING ---
  renderParticles(particleSystem) {
    const ctx = this.ctx;
    for (const p of particleSystem.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- FOREGROUND AMBIENCE ---
  renderForegroundAmbience(chamber) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Atmospheric Vignette (Dark edges)
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.7);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.65)');

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }
}
