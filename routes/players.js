const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET player by wallet
router.get('/:wallet', async (req, res) => {
  const { wallet } = req.params;
  try {
    const { data, error } = await supabase
      .from('fj_players')
      .select('*')
      .eq('wallet', wallet.toLowerCase())
      .single();

    if (error && error.code === 'PGRST116') {
      // Player doesn't exist yet, create them
      const { data: newPlayer, error: createError } = await supabase
        .from('fj_players')
        .insert([{ wallet: wallet.toLowerCase(), tokens: 100, poker_chips: 0 }])
        .select()
        .single();

      if (createError) throw createError;
      return res.json(newPlayer);
    }

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// PUT update player balance
router.put('/balance', async (req, res) => {
  const { wallet, tokens, poker_chips } = req.body;
  try {
    const { data, error } = await supabase
      .from('fj_players')
      .update({ 
        tokens, 
        poker_chips,
        updated_at: new Date().toISOString()
      })
      .eq('wallet', wallet.toLowerCase())
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

module.exports = router;