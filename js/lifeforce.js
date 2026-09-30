/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Life Force Clock Controller & Iconic Knightmare Degrading Face Renderer
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
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    
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
    this.max = maxLifeForce;
    this.current = maxLifeForce;
    this.stage = LIFE_STAGE.GREEN;
    this.lastStage = LIFE_STAGE.GREEN;
    this.isFlashing = false;
    this.flashTimer = 0;
    audio.stopRedHeartbeat();
  }

  update(dt) {
    // Tick down life force
    this.current = Math.max(0, this.current - this.decayRate * dt);
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
    this.pulsePhase += dt * 4;
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.isFlashing = Math.sin(this.flashTimer * 20) > 0;
    } else {
      this.isFlashing = false;
    }

    this.renderFace();
  }

  handleStageTransition(newStage, oldStage) {
    const dispatch = (stage, message) => {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('lifeforce-stage', {
          detail: { stage, message }
        }));
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
    }
  }

  feed(amount) {
    const prev = this.current;
    this.current = Math.min(this.max, this.current + amount);
    this.flashTimer = 0.4;
    return this.current - prev;
  }

  damage(amount) {
    this.current = Math.max(0, this.current - amount);
    this.flashTimer = 0.5;
  }

  getPercentage() {
    return Math.round((this.current / this.max) * 100);
  }

  isDead() {
    return this.current <= 0;
  }

  getStageDescription() {
    switch (this.stage) {
      case LIFE_STAGE.GREEN: return { label: 'Green Visor', status: 'Plentiful', color: '#2ec4b6' };
      case LIFE_STAGE.AMBER: return { label: 'Amber Guard', status: 'Warning', color: '#ffb703' };
      case LIFE_STAGE.RED: return { label: 'Red Menace', status: 'Critical', color: '#e63946' };
      case LIFE_STAGE.SKULL: return { label: 'Skull of Doom', status: 'Terminal', color: '#f8f9fa' };
      default: return { label: 'Unknown', status: 'Stable', color: '#2ec4b6' };
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
    const cx = w / 2;
    const cy = h / 2 + 4;
    const pct = this.getPercentage();

    ctx.clearRect(0, 0, w, h);

    // Outer Clock Medallion / Iron Frame
    ctx.save();
    
    // Outer radial vignette
    const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 40);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fill();

    // Metallic ring with stage color
    let ringColor = '#10b981';
    let ringGlow = 'rgba(16, 185, 129, 0.4)';
    if (this.stage === LIFE_STAGE.AMBER) {
      ringColor = '#f59e0b';
      ringGlow = 'rgba(245, 158, 11, 0.5)';
    } else if (this.stage === LIFE_STAGE.RED) {
      ringColor = Math.sin(this.pulsePhase) > 0 ? '#ef4444' : '#b91c1c';
      ringGlow = 'rgba(239, 68, 68, 0.8)';
    } else if (this.stage === LIFE_STAGE.SKULL) {
      ringColor = '#e2e8f0';
      ringGlow = 'rgba(226, 232, 240, 0.2)';
    }

    ctx.shadowColor = ringGlow;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Horns of Justice on the helmet - Golden Curved Horns
    const hornGrad = ctx.createLinearGradient(cx - 36, cy - 36, cx + 36, cy);
    hornGrad.addColorStop(0, '#fef08a');
    hornGrad.addColorStop(0.5, '#f59e0b');
    hornGrad.addColorStop(1, '#b45309');

    ctx.fillStyle = hornGrad;
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.8;

    // Left Horn
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 10);
    ctx.quadraticCurveTo(cx - 38, cy - 22, cx - 34, cy - 36);
    ctx.quadraticCurveTo(cx - 24, cy - 24, cx - 12, cy - 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Horn
    ctx.beginPath();
    ctx.moveTo(cx + 16, cy - 10);
    ctx.quadraticCurveTo(cx + 38, cy - 22, cx + 34, cy - 36);
    ctx.quadraticCurveTo(cx + 24, cy - 24, cx + 12, cy - 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Base Head Shape
    if (this.stage === LIFE_STAGE.SKULL) {
      // --- SKULL OF DOOM ---
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Jawbone
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(cx - 10, cy + 8, 20, 10);
      ctx.strokeRect(cx - 10, cy + 8, 20, 10);

      // Hollow Eye Sockets
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(cx - 6, cy - 4, 4.5, 6, 0.1, 0, Math.PI * 2);
      ctx.ellipse(cx + 6, cy - 4, 4.5, 6, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Nose Cavity
      ctx.beginPath();
      ctx.moveTo(cx, cy + 2);
      ctx.lineTo(cx - 2.5, cy + 6);
      ctx.lineTo(cx + 2.5, cy + 6);
      ctx.closePath();
      ctx.fill();

      // Teeth notches
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      for (let t = -6; t <= 6; t += 3) {
        ctx.beginPath();
        ctx.moveTo(cx + t, cy + 9);
        ctx.lineTo(cx + t, cy + 17);
        ctx.stroke();
      }

    } else if (this.stage === LIFE_STAGE.RED) {
      // --- RED MENACE (Flesh peeling, exposed teeth, burning red eyes) ---
      const peelRatio = (32 - pct) / 32;
      ctx.fillStyle = '#991b1b'; // Crimson flesh
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 20, 0, Math.PI * 2);
      ctx.fill();

      // Remaining iron helmet piece peeling upwards
      const redHelmGrad = ctx.createLinearGradient(cx, cy - 24, cx, cy);
      redHelmGrad.addColorStop(0, '#94a3b8');
      redHelmGrad.addColorStop(1, '#334155');
      ctx.fillStyle = redHelmGrad;
      ctx.beginPath();
      ctx.arc(cx, cy - 8 - peelRatio * 4, 19, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing malevolent scarlet eyes
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx - 6.5, cy - 2, 3.5, 0, Math.PI * 2);
      ctx.arc(cx + 6.5, cy - 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Exposed grin / teeth
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 8, cy + 8, 16, 5);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 8, cy + 8, 16, 5);

    } else if (this.stage === LIFE_STAGE.AMBER) {
      // --- AMBER GUARD (Visor cracked, amber tone, eyes visible) ---
      ctx.fillStyle = '#eab308'; // Rich amber
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 20, 0, Math.PI * 2);
      ctx.fill();

      // Peeling metal helmet cap
      const amberHelmGrad = ctx.createLinearGradient(cx, cy - 24, cx, cy);
      amberHelmGrad.addColorStop(0, '#cbd5e1');
      amberHelmGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = amberHelmGrad;
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 20, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // T-shaped Knightmare visor slit
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 12, cy - 5, 24, 4);
      ctx.fillRect(cx - 2, cy - 5, 4, 15);

      // Warning amber eyes behind the slit
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else {
      // --- GREEN VISOR (Pristine Knightly Armored Face) ---
      // Full polished steel helmet dome
      const steelGrad = ctx.createLinearGradient(cx - 20, cy - 20, cx + 20, cy + 20);
      steelGrad.addColorStop(0, '#f8fafc');
      steelGrad.addColorStop(0.3, '#cbd5e1');
      steelGrad.addColorStop(0.7, '#64748b');
      steelGrad.addColorStop(1, '#334155');

      ctx.fillStyle = steelGrad;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Green magical sheen overlay
      ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, 0, Math.PI * 2);
      ctx.fill();

      // T-bar Knightmare visor slit
      ctx.fillStyle = '#020617';
      ctx.fillRect(cx - 13, cy - 5, 26, 5.5);
      ctx.fillRect(cx - 2.5, cy - 5, 5, 17);

      // Radiant glowing turquoise eyes
      ctx.fillStyle = '#22d3ee';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 2.5, 2.8, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 2.5, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Crest plume on top of helmet
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 23, 5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }
}
