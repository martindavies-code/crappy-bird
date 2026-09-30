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

    // 5. Ghost Trails & Dungeoneer Player (Squash & Stretch)
    this.renderGhostTrails(gameState.dungeoneer);
    this.renderDungeoneer(gameState.dungeoneer);

    // 6. Floating Score & Combat Numbers
    this.renderFloatingTexts(gameState.particles.floatingTexts);

    // 7. In-Game Canvas Overlays (Combos & Power-Up Gauge)
    this.renderCanvasHUD(gameState.dungeoneer);

    // 8. Foreground Ambience (Torchglow, Vignette, Fog)
    this.renderForegroundAmbience(gameState.currentChamber);

    ctx.restore();
  }

  // --- BACKGROUND RENDERING (Bauhaus Constructivist Vault) ---
  renderBackground(chamber) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Base Architectural Sky Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (chamber.id === 'blades') {
      grad.addColorStop(0, '#14151a');
      grad.addColorStop(0.5, '#20181b');
      grad.addColorStop(1, '#0e0f14');
    } else if (chamber.id === 'alchemy') {
      grad.addColorStop(0, '#0a1716');
      grad.addColorStop(0.5, '#0e2622');
      grad.addColorStop(1, '#06100f');
    } else if (chamber.id === 'black-tower') {
      grad.addColorStop(0, '#1c080c');
      grad.addColorStop(0.5, '#2a0c14');
      grad.addColorStop(1, '#100307');
    } else {
      // Catacombs default: Deep Bauhaus Navy & Slate
      grad.addColorStop(0, '#0c101a');
      grad.addColorStop(0.5, '#162035');
      grad.addColorStop(1, '#080c14');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Bauhaus Drafting Matrix / Architectural Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridSize = 70;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Far Layer: Bauhaus Semicircular Arches & Celestial Discs
    const archSpacing = 240;
    const archOffset = -this.bgOffsetFar;
    for (let x = archOffset - archSpacing; x < w + archSpacing; x += archSpacing) {
      // Geometric Arch Portal
      ctx.fillStyle = 'rgba(10, 14, 22, 0.65)';
      ctx.beginPath();
      ctx.moveTo(x, h - 50);
      ctx.lineTo(x, 150);
      ctx.arc(x + archSpacing / 2, 150, archSpacing / 2, Math.PI, 0, false);
      ctx.lineTo(x + archSpacing, h - 50);
      ctx.closePath();
      ctx.fill();

      // Bauhaus Primary Outline Arc
      ctx.strokeStyle = '#1d4ed8'; // Bauhaus Cobalt Blue
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + archSpacing / 2, 150, archSpacing / 2, Math.PI, 0, false);
      ctx.stroke();

      // Floating Bauhaus Celestial Disc (Kandinsky Constructivism)
      const discX = x + archSpacing / 2;
      const discY = 110;
      ctx.fillStyle = '#ffb703'; // Canary Yellow outer
      ctx.beginPath();
      ctx.arc(discX, discY, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e63946'; // Vermilion inner core
      ctx.beginPath();
      ctx.arc(discX, discY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Mid Layer: Modernist Constructivist Pillars & Bauhaus Sconces
    const colSpacing = 300;
    const colOffset = -this.bgOffsetMid;
    for (let x = colOffset - colSpacing; x < w + colSpacing; x += colSpacing) {
      // Main Pillar Column (Two-tone color-blocked slate)
      ctx.fillStyle = '#1c2230';
      ctx.fillRect(x, 0, 36, h - 50);
      ctx.fillStyle = '#283246';
      ctx.fillRect(x + 18, 0, 18, h - 50);

      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 0, 36, h - 50);

      // Bauhaus Cobalt & Vermilion Capital Accent Blocks
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(x - 4, 20, 44, 10);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(x - 4, h - 80, 44, 10);

      // Modernist Minimalist Luminary Sconce
      const torchX = x + 18;
      const torchY = 220;

      // Matte Black T-Bracket
      ctx.fillStyle = '#111216';
      ctx.fillRect(torchX - 3, torchY, 6, 24);
      ctx.fillRect(torchX - 10, torchY - 4, 20, 6);

      // Bauhaus Concentric Luminary Rings
      const flicker = Math.sin(this.torchFlickerTime + x) * 2;
      const glowRad = 16 + flicker;

      // Radiant Halo
      ctx.fillStyle = 'rgba(230, 57, 70, 0.25)'; // Vermilion glow
      ctx.beginPath();
      ctx.arc(torchX, torchY - 8, glowRad + 8, 0, Math.PI * 2);
      ctx.fill();

      // Canary Yellow Core Disc
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(torchX, torchY - 8, glowRad, 0, Math.PI * 2);
      ctx.fill();

      // Stark Ivory Center
      ctx.fillStyle = '#f8f6f0';
      ctx.beginPath();
      ctx.arc(torchX, torchY - 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Floor: Constructivist Tiles with Bauhaus Diagonal Hazard Curb
    ctx.fillStyle = '#111216';
    ctx.fillRect(0, h - 50, w, 50);

    // Hazard Curb Line (Black & Canary Yellow diagonal stripes)
    const curbH = 10;
    const curbY = h - 50;
    ctx.save();
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(0, curbY, w, curbH);

    ctx.fillStyle = '#111216';
    const stripeW = 16;
    for (let x = -this.bgOffsetFloor; x < w + stripeW * 2; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, curbY);
      ctx.lineTo(x + stripeW, curbY);
      ctx.lineTo(x, curbY + curbH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Clean orthogonal pavement grid
    ctx.strokeStyle = '#222838';
    ctx.lineWidth = 2;
    for (let x = -this.bgOffsetFloor; x < w + 64; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, h - 38);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // 6. Ceiling: Stepped Bauhaus Architrave Beam
    ctx.fillStyle = '#111216';
    ctx.fillRect(0, 0, w, 28);
    ctx.fillStyle = '#1d4ed8'; // Cobalt ceiling runner
    ctx.fillRect(0, 26, w, 4);

    // Modernist geometric tooth dentils
    ctx.fillStyle = '#f8f6f0';
    for (let x = 0; x < w; x += 40) {
      ctx.fillRect(x, 28, 16, 6);
    }
  }

  // --- OBSTACLE RENDERING (Bauhaus Architectural Monoliths) ---
  renderObstacle(obs) {
    if (obs.isDismissed) return;
    const ctx = this.ctx;
    const x = obs.x;
    const w = obs.width;
    const topEnd = obs.gapCenterY - obs.gapHeight / 2;
    const botStart = obs.gapCenterY + obs.gapHeight / 2;

    ctx.save();

    // 1. TOP OBSTACLE (Architectural Pillar Monolith)
    const isGold = obs.isGold;
    const pillarBaseColor = isGold ? '#f59e0b' : '#1c2230';
    const pillarStripeColor = isGold ? '#fef08a' : '#283246';
    const accentBlockColor = isGold ? '#d97706' : '#1d4ed8'; // Cobalt or Amber
    const lintelColor = isGold ? '#ffb703' : '#e63946'; // Vermilion or Gold
    const spikeColor = isGold ? '#fde047' : '#f8f6f0'; // Warm White or Canary Yellow

    // Main Column Body (Color-blocked planes with bold 2px black outline)
    ctx.fillStyle = pillarBaseColor;
    ctx.fillRect(x, 0, w, topEnd - 24);
    ctx.fillStyle = pillarStripeColor;
    ctx.fillRect(x + w * 0.45, 0, w * 0.55, topEnd - 24);

    ctx.strokeStyle = '#111216';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, 0, w, topEnd - 24);

    // Primary Color Inset Block
    ctx.fillStyle = accentBlockColor;
    ctx.fillRect(x + 8, topEnd - 72, w - 16, 24);
    ctx.strokeRect(x + 8, topEnd - 72, w - 16, 24);

    // Bauhaus Lintel Block with Circular Aperture
    ctx.fillStyle = lintelColor;
    ctx.fillRect(x - 4, topEnd - 32, w + 8, 16);
    ctx.strokeRect(x - 4, topEnd - 32, w + 8, 16);

    // Circular center cutout
    ctx.fillStyle = '#111216';
    ctx.beginPath();
    ctx.arc(x + w / 2, topEnd - 24, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Spikes (Pure Geometric Equilateral Triangles!)
    const spikeCount = 4;
    const spikeW = (w - 8) / spikeCount;
    ctx.fillStyle = spikeColor;
    ctx.strokeStyle = '#111216';
    ctx.lineWidth = 2;
    for (let i = 0; i < spikeCount; i++) {
      const sx = x + 4 + i * spikeW;
      ctx.beginPath();
      ctx.moveTo(sx, topEnd - 16);
      ctx.lineTo(sx + spikeW / 2, topEnd + 12);
      ctx.lineTo(sx + spikeW, topEnd - 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sharp primary tip accent
      ctx.fillStyle = isGold ? '#ffffff' : '#e63946';
      ctx.beginPath();
      ctx.arc(sx + spikeW / 2, topEnd + 8, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = spikeColor;
    }

    // 2. BOTTOM OBSTACLE (Matching Ground Monolith)
    ctx.fillStyle = pillarBaseColor;
    ctx.fillRect(x, botStart + 24, w, this.height - (botStart + 24));
    ctx.fillStyle = pillarStripeColor;
    ctx.fillRect(x + w * 0.45, botStart + 24, w * 0.55, this.height - (botStart + 24));

    ctx.strokeStyle = '#111216';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, botStart + 24, w, this.height - (botStart + 24));

    // Primary Color Inset Block
    ctx.fillStyle = accentBlockColor;
    ctx.fillRect(x + 8, botStart + 48, w - 16, 24);
    ctx.strokeRect(x + 8, botStart + 48, w - 16, 24);

    // Bauhaus Lintel Block with Circular Aperture
    ctx.fillStyle = lintelColor;
    ctx.fillRect(x - 4, botStart + 16, w + 8, 16);
    ctx.strokeRect(x - 4, botStart + 16, w + 8, 16);

    ctx.fillStyle = '#111216';
    ctx.beginPath();
    ctx.arc(x + w / 2, botStart + 24, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Spikes pointing up
    ctx.fillStyle = spikeColor;
    ctx.strokeStyle = '#111216';
    ctx.lineWidth = 2;
    for (let i = 0; i < spikeCount; i++) {
      const sx = x + 4 + i * spikeW;
      ctx.beginPath();
      ctx.moveTo(sx, botStart + 16);
      ctx.lineTo(sx + spikeW / 2, botStart - 12);
      ctx.lineTo(sx + spikeW, botStart + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sharp primary tip accent
      ctx.fillStyle = isGold ? '#ffffff' : '#e63946';
      ctx.beginPath();
      ctx.arc(sx + spikeW / 2, botStart - 8, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = spikeColor;
    }

    // 3. CORRIDOR OF BLADES: Alexander Calder Kinetic Bauhaus Pendulum
    if (obs.isPendulum) {
      const pivotX = x + w / 2;
      const pivotY = topEnd;
      const chainLen = obs.gapHeight * 0.45;
      const bladeX = pivotX + Math.sin(obs.pendulumAngle) * chainLen;
      const bladeY = pivotY + Math.cos(obs.pendulumAngle) * chainLen;

      // Precision tension rod with central circular counterweight
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bladeX, bladeY);
      ctx.stroke();

      // Calder-style Circular Counterweight (Bauhaus Cobalt Blue)
      const midX = (pivotX + bladeX) / 2;
      const midY = (pivotY + bladeY) / 2;
      ctx.fillStyle = '#1d4ed8';
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(midX, midY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner Canary Pip
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(midX, midY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Kinetic Crescent Guillotine Head
      ctx.save();
      ctx.translate(bladeX, bladeY);
      ctx.rotate(obs.pendulumAngle);

      // Mirror Steel Semicircle
      ctx.fillStyle = '#f8f6f0';
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI); // Pure semicircle
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sharp Vermilion Accent Arc
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Central Bauhaus Pivot Ring
      ctx.fillStyle = '#111216';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }

  // --- COLLECTIBLES RENDERING (Bauhaus Geometric Construct Tokens) ---
  renderCollectible(item) {
    if (item.collected) return;
    const ctx = this.ctx;
    const cx = item.x;
    const cy = item.y + Math.sin(item.time) * 5;

    ctx.save();

    if (item.type === 'FOOD') {
      // Sleek Bauhaus Geometric Nourishment
      // Concentric Disc Pie with Angular Slice Cutout
      ctx.fillStyle = '#f8f6f0'; // Warm ivory crust
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0.4, Math.PI * 2 - 0.4);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden filling plane
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0.4, Math.PI * 2 - 0.4);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();

      // Modernist Emerald Aura Ring
      ctx.strokeStyle = '#06d6a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 19, 0, Math.PI * 2);
      ctx.stroke();

    } else if (item.type === 'GOLD') {
      // Bauhaus Gold Medallion: Cobalt Ring + Canary Disc + Square Core
      // Outer Cobalt Accent Ring
      ctx.fillStyle = '#1d4ed8';
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Canary Yellow Geometric Plate
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fill();

      // Square Aperture Center
      ctx.fillStyle = '#111216';
      ctx.fillRect(cx - 3.5, cy - 3.5, 7, 7);

    } else if (item.type === 'RUBY') {
      // Bauhaus Faceted Rhomboid Diamond (Radiant Vermilion)
      ctx.fillStyle = '#e63946';
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx + 12, cy - 3);
      ctx.lineTo(cx, cy + 14);
      ctx.lineTo(cx - 12, cy - 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Stark Ivory Facet Highlight
      ctx.fillStyle = '#f8f6f0';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx + 12, cy - 3);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();

    } else if (item.type === 'SCROLL') {
      // Modernist Bauhaus Cylinder Scroll
      ctx.fillStyle = '#f8f6f0';
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 10, cy - 12, 20, 24);
      ctx.strokeRect(cx - 10, cy - 12, 20, 24);

      // Bauhaus Violet Primary Band
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(cx - 10, cy - 3, 20, 6);

      // Lightning Chevron
      ctx.fillStyle = '#ffb703';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', cx, cy);

    } else if (item.type === 'CHEST') {
      // Bauhaus Constructivist Mystery Cube (Isometric Color Blocks)
      const size = 13;
      
      // Top Plane: Bauhaus Canary Yellow
      ctx.fillStyle = '#ffb703';
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size, cy - size * 0.4);
      ctx.lineTo(cx, cy + size * 0.2);
      ctx.lineTo(cx - size, cy - size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Left Plane: Bauhaus Vermilion Red
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.moveTo(cx - size, cy - size * 0.4);
      ctx.lineTo(cx, cy + size * 0.2);
      ctx.lineTo(cx, cy + size * 1.2);
      ctx.lineTo(cx - size, cy + size * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Plane: Bauhaus Cobalt Blue
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.moveTo(cx, cy + size * 0.2);
      ctx.lineTo(cx + size, cy - size * 0.4);
      ctx.lineTo(cx + size, cy + size * 0.6);
      ctx.lineTo(cx, cy + size * 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden Center Lock Disc
      ctx.fillStyle = '#f8f6f0';
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pulsing Concentric Aura Ring
      const pulse = (Math.sin(item.time * 5) + 1) * 0.5;
      ctx.strokeStyle = `rgba(255, 183, 3, ${0.4 + pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 22 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- GHOST TRAILS (Bauhaus Kinetic Geometric Afterimages) ---
  renderGhostTrails(player) {
    if (!player.trailHistory || player.trailHistory.length === 0) return;
    const ctx = this.ctx;

    for (let i = 0; i < player.trailHistory.length; i++) {
      const t = player.trailHistory[i];
      if (t.alpha <= 0.05) continue;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rotation);
      ctx.globalAlpha = t.alpha * 0.5;

      // Alternating Bauhaus Primary Concentric Rings
      const ringColor = (i % 2 === 0) ? '#1d4ed8' : '#ffb703';
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -6, 17 - i * 2, 0, Math.PI * 2);
      ctx.stroke();

      // Trailing geometric diamond pip
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.moveTo(-18 - i * 6, -6);
      ctx.lineTo(-14 - i * 6, -10);
      ctx.lineTo(-10 - i * 6, -6);
      ctx.lineTo(-14 - i * 6, -2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  // --- DUNGEONEER PLAYER (Iconic Bauhaus Geometric Knight) ---
  renderDungeoneer(player) {
    const ctx = this.ctx;
    const px = player.x;
    const py = player.y;

    if (player.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(player.rotation);

    // Juice: Dynamic Squash & Stretch scaling
    ctx.scale(player.squashX || 1, player.squashY || 1);

    const skinKey = player.selectedHelmet || 'JUSTICE';
    const helmetDef = CONFIG.HELMETS[skinKey] || CONFIG.HELMETS.JUSTICE;

    // 1. Constructivist Faceted Cloak
    ctx.fillStyle = '#111216';
    ctx.strokeStyle = '#1d4ed8'; // Cobalt edge seam
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.lineTo(-34 - Math.abs(player.vy * 0.04), 18);
    ctx.lineTo(-14, 16);
    ctx.lineTo(-4, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Minimalist Leather Knapsack (Classic Knightmare Food Pouch)
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#111216';
    ctx.lineWidth = 1.8;
    ctx.fillRect(-18, 4, 14, 12);
    ctx.strokeRect(-18, 4, 14, 12);

    // Knapsack brass square buckle
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(-13, 8, 4, 4);

    // 3. Torso / Tunic (Color-blocked Bauhaus Slate & Ivory)
    ctx.fillStyle = '#242834';
    ctx.strokeStyle = '#111216';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-2, 8, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. THE BAUHAUS HELMET (Pure Modernist Geometry)
    // Left Constructivist Horn Wing
    ctx.fillStyle = helmetDef.hornColor;
    ctx.strokeStyle = '#111216';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-8, -12);
    ctx.lineTo(-26, -34);
    ctx.lineTo(-20, -18);
    ctx.lineTo(-4, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Constructivist Horn Wing
    ctx.beginPath();
    ctx.moveTo(8, -12);
    ctx.lineTo(26, -34);
    ctx.lineTo(20, -18);
    ctx.lineTo(4, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Special Motley Jester Bells (Clean Bauhaus spheres)
    if (skinKey === 'JESTER') {
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(-26, -34, 4.5, 0, Math.PI * 2);
      ctx.arc(26, -34, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Special Midas Ziggurat Crown Crest
    if (skinKey === 'MIDAS') {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-10, -28, 20, 6);
      ctx.fillRect(-6, -34, 12, 6);
      ctx.strokeRect(-10, -28, 20, 6);
      ctx.strokeRect(-6, -34, 12, 6);
    }

    // Dome of Helmet: Pristine Bauhaus Semicircle
    ctx.fillStyle = helmetDef.domeColor;
    ctx.strokeStyle = '#111216';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.arc(0, -6, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Helmet Primary Color Split Plane
    ctx.fillStyle = 'rgba(248, 246, 240, 0.22)';
    ctx.beginPath();
    ctx.arc(0, -6, 18, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();

    // Iconic Bauhaus T-Bar Visor (Stark Black Precision Slit)
    ctx.fillStyle = '#111216';
    ctx.fillRect(-13, -8, 26, 5.5);
    ctx.fillRect(-2.5, -8, 5, 17);

    // Glowing Circular Optic Lenses
    const eyeColor = helmetDef.visorColor || '#06d6a0';
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-6, -5.5, 2.5, 0, Math.PI * 2);
    ctx.arc(6, -5.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Semicircular Top Fin Plume
    ctx.fillStyle = eyeColor;
    ctx.strokeStyle = '#111216';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -24, 5, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Active Powerup Overlays
    if (player.activePowerup === 'GARGOYLE_DASH') {
      // Sonic rush constructivist shock cone
      ctx.strokeStyle = '#e63946';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 36, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    } else if (player.activePowerup === 'TIME_DIAL') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (player.activePowerup === 'MAGNETIC_AMULET') {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 34 + Math.sin(Date.now() / 100) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 6. Active Shield Runic Orbitals
    if (player.shields > 0) {
      const shieldTime = Date.now() / 350;
      for (let s = 0; s < player.shields; s++) {
        const angle = shieldTime + (s * (Math.PI * 2 / player.shields));
        const sx = Math.cos(angle) * 32;
        const sy = Math.sin(angle) * 32;

        ctx.fillStyle = '#ffb703';
        ctx.strokeStyle = '#111216';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
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
      // Render as crisp Bauhaus circular or diamond dot
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- FLOATING COMBAT & REWARD TEXT (Bauhaus Typography) ---
  renderFloatingTexts(floatingTexts) {
    if (!floatingTexts || floatingTexts.length === 0) return;
    const ctx = this.ctx;

    for (const ft of floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, ft.alpha));

      // Font: Space Grotesk / Bold Modernist
      const fSize = Math.round(ft.size * (ft.scale || 1));
      ctx.font = `bold ${fSize}px 'Space Grotesk', -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Crisp contrast outline
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, ft.x, ft.y);

      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // --- CANVAS IN-GAME HUD OVERLAYS (Bauhaus Badge & Powerup Gauge) ---
  renderCanvasHUD(player) {
    const ctx = this.ctx;

    // 1. Bauhaus Combo Multiplier Badge
    if (player.comboCount > 1) {
      ctx.save();
      const cx = this.width / 2;
      const cy = 56;
      const pulse = 1 + Math.sin(Date.now() / 120) * 0.06;

      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);

      // Bauhaus Pill Badge with bold black stroke
      ctx.fillStyle = '#111216';
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-90, -18, 180, 36, 18);
      ctx.fill();
      ctx.stroke();

      // Left Accent Dot
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(-72, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Right Accent Dot
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.arc(72, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffb703';
      ctx.font = "bold 15px 'Space Grotesk', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⚡ COMBO ×${player.comboCount}!`, 0, 0);

      ctx.restore();
    }

    // 2. Active Power-Up Constructivist Gauge
    if (player.activePowerup) {
      const def = CONFIG.POWERUPS[player.activePowerup];
      if (def) {
        ctx.save();
        const px = this.width / 2;
        const py = player.comboCount > 1 ? 98 : 56;

        ctx.fillStyle = '#111216';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-110, -15, 220, 30, 15);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = "bold 13px 'Space Grotesk', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const timeLeft = Math.max(0, player.powerupTimeRemaining).toFixed(1);
        ctx.fillText(`${def.icon} ${def.name}: ${timeLeft}s`, 0, 0);

        ctx.restore();
      }
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
