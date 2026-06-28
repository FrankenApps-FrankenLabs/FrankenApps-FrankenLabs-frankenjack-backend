const express = require('express');
const cors = require('cors');
require('dotenv').config();

const playersRouter = require('./routes/players');
const leaderboardRouter = require('./routes/leaderboard');
const paymentsRouter = require('./routes/payments');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/players', playersRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/payments', paymentsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'FrankenJack Backend' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FrankenJack backend running on port ${PORT}`);
});