const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
  })
);
app.use(express.json({ limit: '1mb' }));
app.use('/api', routes);

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON payload.' });
  }
  return next(err);
});

app.use((err, req, res, next) => {
  const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  return res.status(status).json({
    message: err.message || 'Internal server error.',
  });
});

module.exports = app;

