const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

function enrichBet(bet) {
  if (!bet) return null;
  const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(bet.creator_id);
  const acceptor = bet.acceptor_id
    ? db.prepare('SELECT name FROM users WHERE id = ?').get(bet.acceptor_id)
    : null;
  const winner = bet.winner_id
    ? db.prepare('SELECT name FROM users WHERE id = ?').get(bet.winner_id)
    : null;
  const loser = bet.loser_id
    ? db.prepare('SELECT name FROM users WHERE id = ?').get(bet.loser_id)
    : null;
  return {
    ...bet,
    creator_name: creator?.name || 'Unknown',
    acceptor_name: acceptor?.name || null,
    winner_name: winner?.name || null,
    loser_name: loser?.name || null,
  };
}

function emitStatsUpdate(io) {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM bets WHERE status = 'OPEN') as open_bets,
      (SELECT COUNT(*) FROM bets WHERE status = 'ACCEPTED') as active_bets,
      (SELECT COUNT(*) FROM bets WHERE status IN ('RESOLVED', 'COMPLETED')) as resolved_bets,
      (SELECT COUNT(*) FROM users) as total_users
  `).get();
  io.emit('stats:updated', stats);
}

// POST /api/bets - Create a new bet
router.post('/', (req, res) => {
  const { proposition, stake, creatorSide, userId } = req.body;

  if (!proposition || !stake || !creatorSide || !userId) {
    return res.status(400).json({ message: 'proposition, stake, creatorSide, and userId are required' });
  }

  if (!['YES', 'NO'].includes(creatorSide)) {
    return res.status(400).json({ message: 'creatorSide must be YES or NO' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO bets (id, proposition, stake, creator_id, creator_side, status)
    VALUES (?, ?, ?, ?, ?, 'OPEN')
  `).run(id, proposition, stake, userId, creatorSide);

  const bet = enrichBet(db.prepare('SELECT * FROM bets WHERE id = ?').get(id));
  const io = req.app.get('io');
  io.emit('bet:created', bet);
  emitStatsUpdate(io);

  res.status(201).json(bet);
});

// GET /api/bets - List bets with filters
router.get('/', (req, res) => {
  const { status, userId } = req.query;
  let sql = 'SELECT * FROM bets';
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (userId) {
    conditions.push('(creator_id = ? OR acceptor_id = ?)');
    params.push(userId, userId);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC';

  const bets = db.prepare(sql).all(...params).map(enrichBet);
  res.json({ bets });
});

// GET /api/bets/:id - Get bet detail
router.get('/:id', (req, res) => {
  const bet = enrichBet(db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id));
  if (!bet) {
    return res.status(404).json({ message: 'Bet not found' });
  }
  res.json(bet);
});

// POST /api/bets/:id/accept - Accept an open bet
router.post('/:id/accept', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id);
  if (!bet) {
    return res.status(404).json({ message: 'Bet not found' });
  }
  if (bet.status !== 'OPEN') {
    return res.status(400).json({ message: 'Bet is no longer open' });
  }
  if (bet.creator_id === userId) {
    return res.status(400).json({ message: 'You cannot accept your own bet' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  db.prepare(`
    UPDATE bets SET status = 'ACCEPTED', acceptor_id = ?, accepted_at = datetime('now')
    WHERE id = ? AND status = 'OPEN'
  `).run(userId, req.params.id);

  const updated = enrichBet(db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id));
  const io = req.app.get('io');
  io.emit('bet:accepted', updated);
  emitStatsUpdate(io);

  res.json(updated);
});

// POST /api/bets/:id/cancel - Cancel an open bet
router.post('/:id/cancel', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id);
  if (!bet) {
    return res.status(404).json({ message: 'Bet not found' });
  }
  if (bet.status !== 'OPEN') {
    return res.status(400).json({ message: 'Only open bets can be cancelled' });
  }
  if (bet.creator_id !== userId) {
    return res.status(403).json({ message: 'Only the creator can cancel this bet' });
  }

  db.prepare("UPDATE bets SET status = 'CANCELLED' WHERE id = ?").run(req.params.id);

  const updated = enrichBet(db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id));
  const io = req.app.get('io');
  io.emit('bet:cancelled', updated);
  emitStatsUpdate(io);

  res.json(updated);
});

