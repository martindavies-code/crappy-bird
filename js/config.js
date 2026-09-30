/**
 * KNIGHTMARE: DUNGEONEER'S FLIGHT
 * Game Configuration, Constants, and Tuning Parameters
 */

export const CONFIG = {
  CANVAS_WIDTH: 960,
  CANVAS_HEIGHT: 640,
  
  // Physics & Movement Defaults
  BASE_GRAVITY: 850,          // Pixels / s^2
  BASE_FLAP_IMPULSE: -320,    // Initial vertical velocity on flap
  BASE_HORIZONTAL_SPEED: 180, // Scrolling speed (pixels/s)
  MAX_FALL_SPEED: 550,        // Terminal velocity
  ROTATION_SPEED: 4.5,        // Radians per second transition
  
  // Life Force Defaults
  BASE_MAX_LIFE_FORCE: 100,
  BASE_DECAY_RATE: 4.5,       // % Life force drained per second
  OBSTACLE_HIT_DAMAGE: 40,    // Life force deducted when armor absorbs a hit
  
  // Food Nutrition Values (% restored)
  FOOD_TYPES: {
    APPLE: { name: 'Dungeon Apple', restore: 18, score: 5, icon: '🍎' },
    PIE: { name: "Knight's Meat Pie", restore: 38, score: 15, icon: '🥧' },
    FOWL: { name: 'Roast Fowl', restore: 65, score: 30, icon: '🍗' }
  },
  
  // Spell Definitions
  SPELLS: {
    DISMISS: {
      id: 'DISMISS',
      name: 'DISMISS',
      incantation: 'D-I-S-M-I-S-S',
      description: 'Obliterates the nearest obstacle directly ahead into rubble.',
      cooldown: 14, // seconds
      duration: 0.6,
      icon: '⚡',
      color: '#e63946'
    },
    EYESHIELD: {
      id: 'EYESHIELD',
      name: 'EYESHIELD',
      incantation: 'E-Y-E-S-H-I-E-L-D',
      description: 'Slows time by 60% for 4 seconds, allowing pinpoint navigation.',
      cooldown: 18,
      duration: 4.0,
      icon: '👁️',
      color: '#3a86ff'
    },
    ANVIL: {
      id: 'ANVIL',
      name: 'ANVIL',
      incantation: 'A-N-V-I-L',
      description: 'Summons an invulnerable spectral aura for 3.5 seconds.',
      cooldown: 22,
      duration: 3.5,
      icon: '🛡️',
      color: '#ffbe0b'
    },
    LEVITATE: {
      id: 'LEVITATE',
      name: 'LEVITATE',
      incantation: 'L-E-V-I-T-A-T-E',
      description: 'Suspends the dungeoneer in stable hover for 3 seconds.',
      cooldown: 16,
      duration: 3.0,
      icon: '✨',
      color: '#8338ec'
    }
  },

  // Permanent Meta-Progression Upgrades in Treguard's Sanctuary
  UPGRADES: {
    HORNS_OF_RESILIENCE: {
      id: 'HORNS_OF_RESILIENCE',
      name: 'Horns of Resilience',
      category: 'VITALITY',
      description: 'Increases Maximum Life Force by +20% per tier.',
      maxTier: 5,
      costs: [100, 250, 500, 900, 1500],
      perTierValue: 0.20,
      icon: '🛡️'
    },
    PLUME_OF_LEVITATION: {
      id: 'PLUME_OF_LEVITATION',
      name: 'Plume of Levitation',
      category: 'FLIGHT',
      description: 'Reduces falling gravity by 8% per tier for gentler flutter.',
      maxTier: 5,
      costs: [150, 300, 600, 1100, 1800],
      perTierValue: 0.08,
      icon: '🪶'
    },
    DUNSHELM_MASONRY: {
      id: 'DUNSHELM_MASONRY',
      name: 'Dunshelm Masonry',
      category: 'FLIGHT',
      description: 'Expands the safe gap between portcullises and blades by +12px per tier.',
      maxTier: 5,
      costs: [120, 280, 550, 1000, 1600],
      perTierValue: 14,
      icon: '🏛️'
    },
    ALCHEMISTS_SATCHEL: {
      id: 'ALCHEMISTS_SATCHEL',
      name: "Alchemist's Satchel",
      category: 'SORCERY',
      description: 'Increases gold coin drop value and spawn rates (+25% per tier).',
      maxTier: 5,
      costs: [80, 200, 450, 850, 1400],
      perTierValue: 0.25,
      icon: '🪙'
    },
    ARMOR_OF_JUSTICE: {
      id: 'ARMOR_OF_JUSTICE',
      name: 'Armor of Justice',
      category: 'VITALITY',
      description: 'Grants an iron shield that absorbs 1 fatal obstacle strike per tier before cracking.',
      maxTier: 3,
      costs: [300, 750, 1600],
      perTierValue: 1, // 1 shield charge
      icon: '⚔️'
    },
    SECOND_WIND: {
      id: 'SECOND_WIND',
      name: "Treguard's Second Wind",
      category: 'VITALITY',
      description: 'Miraculously revives the dungeoneer once per run with 50% Life Force upon death.',
      maxTier: 1,
      costs: [1200],
      perTierValue: 1,
      icon: '❤️‍🔥'
    },
    SPELL_AFFINITY: {
      id: 'SPELL_AFFINITY',
      name: 'Spellcraft Affinity',
      category: 'SORCERY',
      description: 'Reduces spell cooldowns by 10% and extends spell duration by +15% per tier.',
      maxTier: 4,
      costs: [180, 400, 800, 1400],
      perTierValue: 0.10,
      icon: '📜'
    },
    SCAVENGERS_LORE: {
      id: 'SCAVENGERS_LORE',
      name: "Scavenger's Lore",
      category: 'SORCERY',
      description: 'Increases food spawn frequency and nutrition restored (+15% per tier).',
      maxTier: 4,
      costs: [100, 240, 520, 950],
      perTierValue: 0.15,
      icon: '🥖'
    }
  },

  // Dungeon Chamber / Levels
  CHAMBERS: [
    {
      id: 'catacombs',
      floor: 1,
      name: 'The Catacombs of Dunshelm',
      subtitle: 'Ancient stone tunnels illuminated by flickering torchlight',
      bgTheme: 'deep-blue',
      obstacleTheme: 'stone-portcullis',
      minPaces: 0,
      maxPaces: 300,
      gapBase: 180,
      spacing: 280,
      treguardQuotes: [
        'Enter, Stranger! Welcome to the Dungeons of Castle Dunshelm.',
        'Keep thy wits keen, dungeoneer. Life force drains with every breath!',
        'Step forward... mind the stone pillars!'
      ]
    },
    {
      id: 'blades',
      floor: 2,
      name: 'The Corridor of Blades',
      subtitle: 'Swinging guillotine pendulums and merciless razor edges',
      bgTheme: 'amber-chains',
      obstacleTheme: 'pendulum-guillotine',
      minPaces: 300,
      maxPaces: 700,
      gapBase: 165,
      spacing: 260,
      treguardQuotes: [
        'Warning, team! You have entered the Corridor of Blades!',
        'Time thy flight with precision, or suffer the keen edge of steel!',
        'Ooh, nasty! Watch the pendulum swing!'
      ]
    },
    {
      id: 'alchemy',
      floor: 3,
      name: 'The Alchemist’s Vaults',
      subtitle: 'Bubbling toxic alembics and pulsating arcane conduits',
      bgTheme: 'emerald-cavern',
      obstacleTheme: 'alchemical-pipes',
      minPaces: 700,
      maxPaces: 1200,
      gapBase: 155,
      spacing: 250,
      treguardQuotes: [
        'A foul stench of brimstone and sorcery hangs in the air!',
        'Magic runes are strong here! Gather scrolls and cast when peril looms!',
        'Life force is draining, spellcaster! Keep feeding!'
      ]
    },
    {
      id: 'black-tower',
      floor: 4,
      name: 'Lord Fear’s Technomantic Spire',
      subtitle: 'Clockwork pistons, spiked iron traps, and crackling lightning',
      bgTheme: 'crimson-tower',
      obstacleTheme: 'clockwork-crushers',
      minPaces: 1200,
      maxPaces: 99999,
      gapBase: 145,
      spacing: 240,
      treguardQuotes: [
        'Lord Fear awaits in the high spire! Tread not into his clutches!',
        'The dark master’s mechanical horrors surround thee!',
        'Victory or bone and ash! Press on!'
      ]
    }
  ],

  // Treguard Voice / Ambient Quotes
  TREGUARD_SPEECHES: {
    START: [
      'Enter, Stranger! Tread the path of peril!',
      'Welcome to Dunshelm, Dungeoneer! May the powers protect thee.',
      'The Helmet of Justice guides thy sight. Fly true!'
    ],
    AMBER_ALERT: [
      'Warning, team! Life force status: Amber!',
      'Life force is fading, Stranger! Seek nourishment quickly!',
      'Thy vitality wanes! Feed the dungeoneer!'
    ],
    RED_ALERT: [
      'Emergency! Life force critical! The skull looms!',
      'Life force status: RED! Find sustenance or perish!',
      'Hurry! Thy life force is stripping to the bare bone!'
    ],
    NEAR_MISS: [
      'Ooh, nasty! A whisper from disaster!',
      'By the beard of Merlin, that was close!',
      'A brush with doom! Keep steady!'
    ],
    SPELL_CAST: [
      'A spell is woven! Let magic turn the tide!',
      'Arcane energies unleashed! Well cast, dungeoneer!',
      'Powers of the ancients, aid our quest!'
    ],
    DEATH: [
      'Life force spent! Nothing remains but bone and dust.',
      'Another brave soul claims a grave in Dunshelm.',
      'Thy journey endeth here, Stranger... but Treguard awaits thy return!'
    ],
    SANCTUARY: [
      'Welcome back to the Sanctuary, Stranger! What boons shall we forge?',
      'Thy gathered gold can turn future peril into triumph.',
      'Prepare well, for the dungeon never sleeps.'
    ]
  },

  // In-Run Mystery Chest Power-Ups
  POWERUPS: {
    MIDAS_TOUCH: {
      id: 'MIDAS_TOUCH',
      name: 'Midas Transmutation',
      icon: '👑',
      duration: 6.0,
      description: 'Turns upcoming iron portcullises into solid gold that shatter into coins!'
    },
    TIME_DIAL: {
      id: 'TIME_DIAL',
      name: 'Chrono Dial',
      icon: '⏳',
      duration: 5.0,
      description: 'Slows dungeon time to bullet-speed for effortless blade dancing.'
    },
    GARGOYLE_DASH: {
      id: 'GARGOYLE_DASH',
      name: 'Gargoyle Rush',
      icon: '🦅',
      duration: 4.0,
      description: 'Grants invincible forward velocity, blasting obstacles aside!'
    },
    GOBLIN_BANQUET: {
      id: 'GOBLIN_BANQUET',
      name: 'Goblin Feast',
      icon: '🍗',
      duration: 5.0,
      description: 'Rains roasted fowl, apples, and pies across the dungeon!'
    },
    MAGNETIC_AMULET: {
      id: 'MAGNETIC_AMULET',
      name: 'Smirky’s Magnet',
      icon: '🧲',
      duration: 7.0,
      description: 'Magnetically pulls all gold, rubies, and food across the screen!'
    }
  },

  // Unlockable Cosmetic Helmets in Sanctuary Wardrobe
  HELMETS: {
    JUSTICE: {
      id: 'JUSTICE',
      name: 'Helmet of Justice',
      cost: 0,
      icon: '🪖',
      desc: 'The iconic horned iron helm of ITV Knightmare. Sturdy and true.',
      hornColor: '#cbd5e1',
      domeColor: '#64748b',
      visorColor: '#2ec4b6',
      trail: 'smoke'
    },
    MIDAS: {
      id: 'MIDAS',
      name: 'Crown of Midas',
      cost: 350,
      icon: '👑',
      desc: 'Forged from pure Dunshelm gold. Emits shimmering coin sparkles.',
      hornColor: '#ffd166',
      domeColor: '#f59e0b',
      visorColor: '#ffff00',
      trail: 'gold'
    },
    WARLOCK: {
      id: 'WARLOCK',
      name: 'Warlock’s Cowl',
      cost: 550,
      icon: '🔮',
      desc: 'Imbued with violet void runes. Leaves a mystical stardust trail.',
      hornColor: '#c084fc',
      domeColor: '#4c1d95',
      visorColor: '#e879f9',
      trail: 'void'
    },
    JESTER: {
      id: 'JESTER',
      name: 'Motley’s Jester Cap',
      cost: 450,
      icon: '🃏',
      desc: 'Jingles with laughter on every flap! Plays cheerful jingle bells.',
      hornColor: '#ef4444',
      domeColor: '#10b981',
      visorColor: '#38bdf8',
      trail: 'confetti'
    },
    VALKYRIE: {
      id: 'VALKYRIE',
      name: 'Valkyrie Winghelm',
      cost: 750,
      icon: '🪶',
      desc: 'Adorned with divine winged crests that flutter in the draft.',
      hornColor: '#e2e8f0',
      domeColor: '#0ea5e9',
      visorColor: '#38bdf8',
      trail: 'feather'
    }
  },

  // Classic Knightmare Advisors' Hilarious Direction Callouts
  ADVISOR_CALLOUTS: [
    'Step left! No, YOUR left!',
    'Sidestep! Mind the razor blade!',
    'Pick up the pie, you fool!',
    'Spellcasting... D-I-S-M-I-S-S!',
    'Look out! Portcullis dropping!',
    'Duck! No, flap up!',
    'Beware the spinning blade!',
    'Eat the chicken! Life force is dropping!'
  ],

  // Default Keyboard Controls
  DEFAULT_CONTROLS: {
    flap: ['Space', 'ArrowUp', 'KeyW', 'Enter', 'Numpad0'],
    spell: ['KeyE', 'Digit1', 'KeyQ'],
    pause: ['Escape', 'KeyP']
  }
};
