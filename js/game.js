/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Master Game Controller & Loop
 */

import { CONFIG } from './config.js';
import { storage } from './storage.js';
import { audio } from './audio.js';
import { upgrades } from './upgrades.js';
import { a11y } from './a11y.js';
import { Dungeoneer, Obstacle, Collectible, ParticleSystem } from './entities.js';
import { LifeForceClock } from './lifeforce.js';
import { GameRenderer } from './renderer.js';

export const GAME_STATE = {
  TITLE: 'TITLE',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

export class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new GameRenderer(this.canvas);
    this.lifeClockCanvas = document.getElementById('lifeforce-face-canvas');
    this.lifeForce = new LifeForceClock(this.lifeClockCanvas);
    
    this.state = GAME_STATE.TITLE;
    this.lastTime = 0;
    this.accumulator = 0;
    
    // In-Run Dynamic State
    this.dungeoneer = new Dungeoneer();
    this.obstacles = [];
    this.collectibles = [];
    this.particles = new ParticleSystem();
    
    this.distance = 0;              // Paces travelled
    this.goldCollectedRun = 0;
    this.foodEatenRun = 0;
    this.spellsCastRun = 0;
    this.currentChamberIndex = 0;
    
    this.obstacleSpawnTimer = 0;
    this.treguardBannerTimer = 0;
    this.timeScale = 1.0;           // Modified by Eyeshield spell or assist mode
    
    this.initDOMReferences();
    this.initEventListeners();
    this.renderer.resize();

    // Initial render
    this.lifeForce.reset(upgrades.getMaxLifeForce());
    this.lifeForce.renderFace();
    this.syncHUD();
  }

  initDOMReferences() {
    // HUD Elements
    this.elPaces = document.getElementById('hud-paces');
    this.elBest = document.getElementById('hud-best-paces');
    this.elGold = document.getElementById('hud-gold');
    this.elShields = document.getElementById('hud-shields');
    this.elChamberName = document.getElementById('hud-chamber-name');
    this.elTreguardBanner = document.getElementById('treguard-banner-text');
    this.elLifePct = document.getElementById('lifeforce-percentage');
    this.elLifeStage = document.getElementById('lifeforce-stage-pill');
    this.elSpellSlot = document.getElementById('hud-spell-slot');
    this.elSpellCooldown = document.getElementById('hud-spell-cooldown');
    
    // Dialogs
    this.dialogSanctuary = document.getElementById('dialog-sanctuary');
    this.dialogGameOver = document.getElementById('dialog-gameover');
    this.dialogSettings = document.getElementById('dialog-settings');
    this.dialogSpellbook = document.getElementById('dialog-spellbook');
  }

  initEventListeners() {
    // Window Resize
    window.addEventListener('resize', () => this.renderer.resize());

    // Keyboard Inputs
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // Pointer / Touch on Canvas
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.state === GAME_STATE.PLAYING) {
        if (storage.getSetting('holdToRise')) {
          this.dungeoneer.isHoldingRise = true;
        } else {
          this.playerFlap();
        }
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      e.preventDefault();
      if (storage.getSetting('holdToRise')) {
        this.dungeoneer.isHoldingRise = false;
      }
    });

    // Custom Key Capture listener if binding keys
    this.isRebindingKey = null;

    // Connect UI Action Buttons
    document.getElementById('btn-start-run')?.addEventListener('click', () => this.startNewRun());
    document.getElementById('btn-open-sanctuary')?.addEventListener('click', () => this.openSanctuary());
    document.getElementById('btn-open-settings')?.addEventListener('click', () => a11y.openModal('dialog-settings'));
    document.getElementById('btn-open-spellbook')?.addEventListener('click', () => a11y.openModal('dialog-spellbook'));
    document.getElementById('btn-quick-restart')?.addEventListener('click', () => {
      a11y.closeModal('dialog-gameover');
      this.startNewRun();
    });
    document.getElementById('btn-postrun-sanctuary')?.addEventListener('click', () => {
      a11y.closeModal('dialog-gameover');
      this.openSanctuary();
    });
    document.getElementById('btn-close-sanctuary')?.addEventListener('click', () => a11y.closeModal('dialog-sanctuary'));
    document.getElementById('btn-close-settings')?.addEventListener('click', () => a11y.closeModal('dialog-settings'));
    document.getElementById('btn-close-spellbook')?.addEventListener('click', () => a11y.closeModal('dialog-spellbook'));

    // In-HUD Cast Spell button
    document.getElementById('btn-cast-spell')?.addEventListener('click', () => this.playerCastSpell());

    // Settings Inputs Listeners
    this.setupSettingsListeners();

    // Listen for custom life force alert events
    window.addEventListener('lifeforce-stage', (e) => {
      const { stage, message } = e.detail;
      this.setTreguardBanner(message);
      if (stage === 'RED') {
        a11y.announceAssertive(message);
      } else {
        a11y.announcePolite(message);
      }
    });
  }

  setupSettingsListeners() {
    const chkContrast = document.getElementById('opt-high-contrast');
    if (chkContrast) {
      chkContrast.checked = !!storage.getSetting('highContrast');
      chkContrast.addEventListener('change', (e) => a11y.toggleHighContrast(e.target.checked));
    }

    const chkMotion = document.getElementById('opt-reduced-motion');
    if (chkMotion) {
      chkMotion.checked = !!storage.getSetting('reducedMotion');
      chkMotion.addEventListener('change', (e) => a11y.toggleReducedMotion(e.target.checked));
    }

    const chkDyslexic = document.getElementById('opt-dyslexic-font');
    if (chkDyslexic) {
      chkDyslexic.checked = !!storage.getSetting('dyslexicFont');
      chkDyslexic.addEventListener('change', (e) => a11y.toggleDyslexicFont(e.target.checked));
    }

    const chkHoldRise = document.getElementById('opt-hold-to-rise');
    if (chkHoldRise) {
      chkHoldRise.checked = !!storage.getSetting('holdToRise');
      chkHoldRise.addEventListener('change', (e) => a11y.setHoldToRise(e.target.checked));
    }

    const chkPractice = document.getElementById('opt-practice-mode');
    if (chkPractice) {
      chkPractice.checked = !!storage.getSetting('practiceMode');
      chkPractice.addEventListener('change', (e) => a11y.setPracticeMode(e.target.checked));
    }

    const selSpeed = document.getElementById('opt-game-speed');
    if (selSpeed) {
      selSpeed.value = storage.getSetting('gameSpeed') || 1.0;
      selSpeed.addEventListener('change', (e) => a11y.setGameSpeed(parseFloat(e.target.value)));
    }

    const sldMaster = document.getElementById('opt-volume-master');
    if (sldMaster) {
      sldMaster.value = storage.getSetting('masterVolume') ?? 0.8;
      sldMaster.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        storage.setSetting('masterVolume', v);
        audio.setMasterVolume(v);
      });
    }

    const sldMusic = document.getElementById('opt-volume-music');
    if (sldMusic) {
      sldMusic.value = storage.getSetting('musicVolume') ?? 0.4;
      sldMusic.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        storage.setSetting('musicVolume', v);
        audio.setMusicVolume(v);
      });
    }

    const sldSfx = document.getElementById('opt-volume-sfx');
    if (sldSfx) {
      sldSfx.value = storage.getSetting('sfxVolume') ?? 0.8;
      sldSfx.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        storage.setSetting('sfxVolume', v);
        audio.setSfxVolume(v);
      });
    }

    const chkCaptions = document.getElementById('opt-captions-enabled');
    if (chkCaptions) {
      chkCaptions.checked = storage.getSetting('captionsEnabled') ?? true;
      chkCaptions.addEventListener('change', (e) => {
        storage.setSetting('captionsEnabled', e.target.checked);
        a11y.announcePolite(`Captions ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    // Save Data Export/Import buttons
    document.getElementById('btn-export-save')?.addEventListener('click', () => {
      const dataStr = storage.exportDataJson();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knightmare_save_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      a11y.announcePolite('Save data exported to file.');
    });

    document.getElementById('btn-import-save')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (storage.importDataJson(evt.target.result)) {
            a11y.announcePolite('Save data successfully restored.');
            location.reload();
          } else {
            alert('Failed to import save data: Invalid format.');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });

    document.getElementById('btn-reset-save')?.addEventListener('click', () => {
      if (confirm('Are you sure you wish to wipe all Dunshelm progress and gold? This cannot be undone!')) {
        storage.resetAll();
        a11y.announcePolite('All data has been reset.');
        location.reload();
      }
    });
  }

  handleKeyDown(e) {
    if (this.isRebindingKey) {
      e.preventDefault();
      this.finishRebinding(e.code);
      return;
    }

    const customKeys = storage.getSetting('customKeys') || CONFIG.DEFAULT_CONTROLS;
    const isFlapKey = CONFIG.DEFAULT_CONTROLS.flap.includes(e.code) || e.code === customKeys.flap;
    const isSpellKey = CONFIG.DEFAULT_CONTROLS.spell.includes(e.code) || e.code === customKeys.spell;
    const isPauseKey = CONFIG.DEFAULT_CONTROLS.pause.includes(e.code) || e.code === customKeys.pause;

    if (this.state === GAME_STATE.PLAYING) {
      if (isFlapKey) {
        e.preventDefault();
        if (storage.getSetting('holdToRise')) {
          this.dungeoneer.isHoldingRise = true;
        } else {
          this.playerFlap();
        }
      } else if (isSpellKey) {
        e.preventDefault();
        this.playerCastSpell();
      } else if (isPauseKey) {
        e.preventDefault();
        this.togglePause();
      }
    } else if (this.state === GAME_STATE.PAUSED) {
      if (isPauseKey) {
        e.preventDefault();
        this.togglePause();
      }
    }
  }

  handleKeyUp(e) {
    const customKeys = storage.getSetting('customKeys') || CONFIG.DEFAULT_CONTROLS;
    const isFlapKey = CONFIG.DEFAULT_CONTROLS.flap.includes(e.code) || e.code === customKeys.flap;
    if (isFlapKey && storage.getSetting('holdToRise')) {
      this.dungeoneer.isHoldingRise = false;
    }
  }

  playerFlap() {
    this.dungeoneer.flap();
    this.particles.emitFlapFeathers(this.dungeoneer.x, this.dungeoneer.y);
  }

  playerCastSpell() {
    // Cast DISMISS by default, or cycle active spells
    const chosenSpell = 'DISMISS';
    if (this.dungeoneer.castSpell(chosenSpell)) {
      this.spellsCastRun++;
      storage.incrementStat('totalSpellsCast');
      this.particles.emitSpellExplosion(this.dungeoneer.x + 80, this.dungeoneer.y, '#e63946');
      this.renderer.triggerShake(10, 0.4);

      // Dismiss nearest obstacle ahead
      const nextObs = this.obstacles.find(o => o.x > this.dungeoneer.x && !o.isDismissed);
      if (nextObs) {
        nextObs.dismiss();
        this.particles.emitSpellExplosion(nextObs.x + nextObs.width / 2, nextObs.gapCenterY, '#7209b7');
      }

      this.setTreguardBanner('Spell cast: D-I-S-M-I-S-S! Obstacle shattered!');
      a11y.announceAssertive('Spell invoked: DISMISS! Obstacle pulverized!');
    }
  }

  togglePause() {
    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PAUSED;
      audio.stopBgm();
      this.setTreguardBanner('Journey paused. Rest awhile, Stranger.');
      a11y.announcePolite('Game paused.');
      document.getElementById('pause-overlay')?.classList.remove('hidden');
    } else if (this.state === GAME_STATE.PAUSED) {
      this.state = GAME_STATE.PLAYING;
      audio.startBgm();
      this.setTreguardBanner('Resuming flight! Tread carefully!');
      a11y.announcePolite('Game resumed.');
      document.getElementById('pause-overlay')?.classList.add('hidden');
      this.lastTime = performance.now();
    }
  }

  // --- RUN LIFECYCLE ---

  startNewRun() {
    audio.init();
    audio.playTreguardFanfare();
    audio.startBgm();

    this.state = GAME_STATE.PLAYING;
    this.distance = 0;
    this.goldCollectedRun = 0;
    this.foodEatenRun = 0;
    this.spellsCastRun = 0;
    this.currentChamberIndex = 0;
    this.obstacleSpawnTimer = 0;

    this.obstacles = [];
    this.collectibles = [];
    this.particles.clear();
    upgrades.resetRunRelics();

    // Reset dungeoneer with sanctuary upgrades applied
    this.dungeoneer.reset();
    
    // Reset Life Force Clock
    const maxLife = upgrades.getMaxLifeForce();
    this.lifeForce.reset(maxLife);
    this.lifeForce.decayRate = CONFIG.BASE_DECAY_RATE * upgrades.getLifeForceDecayMultiplier();

    storage.incrementStat('runsAttempted');

    // UI Updates
    document.getElementById('start-screen-card')?.classList.add('hidden');
    document.getElementById('pause-overlay')?.classList.add('hidden');
    a11y.closeModal('dialog-gameover');

    const startMsg = CONFIG.TREGUARD_SPEECHES.START[Math.floor(Math.random() * CONFIG.TREGUARD_SPEECHES.START.length)];
    this.setTreguardBanner(startMsg);
    audio.speakTreguard(startMsg);
    a11y.announcePolite(`New run begun in ${this.getCurrentChamber().name}. Flap with Space or tap to ascend.`);

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  gameOver(reason = 'LIFE_FORCE_EXPIRED') {
    this.state = GAME_STATE.GAMEOVER;
    audio.stopBgm();
    audio.stopRedHeartbeat();
    audio.playDeathGong();

    // Save stats
    const isNewHigh = storage.updateHighScore(this.distance);
    storage.addGold(this.goldCollectedRun);
    storage.incrementStat('totalPaces', this.distance);
    storage.incrementStat('totalFoodEaten', this.foodEatenRun);

    // Populate Game Over Dialog
    document.getElementById('postrun-paces').textContent = `${this.distance} paces`;
    document.getElementById('postrun-best').textContent = `${storage.get('highScore')} paces`;
    document.getElementById('postrun-gold').textContent = `${this.goldCollectedRun} gold`;
    document.getElementById('postrun-food').textContent = `${this.foodEatenRun} rations`;
    document.getElementById('postrun-spells').textContent = `${this.spellsCastRun} spells`;
    document.getElementById('postrun-total-gold').textContent = `${storage.get('gold')} gold`;

    const titleEl = document.getElementById('gameover-title');
    if (reason === 'COLLISION') {
      titleEl.textContent = 'Crushed by the Dungeon!';
    } else {
      titleEl.textContent = 'Life Force Extinguished!';
    }

    const deathQuote = CONFIG.TREGUARD_SPEECHES.DEATH[Math.floor(Math.random() * CONFIG.TREGUARD_SPEECHES.DEATH.length)];
    document.getElementById('gameover-quote').textContent = `"${deathQuote}" — Treguard`;
    audio.speakTreguard(deathQuote);

    a11y.openModal('dialog-gameover');
    a11y.announceAssertive(`Game over! ${reason === 'COLLISION' ? 'Fatal obstacle impact.' : 'Life force reached zero.'} You covered ${this.distance} paces and gathered ${this.goldCollectedRun} gold.`);
  }

  openSanctuary() {
    this.renderSanctuaryUpgrades();
    document.getElementById('sanctuary-gold-counter').textContent = `${storage.get('gold')} 🪙`;
    a11y.openModal('dialog-sanctuary');
    const quote = CONFIG.TREGUARD_SPEECHES.SANCTUARY[Math.floor(Math.random() * CONFIG.TREGUARD_SPEECHES.SANCTUARY.length)];
    audio.speakTreguard(quote);
    a11y.announcePolite(`Entered Treguard's Sanctuary. Current treasury: ${storage.get('gold')} gold.`);
  }

  renderSanctuaryUpgrades() {
    const container = document.getElementById('sanctuary-upgrades-grid');
    if (!container) return;
    container.innerHTML = '';

    for (const key in CONFIG.UPGRADES) {
      const info = upgrades.getUpgradeInfo(key);
      const card = document.createElement('div');
      card.className = `upgrade-card ${info.isMax ? 'maxed' : ''}`;
      card.setAttribute('tabindex', '0');

      card.innerHTML = `
        <div class="upgrade-header">
          <span class="upgrade-icon" aria-hidden="true">${info.icon}</span>
          <h3 class="upgrade-title">${info.name}</h3>
        </div>
        <p class="upgrade-desc">${info.description}</p>
        <div class="upgrade-tier-bar" role="progressbar" aria-valuenow="${info.currentTier}" aria-valuemin="0" aria-valuemax="${info.maxTier}" aria-label="${info.name} tier">
          ${Array.from({ length: info.maxTier }, (_, i) => `<span class="tier-pip ${i < info.currentTier ? 'active' : ''}"></span>`).join('')}
        </div>
        <div class="upgrade-footer">
          <span class="upgrade-tier-label">Rank: ${info.currentTier} / ${info.maxTier}</span>
          ${info.isMax 
            ? `<button class="btn-sanctuary-buy" disabled>MAX RANK</button>` 
            : `<button class="btn-sanctuary-buy ${storage.get('gold') >= info.nextCost ? 'can-afford' : 'disabled'}" data-upgrade-id="${key}">
                Buy: ${info.nextCost} 🪙
              </button>`
          }
        </div>
      `;

      container.appendChild(card);
    }

    // Attach buy listeners
    container.querySelectorAll('.btn-sanctuary-buy:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-upgrade-id');
        const res = upgrades.purchase(id);
        if (res.success) {
          document.getElementById('sanctuary-gold-counter').textContent = `${res.remainingGold} 🪙`;
          this.renderSanctuaryUpgrades();
          a11y.announcePolite(`Upgraded ${CONFIG.UPGRADES[id].name} to tier ${res.newTier}. Remaining gold: ${res.remainingGold}.`);
        } else {
          a11y.announceAssertive(res.reason);
        }
      });
    });
  }

  // --- CORE GAME LOOP ---

  gameLoop(timestamp) {
    if (this.state !== GAME_STATE.PLAYING) return;

    const dtRaw = Math.min((timestamp - this.lastTime) / 1000, 0.08);
    this.lastTime = timestamp;

    const userGameSpeed = storage.getSetting('gameSpeed') || 1.0;
    const spellTimeDilation = (this.dungeoneer.activeSpell === 'EYESHIELD') ? 0.45 : 1.0;
    const dt = dtRaw * userGameSpeed * spellTimeDilation;

    this.update(dt);
    this.renderer.render({
      dungeoneer: this.dungeoneer,
      obstacles: this.obstacles,
      collectibles: this.collectibles,
      particles: this.particles,
      currentChamber: this.getCurrentChamber()
    });

    this.syncHUD();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    const chamber = this.getCurrentChamber();
    const effectiveGravity = CONFIG.BASE_GRAVITY * upgrades.getGravityMultiplier();
    const scrollSpeed = CONFIG.BASE_HORIZONTAL_SPEED;

    // 1. Update Dungeoneer
    this.dungeoneer.update(dt, effectiveGravity, CONFIG.MAX_FALL_SPEED, CONFIG.CANVAS_HEIGHT);

    // 2. Update Life Force Clock
    this.lifeForce.update(dt);
    if (this.lifeForce.isDead()) {
      // Check for Second Wind Revive
      if (upgrades.hasSecondWind() && !this.dungeoneer.hasUsedSecondWind) {
        this.dungeoneer.hasUsedSecondWind = true;
        this.lifeForce.current = this.lifeForce.max * 0.5;
        this.lifeForce.renderFace();
        audio.playRevive();
        this.particles.emitSpellExplosion(this.dungeoneer.x, this.dungeoneer.y, '#ffd166');
        this.setTreguardBanner("Treguard's Second Wind invokes! Arise, Dungeoneer!");
        a11y.announceAssertive('Treguard has revived you with 50% life force!');
      } else if (!storage.getSetting('practiceMode')) {
        this.gameOver('LIFE_FORCE_EXPIRED');
        return;
      }
    }

    // 3. Increment Distance & Check Chamber Milestones
    this.distance += Math.round(scrollSpeed * dt * 0.1);
    this.checkChamberProgression();

    // 4. Update Renderer Scroll & Parallax
    this.renderer.update(dt, scrollSpeed);

    // 5. Spawn & Update Obstacles
    this.obstacleSpawnTimer += dt;
    const spawnThreshold = chamber.spacing / scrollSpeed;
    if (this.obstacleSpawnTimer > spawnThreshold) {
      this.obstacleSpawnTimer = 0;
      this.spawnObstaclePair(chamber);
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.update(dt, scrollSpeed);

      // Passed check for score & audio cue
      if (!obs.passed && obs.x + obs.width < this.dungeoneer.x) {
        obs.passed = true;
        storage.incrementStat('totalObstaclesCleared');
      }

      // Collision Check
      if (!obs.isDismissed && obs.collidesWith(this.dungeoneer)) {
        if (storage.getSetting('practiceMode')) {
          // Invincible in practice mode
          this.renderer.triggerShake(3, 0.2);
        } else {
          // Check if Armor of Justice absorbs it
          const absorbed = this.dungeoneer.absorbHit();
          if (absorbed) {
            this.renderer.triggerShake(12, 0.35);
            this.particles.emitShieldImpact(this.dungeoneer.x, this.dungeoneer.y);
            this.setTreguardBanner('Thy armor defused the strike! Mind the blades!');
            obs.dismiss(); // Shatter the obstacle passed
          } else {
            // Lethal hit
            if (upgrades.hasSecondWind() && !this.dungeoneer.hasUsedSecondWind) {
              this.dungeoneer.hasUsedSecondWind = true;
              this.dungeoneer.invulnerableTimer = 2.0;
              this.lifeForce.current = this.lifeForce.max * 0.5;
              audio.playRevive();
              obs.dismiss();
              this.setTreguardBanner("Resurrected by Treguard's Second Wind!");
              a11y.announceAssertive('Saved from death by Second Wind!');
            } else {
              this.gameOver('COLLISION');
              return;
            }
          }
        }
      }

      // Despawn off-screen obstacles
      if (obs.x < -100) {
        this.obstacles.splice(i, 1);
      }
    }

    // 6. Update Collectibles
    const hasMagnet = upgrades.hasRelic('SMIRKYS_AMULET');
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      item.update(dt, scrollSpeed, { x: this.dungeoneer.x, y: this.dungeoneer.y }, hasMagnet);

      if (item.collidesWith(this.dungeoneer)) {
        this.collectItem(item);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (item.x < -60) {
        this.collectibles.splice(i, 1);
      }
    }

    // 7. Update Particles
    this.particles.update(dt);
  }

  spawnObstaclePair(chamber) {
    const gapBonus = upgrades.getGapBonus();
    const obs = new Obstacle(CONFIG.CANVAS_WIDTH + 60, chamber, gapBonus);
    this.obstacles.push(obs);

    // Spawn Collectibles in the corridor gap
    const rand = Math.random();
    const spawnX = obs.x + obs.width / 2;
    const spawnY = obs.gapCenterY;

    if (rand < 0.38) {
      // Spawn Food
      const foodKeys = Object.keys(CONFIG.FOOD_TYPES);
      const chosenType = CONFIG.FOOD_TYPES[foodKeys[Math.floor(Math.random() * foodKeys.length)]];
      this.collectibles.push(new Collectible(spawnX, spawnY, 'FOOD', chosenType));
    } else if (rand < 0.75) {
      // Spawn Gold or Blood Ruby
      if (Math.random() < 0.22) {
        this.collectibles.push(new Collectible(spawnX, spawnY, 'RUBY', { value: 5 }));
      } else {
        this.collectibles.push(new Collectible(spawnX, spawnY, 'GOLD', { value: 1 }));
      }
    } else if (rand < 0.88) {
      // Spawn Spell Scroll
      this.collectibles.push(new Collectible(spawnX, spawnY, 'SCROLL', { spell: 'DISMISS' }));
    }
  }

  collectItem(item) {
    if (item.type === 'FOOD') {
      const nutritionBonus = upgrades.getFoodNutritionMultiplier();
      const restored = item.payload.restore * nutritionBonus;
      this.lifeForce.feed(restored);
      this.foodEatenRun++;
      audio.playEatFood(item.payload.name);
      this.particles.emit(item.x, item.y, 8, { color: '#06d6a0', sizeMin: 2, sizeMax: 4 });
      a11y.announcePolite(`Ate ${item.payload.name}. Life Force restored to ${this.lifeForce.getPercentage()}%.`);
    } else if (item.type === 'GOLD') {
      const mult = upgrades.getGoldMultiplier();
      const val = Math.round(item.payload.value * mult);
      this.goldCollectedRun += val;
      audio.playCoin();
      this.particles.emitGoldSparkles(item.x, item.y);
    } else if (item.type === 'RUBY') {
      const mult = upgrades.getGoldMultiplier();
      const val = Math.round(item.payload.value * mult);
      this.goldCollectedRun += val;
      audio.playRuby();
      this.particles.emitGoldSparkles(item.x, item.y);
    } else if (item.type === 'SCROLL') {
      // Recharge spell instantly
      this.dungeoneer.spellCooldowns.DISMISS = 0;
      audio.playRuby();
      this.particles.emitSpellExplosion(item.x, item.y, '#7209b7');
      this.setTreguardBanner('Spell Scroll gathered! DISMISS is charged!');
      a11y.announcePolite('Spell Scroll gathered! DISMISS is ready to cast!');
    }
  }

  checkChamberProgression() {
    const nextIdx = CONFIG.CHAMBERS.findIndex(c => this.distance >= c.minPaces && this.distance < c.maxPaces);
    if (nextIdx !== -1 && nextIdx !== this.currentChamberIndex) {
      this.currentChamberIndex = nextIdx;
      const ch = CONFIG.CHAMBERS[nextIdx];
      const quote = ch.treguardQuotes[Math.floor(Math.random() * ch.treguardQuotes.length)];
      this.setTreguardBanner(quote);
      audio.speakTreguard(quote);
      a11y.announcePolite(`Reached Floor ${ch.floor}: ${ch.name}!`);
    }
  }

  getCurrentChamber() {
    return CONFIG.CHAMBERS[this.currentChamberIndex] || CONFIG.CHAMBERS[0];
  }

  setTreguardBanner(text) {
    if (this.elTreguardBanner) {
      this.elTreguardBanner.textContent = `"${text}"`;
    }
  }

  syncHUD() {
    if (this.elPaces) this.elPaces.textContent = `${this.distance} paces`;
    if (this.elBest) this.elBest.textContent = `${Math.max(this.distance, storage.get('highScore'))} paces`;
    if (this.elGold) this.elGold.textContent = `${storage.get('gold') + this.goldCollectedRun} 🪙`;
    if (this.elChamberName) this.elChamberName.textContent = this.getCurrentChamber().name;

    // Shield status
    if (this.elShields) {
      if (this.dungeoneer.shields > 0) {
        this.elShields.textContent = `🛡️ × ${this.dungeoneer.shields}`;
        this.elShields.parentElement.classList.remove('hidden');
      } else {
        this.elShields.parentElement.classList.add('hidden');
      }
    }

    // Life Force status
    const pct = this.lifeForce.getPercentage();
    if (this.elLifePct) this.elLifePct.textContent = `${pct}%`;
    const stageDesc = this.lifeForce.getStageDescription();
    if (this.elLifeStage) {
      this.elLifeStage.textContent = `${stageDesc.label} (${stageDesc.status})`;
      this.elLifeStage.style.borderColor = stageDesc.color;
      this.elLifeStage.style.color = stageDesc.color;
    }

    // Spell Slot Status
    if (this.elSpellCooldown) {
      const cd = this.dungeoneer.spellCooldowns.DISMISS;
      if (cd > 0) {
        this.elSpellCooldown.textContent = `${Math.ceil(cd)}s`;
        this.elSpellSlot?.classList.add('cooldown');
      } else {
        this.elSpellCooldown.textContent = 'READY';
        this.elSpellSlot?.classList.remove('cooldown');
      }
    }
  }
}

// Instantiate engine when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new GameEngine();
});