// POST /api/bets/:id/resolve - Resolve a bet with outcome
router.post('/:id/resolve', (req, res) => {
  const { userId, outcome } = req.body;
  if (!userId || !outcome) {
    return res.status(400).json({ message: 'userId and outcome are required' });
  }
  if (!['YES', 'NO'].includes(outcome)) {
    return res.status(400).json({ message: 'outcome must be YES or NO' });
  }

  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id);
  if (!bet) {
    return res.status(404).json({ message: 'Bet not found' });
  }
  if (bet.status !== 'ACCEPTED') {
    return res.status(400).json({ message: 'Only accepted bets can be resolved' });
  }
  if (bet.creator_id !== userId && bet.acceptor_id !== userId) {
    return res.status(403).json({ message: 'Only participants can resolve this bet' });
  }

  // Determine winner/loser
  let winnerId, loserId;
  if (outcome === bet.creator_side) {
    winnerId = bet.creator_id;
    loserId = bet.acceptor_id;
  } else {
    winnerId = bet.acceptor_id;
    loserId = bet.creator_id;
  }

  db.prepare(`
    UPDATE bets SET status = 'RESOLVED', outcome = ?, winner_id = ?, loser_id = ?, resolved_at = datetime('now')
    WHERE id = ?
  `).run(outcome, winnerId, loserId, req.params.id);

  const updated = enrichBet(db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id));
  const io = req.app.get('io');
  io.emit('bet:resolved', updated);
  emitStatsUpdate(io);

  res.json(updated);
});

// POST /api/bets/:id/complete - Mark stake as fulfilled
router.post('/:id/complete', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id);
  if (!bet) {
    return res.status(404).json({ message: 'Bet not found' });
  }
  if (bet.status !== 'RESOLVED') {
    return res.status(400).json({ message: 'Only resolved bets can be marked complete' });
  }
  if (bet.creator_id !== userId && bet.acceptor_id !== userId) {
    return res.status(403).json({ message: 'Only participants can complete this bet' });
  }

  db.prepare(`
    UPDATE bets SET status = 'COMPLETED', completed_at = datetime('now') WHERE id = ?
  `).run(req.params.id);

  const updated = enrichBet(db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id));
  const io = req.app.get('io');
  io.emit('bet:completed', updated);
  emitStatsUpdate(io);

  res.json(updated);
});

// GET /api/leaderboard
router.get('/leaderboard/data', (req, res) => {
  const leaderboard = db.prepare(`
    SELECT
      u.id,
      u.name,
      COUNT(CASE WHEN b.winner_id = u.id THEN 1 END) as wins,
      COUNT(CASE WHEN b.loser_id = u.id THEN 1 END) as losses,
      COUNT(CASE WHEN b.loser_id = u.id AND b.status = 'RESOLVED' THEN 1 END) as outstanding,
      COUNT(CASE WHEN (b.creator_id = u.id OR b.acceptor_id = u.id) AND b.status != 'OPEN' AND b.status != 'CANCELLED' THEN 1 END) as total_bets
    FROM users u
    LEFT JOIN bets b ON b.creator_id = u.id OR b.acceptor_id = u.id
    GROUP BY u.id
    ORDER BY wins DESC, outstanding DESC
  `).all();

  res.json({ leaderboard });
});

// === ADMIN ENDPOINTS ===

// DELETE /api/bets/:id/admin-delete - Remove a bet entirely
router.delete('/:id/admin-delete', (req, res) => {
  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id);
  if (!bet) {
    return res.status(404).json({ message: 'Bet not found' });
  }

  db.prepare('DELETE FROM bets WHERE id = ?').run(req.params.id);

  const io = req.app.get('io');
  io.emit('bet:cancelled', { ...enrichBet(bet), status: 'CANCELLED', _deleted: true });
  emitStatsUpdate(io);

  res.json({ message: 'Bet deleted', id: req.params.id });
});

// POST /api/bets/:id/admin-undo-accept - Revert accepted bet back to open
router.post('/:id/admin-undo-accept', (req, res) => {
  const bet = db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id);
  if (!bet) {
    return res.status(404).json({ message: 'Bet not found' });
  }
  if (bet.status !== 'ACCEPTED') {
    return res.status(400).json({ message: 'Only accepted bets can be reverted' });
  }

  db.prepare(`
    UPDATE bets SET status = 'OPEN', acceptor_id = NULL, accepted_at = NULL
    WHERE id = ?
  `).run(req.params.id);

  const updated = enrichBet(db.prepare('SELECT * FROM bets WHERE id = ?').get(req.params.id));
  const io = req.app.get('io');
  io.emit('bet:created', updated);
  emitStatsUpdate(io);

  res.json(updated);
});

module.exports = router;
