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
    ctx.fillStyle = '#0a0d14';
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fill();

    // Metallic ring with color coding based on stage
    let ringColor = '#2ec4b6';
    if (this.stage === LIFE_STAGE.AMBER) ringColor = '#ffb703';
    if (this.stage === LIFE_STAGE.RED) {
      ringColor = Math.sin(this.pulsePhase) > 0 ? '#e63946' : '#7209b7';
    }
    if (this.stage === LIFE_STAGE.SKULL) ringColor = '#6c757d';

    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Horns of Justice on the helmet
    ctx.fillStyle = '#adb5bd';
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 1.5;

    // Left Horn
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 10);
    ctx.quadraticCurveTo(cx - 36, cy - 26, cx - 34, cy - 36);
    ctx.quadraticCurveTo(cx - 24, cy - 28, cx - 14, cy - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Horn
    ctx.beginPath();
    ctx.moveTo(cx + 20, cy - 10);
    ctx.quadraticCurveTo(cx + 36, cy - 26, cx + 34, cy - 36);
    ctx.quadraticCurveTo(cx + 24, cy - 28, cx + 14, cy - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Base Head Shape
    if (this.stage === LIFE_STAGE.SKULL) {
      // --- SKULL OF DOOM ---
      ctx.fillStyle = '#e9ecef';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 18, 0, Math.PI * 2);
      ctx.fill();

      // Jawbone
      ctx.fillRect(cx - 10, cy + 8, 20, 10);

      // Hollow Eye Sockets
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.ellipse(cx - 6, cy - 4, 4, 6, 0.1, 0, Math.PI * 2);
      ctx.ellipse(cx + 6, cy - 4, 4, 6, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Nose Cavity
      ctx.beginPath();
      ctx.moveTo(cx, cy + 2);
      ctx.lineTo(cx - 2, cy + 6);
      ctx.lineTo(cx + 2, cy + 6);
      ctx.closePath();
      ctx.fill();

      // Teeth notches
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let t = -6; t <= 6; t += 3) {
        ctx.beginPath();
        ctx.moveTo(cx + t, cy + 9);
        ctx.lineTo(cx + t, cy + 17);
        ctx.stroke();
      }

    } else if (this.stage === LIFE_STAGE.RED) {
      // --- RED MENACE (Flesh peeling, exposed teeth, burning red eyes) ---
      const peelRatio = (32 - pct) / 32; // 0 to 1
      ctx.fillStyle = '#8b0000'; // Raw sinew red
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 20, 0, Math.PI * 2);
      ctx.fill();

      // Remaining iron helmet piece peeling upwards
      ctx.fillStyle = '#495057';
      ctx.beginPath();
      ctx.arc(cx, cy - 8 - peelRatio * 4, 19, Math.PI, Math.PI * 2);
      ctx.fill();

      // Glowing malevolent scarlet eyes
      ctx.fillStyle = '#ff0054';
      ctx.shadowColor = '#ff0054';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx - 7, cy - 2, 3.5, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy - 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Exposed grin / teeth
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(cx - 8, cy + 8, 16, 5);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 8, cy + 8, 16, 5);

    } else if (this.stage === LIFE_STAGE.AMBER) {
      // --- AMBER GUARD (Visor cracked, amber tone, eyes visible) ---
      ctx.fillStyle = '#d4a373'; // Amber skin
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 20, 0, Math.PI * 2);
      ctx.fill();

      // Peeling metal helmet cap
      ctx.fillStyle = '#5c677d';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 21, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();

      // T-shaped Knightmare visor slit
      ctx.fillStyle = '#111';
      ctx.fillRect(cx - 12, cy - 5, 24, 4);
      ctx.fillRect(cx - 2, cy - 5, 4, 15);

      // Warning amber eyes behind the slit
      ctx.fillStyle = '#ffbe0b';
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 3, 2, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 3, 2, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // --- GREEN VISOR (Pristine Knightly Armored Face) ---
      // Full iron domed helmet
      ctx.fillStyle = '#343a40';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, 0, Math.PI * 2);
      ctx.fill();

      // Green magical sheen
      ctx.fillStyle = 'rgba(46, 196, 182, 0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 21, 0, Math.PI * 2);
      ctx.fill();

      // T-bar Knightmare visor with green glowing interior
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 13, cy - 5, 26, 5);
      ctx.fillRect(cx - 2.5, cy - 5, 5, 17);

      // Bright resolute green eyes
      ctx.fillStyle = '#2ec4b6';
      ctx.shadowColor = '#2ec4b6';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 2.5, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 2.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Crest plume on top of helmet
      ctx.fillStyle = '#06d6a0';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 22, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
