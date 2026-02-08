const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

// POST /api/users - Register or restore session
router.post('/', (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: 'Name and phone are required' });
  }

  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 7) {
    return res.status(400).json({ message: 'Phone number must be at least 7 digits' });
  }

  const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleaned);

  if (existing) {
    // Update name if different
    if (existing.name !== name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, existing.id);
      existing.name = name;
    }
    return res.json(existing);
  }

  const id = crypto.randomUUID();
  const stmt = db.prepare('INSERT INTO users (id, name, phone) VALUES (?, ?, ?)');
  stmt.run(id, name, cleaned);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json(user);
});

// GET /api/users/:id - Get user profile and stats
router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM bets WHERE creator_id = ? AND status != 'CANCELLED') as created,
      (SELECT COUNT(*) FROM bets WHERE acceptor_id = ?) as accepted,
      (SELECT COUNT(*) FROM bets WHERE winner_id = ?) as wins,
      (SELECT COUNT(*) FROM bets WHERE loser_id = ?) as losses,
      (SELECT COUNT(*) FROM bets WHERE loser_id = ? AND status = 'RESOLVED') as outstanding
  `).get(user.id, user.id, user.id, user.id, user.id);

  res.json({ user, stats });
});

module.exports = router;
