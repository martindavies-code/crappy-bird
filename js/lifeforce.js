/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Life Force Clock Controller & Iconic Knightmare Degrading Face Renderer
 * Military-grade defensive state, zero-NaN guarantees, and responsive Canvas 2D face rendering.
 */

import { CONFIG } from './config.js';
import { audio } from './audio.js';
import { storage } from './storage.js';

export const LIFE_STAGE = {
  GREEN: 'GREEN',
  AMBER: 'AMBER',
  RED: 'RED',
  SKULL: 'SKULL'
};

export class LifeForceClock {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement && typeof canvasElement.getContext === 'function' ? canvasElement.getContext('2d') : null;
    
    this.current = 100;
    this.max = 100;
    this.decayRate = CONFIG.BASE_DECAY_RATE;
    this.stage = LIFE_STAGE.GREEN;
    this.lastStage = LIFE_STAGE.GREEN;
    this.isFlashing = false;
    this.flashTimer = 0;
    this.pulsePhase = 0;
  }

  reset(maxLifeForce = 100) {
    const validMax = (Number.isFinite(maxLifeForce) && maxLifeForce > 0) ? maxLifeForce : 100;
    this.max = validMax;
    this.current = validMax;
    this.stage = LIFE_STAGE.GREEN;
    this.lastStage = LIFE_STAGE.GREEN;
    this.isFlashing = false;
    this.flashTimer = 0;
    audio.stopRedHeartbeat();
  }

  update(dt) {
    const validDt = (Number.isFinite(dt) && dt > 0) ? dt : 0;
    
    // Tick down life force
    this.current = Math.max(0, this.current - this.decayRate * validDt);
    const pct = this.getPercentage();

    // Check stages
    if (pct > 65) {
      this.stage = LIFE_STAGE.GREEN;
    } else if (pct > 32) {
      this.stage = LIFE_STAGE.AMBER;
    } else if (pct > 0) {
      this.stage = LIFE_STAGE.RED;
    } else {
      this.stage = LIFE_STAGE.SKULL;
    }

    // Stage transition events & sounds
    if (this.stage !== this.lastStage) {
      this.handleStageTransition(this.stage, this.lastStage);
      this.lastStage = this.stage;
    }

    // Pulse phase for animations
    this.pulsePhase += validDt * 4;
    if (this.flashTimer > 0) {
      this.flashTimer -= validDt;
      this.isFlashing = Math.sin(this.flashTimer * 20) > 0;
    } else {
      this.isFlashing = false;
    }

    this.renderFace();
  }

  handleStageTransition(newStage, oldStage) {
    const dispatch = (stage, message) => {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new CustomEvent('lifeforce-stage', {
            detail: { stage, message }
          }));
        } catch (e) {}
      }
    };

    if (newStage === LIFE_STAGE.AMBER && oldStage === LIFE_STAGE.GREEN) {
      audio.playAmberWarning();
      audio.stopRedHeartbeat();
      dispatch('AMBER', 'Life Force Status: Amber! Seek nourishment!');
    } else if (newStage === LIFE_STAGE.RED) {
      audio.startRedHeartbeat();
      dispatch('RED', 'Life Force Status: RED! Danger! The skull looms!');
    } else if (newStage === LIFE_STAGE.GREEN && oldStage !== LIFE_STAGE.GREEN) {
      audio.stopRedHeartbeat();
      dispatch('GREEN', 'Life Force Restored: Green Visor secured.');
    } else if (newStage === LIFE_STAGE.SKULL) {
      audio.stopRedHeartbeat();
      audio.playDeathGong();
      dispatch('SKULL', 'Life Force Depleted: The Skull of Doom claims another soul.');
    }
  }

  feed(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const prev = this.current;
    this.current = Math.min(this.max, this.current + amount);
    this.flashTimer = 0.4;
    return this.current - prev;
  }

  damage(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.current = Math.max(0, this.current - amount);
    this.flashTimer = 0.5;
  }

  getPercentage() {
    if (!this.max || this.max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((this.current / this.max) * 100)));
  }

  isDead() {
    return this.current <= 0;
  }

  getStageDescription() {
    switch (this.stage) {
      case LIFE_STAGE.GREEN: return { stage: 'GREEN', label: 'Green Visor', status: 'Plentiful', color: '#2ec4b6' };
      case LIFE_STAGE.AMBER: return { stage: 'AMBER', label: 'Amber Guard', status: 'Warning', color: '#ffb703' };
      case LIFE_STAGE.RED: return { stage: 'RED', label: 'Red Menace', status: 'Critical', color: '#e63946' };
      case LIFE_STAGE.SKULL: return { stage: 'SKULL', label: 'Skull of Doom', status: 'Terminal', color: '#f8f9fa' };
      default: return { stage: 'GREEN', label: 'Unknown', status: 'Stable', color: '#2ec4b6' };
    }
  }

  safeDrawEllipse(ctx, cx, cy, rx, ry, rotation = 0) {
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
    } else {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.scale(rx, ry);
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.restore();
    }
  }

  /**
   * Render the iconic Knightmare peeling face on the clock canvas
   */
  renderFace() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    const cx = w / 2;
    const cy = h / 2 + 4;
    const pct = this.getPercentage();

    ctx.clearRect(0, 0, w, h);

    // Outer Clock Medallion / Iron Frame
    ctx.save();
    
    // Outer radial vignette & Bauhaus Dial
    const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 40);
    bgGrad.addColorStop(0, '#1c1f28');
    bgGrad.addColorStop(1, '#0e1017');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fill();

    // Bauhaus Precision Tick-Mark Gauge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const x1 = cx + Math.cos(angle) * 35;
      const y1 = cy + Math.sin(angle) * 35;
      const x2 = cx + Math.cos(angle) * 38;
      const y2 = cy + Math.sin(angle) * 38;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Modernist Outer Primary Ring
    let ringColor = '#10b981'; // Bauhaus Emerald
    let ringGlow = 'rgba(16, 185, 129, 0.45)';
    if (this.stage === LIFE_STAGE.AMBER) {
      ringColor = '#ffb703'; // Bauhaus Canary Yellow
      ringGlow = 'rgba(255, 183, 3, 0.5)';
    } else if (this.stage === LIFE_STAGE.RED) {
      ringColor = Math.sin(this.pulsePhase) > 0 ? '#e63946' : '#991b1b'; // Bauhaus Vermilion
      ringGlow = 'rgba(230, 57, 70, 0.8)';
    } else if (this.stage === LIFE_STAGE.SKULL) {
      ringColor = '#f8f6f0'; // Bauhaus Warm White
      ringGlow = 'rgba(248, 246, 240, 0.3)';
    }

    ctx.shadowColor = ringGlow;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 37.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // --- BAUHAUS CONSTRUCTIVIST HORNS ---
    // Pure geometric triangular wing-fins with bold modernist color blocks
    const hornColor = (this.stage === LIFE_STAGE.SKULL) ? '#cbd5e1' : '#ffb703';
    ctx.fillStyle = hornColor;
    ctx.strokeStyle = '#111216';
    ctx.lineWidth = 2;

    // Left Geometric Horn Crest
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 10);
    ctx.lineTo(cx - 36, cy - 32);
    ctx.lineTo(cx - 28, cy - 12);
    ctx.lineTo(cx - 14, cy - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Left Inner Horn Facet
    ctx.fillStyle = '#f8f6f0';
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 10);
    ctx.lineTo(cx - 30, cy - 26);
    ctx.lineTo(cx - 22, cy - 12);
    ctx.closePath();
    ctx.fill();

    // Right Geometric Horn Crest
    ctx.fillStyle = hornColor;
    ctx.beginPath();
    ctx.moveTo(cx + 15, cy - 10);
    ctx.lineTo(cx + 36, cy - 32);
    ctx.lineTo(cx + 28, cy - 12);
    ctx.lineTo(cx + 14, cy - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Inner Horn Facet
    ctx.fillStyle = '#f8f6f0';
    ctx.beginPath();
    ctx.moveTo(cx + 15, cy - 10);
    ctx.lineTo(cx + 30, cy - 26);
    ctx.lineTo(cx + 22, cy - 12);
    ctx.closePath();
    ctx.fill();

    // --- BAUHAUS OSKAR SCHLEMMER MASK FACE ---
    if (this.stage === LIFE_STAGE.SKULL) {
      // --- BAUHAUS SKULL OF DOOM ---
      // Cranium: Pure geometric off-white circle
      ctx.fillStyle = '#f8f6f0';
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Lower Jaw: Clean constructivist rectangle
      ctx.fillStyle = '#e2dfd2';
      ctx.fillRect(cx - 10, cy + 9, 20, 11);
      ctx.strokeRect(cx - 10, cy + 9, 20, 11);

      // Sockets: Pure circular black cutouts
      ctx.fillStyle = '#111216';
      ctx.beginPath();
      ctx.arc(cx - 6.5, cy - 3.5, 4.8, 0, Math.PI * 2);
      ctx.arc(cx + 6.5, cy - 3.5, 4.8, 0, Math.PI * 2);
      ctx.fill();

      // Nasal Aperture: Crisp inverted equilateral triangle
      ctx.beginPath();
      ctx.moveTo(cx, cy + 5.5);
      ctx.lineTo(cx - 3.5, cy + 1.5);
      ctx.lineTo(cx + 3.5, cy + 1.5);
      ctx.closePath();
      ctx.fill();

      // Minimalist vertical teeth bars
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2;
      for (let t = -6; t <= 6; t += 3) {
        ctx.beginPath();
        ctx.moveTo(cx + t, cy + 9);
        ctx.lineTo(cx + t, cy + 20);
        ctx.stroke();
      }

    } else if (this.stage === LIFE_STAGE.RED) {
      // --- BAUHAUS RED MENACE (Constructivist Asymmetry) ---
      // Left plane: Stark Onyx Black
      ctx.fillStyle = '#111216';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, Math.PI * 0.5, Math.PI * 1.5);
      ctx.closePath();
      ctx.fill();

      // Right plane: Electric Bauhaus Vermilion Red
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, 0, Math.PI * 2);
      ctx.stroke();

      // Diagonal constructivist hazard bar cutting across the brow
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 14);
      ctx.lineTo(cx + 18, cy - 4);
      ctx.lineTo(cx + 18, cy - 9);
      ctx.lineTo(cx - 18, cy - 19);
      ctx.closePath();
      ctx.fill();

      // Twin intense circular glowing sensors
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx - 7, cy - 1, 4, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy - 1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner white pinpoint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 7, cy - 1, 1.5, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Exposed horizontal cyber-jaw grid
      ctx.fillStyle = '#f8f6f0';
      ctx.fillRect(cx - 9, cy + 9, 18, 7);
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 9, cy + 9, 18, 7);
      for (let t = -5; t <= 5; t += 3.5) {
        ctx.beginPath();
        ctx.moveTo(cx + t, cy + 9);
        ctx.lineTo(cx + t, cy + 16);
        ctx.stroke();
      }

    } else if (this.stage === LIFE_STAGE.AMBER) {
      // --- BAUHAUS AMBER GUARD (Geometric Division) ---
      // Cranium: Bauhaus Canary Yellow & Slate dual plane
      ctx.fillStyle = '#242834';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 18);
      ctx.lineTo(cx + 18, cy - 2);
      ctx.lineTo(cx + 18, cy + 18);
      ctx.lineTo(cx - 18, cy + 18);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, 0, Math.PI * 2);
      ctx.stroke();

      // Clean horizontal T-bar visor slit
      ctx.fillStyle = '#111216';
      ctx.fillRect(cx - 14, cy - 4.5, 28, 5);
      ctx.fillRect(cx - 2.5, cy - 4.5, 5, 17);

      // Geometric Amber circular optic sensors
      ctx.fillStyle = '#ffb703';
      ctx.shadowColor = '#ffb703';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx - 7, cy - 2, 3, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else {
      // --- BAUHAUS GREEN VISOR (Pure Geometric Harmony) ---
      // Upper Cranium: Slate & Emerald color-blocked dome
      ctx.fillStyle = '#242834';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, 0, Math.PI * 2);
      ctx.fill();

      // Emerald top quadrant
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      // Lower Ivory Jaw plate
      ctx.fillStyle = '#f8f6f0';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, 0, Math.PI * 2);
      ctx.stroke();

      // Iconic Bauhaus T-bar Visor: Stark black geometry
      ctx.fillStyle = '#111216';
      ctx.fillRect(cx - 14, cy - 4.5, 28, 5.5);
      ctx.fillRect(cx - 2.5, cy - 4.5, 5, 17);

      // Glowing Bauhaus Cyan/Teal Optic Nodes
      ctx.fillStyle = '#06d6a0';
      ctx.shadowColor = '#06d6a0';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx - 7, cy - 2, 3, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Bauhaus Semicircular Top Fin Crest
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#111216';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy - 22, 6, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
