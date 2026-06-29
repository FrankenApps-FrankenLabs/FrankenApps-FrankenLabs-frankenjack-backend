const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const provider = new ethers.JsonRpcProvider(process.env.LCAI_RPC);
const RECEIVING_WALLET = '0x11cEF17C7581Df308179919e80Be5Dbb6B1CcC4B';
const TOKEN_REFILL_AMOUNT = 50;
const TOKEN_REFILL_COST = ethers.parseEther('30');
const POKER_CHIPS_AMOUNT = 100;
const POKER_SITDOWN_COST = ethers.parseEther('30');

// Verify tx and refill tokens
router.post('/refill', async (req, res) => {
  const { wallet, tx_hash } = req.body;
  try {
    // Check tx not already used
    const { data: existing } = await supabase
      .from('fj_transactions')
      .select('*')
      .eq('tx_hash', tx_hash)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Transaction already used' });
    }

    // Verify transaction on chain
    const tx = await provider.getTransaction(tx_hash);
    if (!tx) return res.status(400).json({ error: 'Transaction not found' });

    if (tx.to.toLowerCase() !== RECEIVING_WALLET.toLowerCase()) {
      return res.status(400).json({ error: 'Wrong receiving address' });
    }

    if (tx.value < TOKEN_REFILL_COST) {
      return res.status(400).json({ error: 'Insufficient payment' });
    }

    if (tx.from.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(400).json({ error: 'Wallet mismatch' });
    }

    // Log transaction
    await supabase.from('fj_transactions').insert([{
      wallet: wallet.toLowerCase(),
      type: 'token_refill',
      amount: TOKEN_REFILL_AMOUNT,
      lcai_paid: 30,
      tx_hash
    }]);

    // Update player tokens
    const { data: player } = await supabase
      .from('fj_players')
      .select('tokens')
      .eq('wallet', wallet.toLowerCase())
      .single();

    const { data, error } = await supabase
      .from('fj_players')
      .update({ 
        tokens: (player?.tokens || 0) + TOKEN_REFILL_AMOUNT,
        updated_at: new Date().toISOString()
      })
      .eq('wallet', wallet.toLowerCase())
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, tokens: data.tokens });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Refill failed' });
  }
});

// Verify tx and grant poker chips (sit-down or rebuy)
router.post('/sitdown', async (req, res) => {
  const { wallet, tx_hash } = req.body;
  try {
    // Check tx not already used
    const { data: existing } = await supabase
      .from('fj_transactions')
      .select('*')
      .eq('tx_hash', tx_hash)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Transaction already used' });
    }

    // Verify transaction on chain
    const tx = await provider.getTransaction(tx_hash);
    if (!tx) return res.status(400).json({ error: 'Transaction not found' });

    if (tx.to.toLowerCase() !== RECEIVING_WALLET.toLowerCase()) {
      return res.status(400).json({ error: 'Wrong receiving address' });
    }

    if (tx.value < POKER_SITDOWN_COST) {
      return res.status(400).json({ error: 'Insufficient payment' });
    }

    if (tx.from.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(400).json({ error: 'Wallet mismatch' });
    }

    // Log transaction
    await supabase.from('fj_transactions').insert([{
      wallet: wallet.toLowerCase(),
      type: 'poker_sitdown',
      amount: POKER_CHIPS_AMOUNT,
      lcai_paid: 30,
      tx_hash
    }]);

    // Update player poker chips
    const { data: player } = await supabase
      .from('fj_players')
      .select('poker_chips')
      .eq('wallet', wallet.toLowerCase())
      .single();

    const { data, error } = await supabase
      .from('fj_players')
      .update({ 
        poker_chips: (player?.poker_chips || 0) + POKER_CHIPS_AMOUNT,
        updated_at: new Date().toISOString()
      })
      .eq('wallet', wallet.toLowerCase())
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, poker_chips: data.poker_chips });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sit-down failed' });
  }
});
// Promo code redemption
const PROMO_CODES = {
  '50FREE': 50,
};

router.post('/promo', async (req, res) => {
  const { wallet, code } = req.body;
  if (!wallet || !code) return res.status(400).json({ error: 'Missing wallet or code' });

  const upperCode = code.toUpperCase().trim();
  const amount = PROMO_CODES[upperCode];

  if (!amount) return res.status(400).json({ error: 'Invalid promo code' });

  try {
    const { data: player } = await supabase
      .from('fj_players')
      .select('tokens')
      .eq('wallet', wallet.toLowerCase())
      .single();

    const newTokens = (player?.tokens || 0) + amount;

    const { data, error } = await supabase
      .from('fj_players')
      .update({ tokens: newTokens, updated_at: new Date().toISOString() })
      .eq('wallet', wallet.toLowerCase())
      .select()
      .single();

    if (error) throw error;

    await supabase.from('fj_transactions').insert([{
      wallet: wallet.toLowerCase(),
      type: 'promo',
      amount,
      lcai_paid: 0,
      tx_hash: `promo_${upperCode}_${Date.now()}`
    }]);

    res.json({ success: true, tokens: data.tokens, amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Promo redemption failed' });
  }
});
module.exports = router;