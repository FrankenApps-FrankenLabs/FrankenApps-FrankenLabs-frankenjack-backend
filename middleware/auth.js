const { ethers } = require('ethers');

// Verifies that the request is signed by the wallet it claims to be
const verifyWallet = async (req, res, next) => {
  const { wallet, signature, message } = req.body;

  if (!wallet || !signature || !message) {
    return res.status(401).json({ error: 'Missing auth fields' });
  }

  try {
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(401).json({ error: 'Signature mismatch' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid signature' });
  }
};

module.exports = { verifyWallet };