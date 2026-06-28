const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET top 10 leaderboard
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fj_leaderboard')
      .select('*')
      .order('biggest_chip_stack', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// PUT update player leaderboard stats
router.put('/update', async (req, res) => {
  const {
    wallet,
    blackjack_wins,
    slots_wins,
    poker_wins,
    biggest_pot,
    biggest_chip_stack,
    total_hands
  } = req.body;

  try {
    const { data: existing } = await supabase
      .from('fj_leaderboard')
      .select('*')
      .eq('wallet', wallet.toLowerCase())
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('fj_leaderboard')
        .update({
          blackjack_wins: (existing.blackjack_wins || 0) + (blackjack_wins || 0),
          slots_wins: (existing.slots_wins || 0) + (slots_wins || 0),
          poker_wins: (existing.poker_wins || 0) + (poker_wins || 0),
          biggest_pot: Math.max(existing.biggest_pot || 0, biggest_pot || 0),
          biggest_chip_stack: Math.max(existing.biggest_chip_stack || 0, biggest_chip_stack || 0),
          total_hands: (existing.total_hands || 0) + (total_hands || 0),
          updated_at: new Date().toISOString()
        })
        .eq('wallet', wallet.toLowerCase())
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    }

    // Create new leaderboard entry
    const { data, error } = await supabase
      .from('fj_leaderboard')
      .insert([{
        wallet: wallet.toLowerCase(),
        blackjack_wins: blackjack_wins || 0,
        slots_wins: slots_wins || 0,
        poker_wins: poker_wins || 0,
        biggest_pot: biggest_pot || 0,
        biggest_chip_stack: biggest_chip_stack || 0,
        total_hands: total_hands || 0
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update leaderboard' });
  }
});

module.exports = router;