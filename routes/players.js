const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_WALLETS = [
  '0x7fe522ab4f456cfc41fe7a7a0c94f28801cca8fc'
];

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
      const { data: newPlayer, error: createError } = await supabase
        .from('fj_players')
        .insert([{ wallet: wallet.toLowerCase(), tokens: 100, poker_chips: 0 }])
        .select()
        .single();
      if (createError) throw createError;
      if (ADMIN_WALLETS.includes(wallet.toLowerCase())) {
        return res.json({ ...newPlayer, tokens: 999999, poker_chips: 999999, is_admin: true });
      }
      return res.json(newPlayer);
    }

    if (error) throw error;

    if (ADMIN_WALLETS.includes(wallet.toLowerCase())) {
      return res.json({ ...data, tokens: 999999, poker_chips: 999999, is_admin: true });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// PUT update player balance — skip for admin
router.put('/balance', async (req, res) => {
  const { wallet, tokens, poker_chips } = req.body;

  if (ADMIN_WALLETS.includes(wallet.toLowerCase())) {
    return res.json({ skipped: true, reason: 'admin wallet' });
  }

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