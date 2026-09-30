/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Accessibility (a11y) Manager & WCAG AAA Compliance Suite
 * Screen reader live regions, closed captions HUD, motor assist, and sensory accommodations
 * Military-grade focus trapping, dialog lifecycle protection, and XSS-free DOM rendering.
 */

import { storage } from './storage.js';
import { audio } from './audio.js';

export class AccessibilityManager {
  constructor() {
    this.politeRegion = document.getElementById('a11y-live-polite');
    this.assertiveRegion = document.getElementById('a11y-live-assertive');
    this.captionsContainer = document.getElementById('captions-hud-list');
    
    this.recentCaptions = [];
    this.debounceTimer = null;
    this.previousFocusElement = null;

    this.initSystemWatchers();
    this.initCaptionsListener();
    this.initDialogFocusRestoration();
    this.applyStoredPreferences();
  }

  initSystemWatchers() {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    // Watch prefers-reduced-motion
    try {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleMotion = (e) => {
        if (storage.getSetting('reducedMotion') === undefined) {
          document.body.classList.toggle('reduced-motion', e.matches);
        }
      };
      if (motionQuery.addEventListener) {
        motionQuery.addEventListener('change', handleMotion);
      }
      handleMotion(motionQuery);

      // Watch prefers-contrast
      const contrastQuery = window.matchMedia('(prefers-contrast: more)');
      const handleContrast = (e) => {
        if (storage.getSetting('highContrast') === undefined) {
          document.body.classList.toggle('high-contrast', e.matches);
        }
      };
      if (contrastQuery.addEventListener) {
        contrastQuery.addEventListener('change', handleContrast);
      }
      handleContrast(contrastQuery);
    } catch (e) {
      console.warn('Media query matchers not fully supported:', e);
    }
  }

  initCaptionsListener() {
    audio.onCaption((caption) => {
      this.addCaption(caption);
    });
  }

  initDialogFocusRestoration() {
    if (typeof document === 'undefined') return;
    const dialogs = document.querySelectorAll('dialog');
    dialogs.forEach(dialog => {
      dialog.addEventListener('close', () => {
        if (this.previousFocusElement && typeof this.previousFocusElement.focus === 'function') {
          try {
            this.previousFocusElement.focus();
          } catch (e) {}
        }
      });
    });
  }

  applyStoredPreferences() {
    const isHighContrast = storage.getSetting('highContrast');
    const isReducedMotion = storage.getSetting('reducedMotion');
    const isDyslexic = storage.getSetting('dyslexicFont');

    document.body.classList.toggle('high-contrast', !!isHighContrast);
    document.body.classList.toggle('reduced-motion', !!isReducedMotion);
    document.body.classList.toggle('dyslexic-font', !!isDyslexic);
  }

  // --- SCREEN READER LIVE ANNOUNCEMENTS ---

  announcePolite(msg) {
    if (!this.politeRegion) return;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.politeRegion.textContent = '';
      requestAnimationFrame(() => {
        this.politeRegion.textContent = String(msg);
      });
    }, 120);
  }

  announceAssertive(msg) {
    if (!this.assertiveRegion) return;
    this.assertiveRegion.textContent = '';
    requestAnimationFrame(() => {
      this.assertiveRegion.textContent = String(msg);
    });
  }

  // --- CLOSED CAPTIONS HUD ---

  addCaption({ text, icon = '🔊', priority = 'normal' }) {
    if (!storage.getSetting('captionsEnabled')) return;
    if (!this.captionsContainer) return;

    const id = 'cap-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const item = { id, text: String(text), icon: String(icon), priority, expiresAt: Date.now() + 3800 };
    this.recentCaptions.unshift(item);
    if (this.recentCaptions.length > 3) this.recentCaptions.pop();

    this.renderCaptions();

    setTimeout(() => {
      this.recentCaptions = this.recentCaptions.filter(c => c.id !== id);
      this.renderCaptions();
    }, 3800);
  }

  renderCaptions() {
    if (!this.captionsContainer) return;
    this.captionsContainer.innerHTML = '';
    for (const c of this.recentCaptions) {
      const li = document.createElement('li');
      li.className = `caption-item priority-${c.priority}`;

      const iconSpan = document.createElement('span');
      iconSpan.className = 'caption-icon';
      iconSpan.setAttribute('aria-hidden', 'true');
      iconSpan.textContent = c.icon;

      const textSpan = document.createElement('span');
      textSpan.className = 'caption-text';
      textSpan.textContent = c.text; // Text content prevents any HTML injection

      li.appendChild(iconSpan);
      li.appendChild(document.createTextNode(' '));
      li.appendChild(textSpan);
      this.captionsContainer.appendChild(li);
    }
  }

  // --- NATIVE MODAL DIALOG MANAGEMENT ---

  openModal(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (!dialog || dialog.open || typeof dialog.showModal !== 'function') return;

    this.previousFocusElement = document.activeElement;
    dialog.showModal();

    // Focus the first actionable button or close button
    const focusable = dialog.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      focusable.focus();
    }
  }

  closeModal(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (!dialog || !dialog.open || typeof dialog.close !== 'function') return;

    dialog.close();
    if (this.previousFocusElement && typeof this.previousFocusElement.focus === 'function') {
      try {
        this.previousFocusElement.focus();
      } catch (e) {}
    }
  }

  // --- PREFERENCES TOGGLES ---

  toggleHighContrast(enable) {
    const state = enable ?? !storage.getSetting('highContrast');
    storage.setSetting('highContrast', state);
    document.body.classList.toggle('high-contrast', state);
    this.announcePolite(`High contrast mode ${state ? 'enabled' : 'disabled'}.`);
    return state;
  }

  toggleReducedMotion(enable) {
    const state = enable ?? !storage.getSetting('reducedMotion');
    storage.setSetting('reducedMotion', state);
    document.body.classList.toggle('reduced-motion', state);
    this.announcePolite(`Reduced motion ${state ? 'enabled' : 'disabled'}.`);
    return state;
  }

  toggleDyslexicFont(enable) {
    const state = enable ?? !storage.getSetting('dyslexicFont');
    storage.setSetting('dyslexicFont', state);
    document.body.classList.toggle('dyslexic-font', state);
    this.announcePolite(`Accessible dyslexic font ${state ? 'enabled' : 'disabled'}.`);
    return state;
  }

  setGameSpeed(speed) {
    const valid = [0.5, 0.75, 1.0, 1.25].includes(speed) ? speed : 1.0;
    storage.setSetting('gameSpeed', valid);
    this.announcePolite(`Game speed set to ${valid * 100} percent.`);
    return valid;
  }

  setHoldToRise(enabled) {
    storage.setSetting('holdToRise', !!enabled);
    this.announcePolite(`Single-switch hold-to-rise mode ${enabled ? 'activated' : 'deactivated'}.`);
  }

  setPracticeMode(enabled) {
    storage.setSetting('practiceMode', !!enabled);
    this.announcePolite(`Invincible practice mode ${enabled ? 'activated' : 'deactivated'}.`);
  }
}

export const a11y = new AccessibilityManager();
