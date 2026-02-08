const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'partybet.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bets (
    id TEXT PRIMARY KEY,
    proposition TEXT NOT NULL,
    stake TEXT NOT NULL,
    creator_id TEXT NOT NULL REFERENCES users(id),
    creator_side TEXT NOT NULL CHECK (creator_side IN ('YES', 'NO')),
    acceptor_id TEXT REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACCEPTED', 'RESOLVED', 'COMPLETED', 'CANCELLED')),
    outcome TEXT CHECK (outcome IN ('YES', 'NO')),
    winner_id TEXT REFERENCES users(id),
    loser_id TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    accepted_at TEXT,
    resolved_at TEXT,
    completed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
  CREATE INDEX IF NOT EXISTS idx_bets_creator ON bets(creator_id);
  CREATE INDEX IF NOT EXISTS idx_bets_acceptor ON bets(acceptor_id);
`);

module.exports = db;
