const express = require('express');
const router = express.Router();

const SYMBOLS = [
  { id: 'cherry',  label: '🍒', name: 'Cherry',       stops: 16 },
  { id: 'lemon',   label: '🍋', name: 'Lemon',        stops: 14 },
  { id: 'orange',  label: '🍊', name: 'Orange',       stops: 12 },
  { id: 'bar',     label: '▬',  name: 'Bar',          stops: 8  },
  { id: 'dblbar',  label: '▬▬', name: 'Double Bar',   stops: 6  },
  { id: 'seven',   label: '7',  name: 'Seven',        stops: 4  },
  { id: 'diamond', label: '💎', name: 'Diamond',      stops: 3  },
  { id: 'frank',   label: '⚡', name: 'Frankenstein', stops: 2  },
];

const TOTAL_STOPS = SYMBOLS.reduce((sum, s) => sum + s.stops, 0);

const PAYOUTS = {
  cherry:  { 2: 2,  3: 5,  4: 10, 5: 20  },
  lemon:   { 3: 6,  4: 12, 5: 25  },
  orange:  { 3: 8,  4: 15, 5: 30  },
  bar:     { 3: 10, 4: 20, 5: 50  },
  dblbar:  { 3: 15, 4: 30, 5: 75  },
  seven:   { 3: 20, 4: 50, 5: 100 },
  diamond: { 3: 40, 4: 100, 5: 200 },
  frank:   {},
};

function buildStrip() {
  const strip = [];
  for (const sym of SYMBOLS) {
    for (let i = 0; i < sym.stops; i++) strip.push(sym.id);
  }
  return strip;
}

const REEL_STRIP = buildStrip();

function spinReel() {
  const pos = Math.floor(Math.random() * TOTAL_STOPS);
  return REEL_STRIP[pos];
}

function calcPayout(results, bet) {
  const frankCount = results.filter(r => r === 'frank').length;
  if (frankCount >= 3) {
    return { payout: 0, multiplier: 0, freeSpins: 10, label: '⚡ FREE SPINS!', color: '#ffd700' };
  }
  const first = results[0];
  let matchCount = 0;
  for (let i = 0; i < 5; i++) {
    if (results[i] === first) matchCount++;
    else break;
  }
  const payRow = PAYOUTS[first];
  if (!payRow || !payRow[matchCount]) {
    return { payout: 0, multiplier: 0, freeSpins: 0, label: '', color: '' };
  }
  const mult = payRow[matchCount];
  const sym = SYMBOLS.find(s => s.id === first);
  return {
    payout: parseFloat((bet * mult).toFixed(4)),
    multiplier: mult,
    freeSpins: 0,
    label: `${sym.label} x${matchCount} — ${mult}x WIN!`,
    color: '#00ff88',
  };
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.post('/spin', (req, res) => {
  const { bet, freeSpins } = req.body;
  const betAmount = parseFloat(bet);
  if (!betAmount || betAmount < 1 || betAmount > 10) {
    return res.status(400).json({ error: 'Invalid bet. Must be between 1 and 10 tokens.' });
  }
  const results = [spinReel(), spinReel(), spinReel(), spinReel(), spinReel()];
  const symbols = results.map(id => SYMBOLS.find(s => s.id === id));
  const outcome = calcPayout(results, freeSpins ? 1 : betAmount);
  res.json({
    results,
    symbols,
    payout: outcome.payout,
    multiplier: outcome.multiplier,
    freeSpins: outcome.freeSpins,
    label: outcome.label,
    color: outcome.color,
  });
});

module.exports = router;