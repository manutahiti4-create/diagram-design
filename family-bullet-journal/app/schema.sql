-- Base partagée "Notre petit cocon" (Cloudflare D1)
CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  invite_hash TEXT,            -- empreinte SHA-256 du code d'invitation en cours
  invite_expires TEXT,
  seq INTEGER NOT NULL DEFAULT 0,  -- compteur de modifications
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS devices (
  token_hash TEXT PRIMARY KEY, -- empreinte SHA-256 du jeton de l'appareil (le jeton lui-même n'est jamais stocké)
  household_id TEXT NOT NULL REFERENCES households(id),
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen TEXT
);
CREATE TABLE IF NOT EXISTS docs (
  household_id TEXT NOT NULL REFERENCES households(id),
  path TEXT NOT NULL,
  data TEXT,                   -- JSON du document (NULL si supprimé)
  deleted INTEGER NOT NULL DEFAULT 0,
  owner TEXT,                  -- rempli pour data/users/<id>/… : visible seulement par ce profil
  updated_at TEXT NOT NULL,
  seq INTEGER NOT NULL,
  PRIMARY KEY (household_id, path)
);
CREATE INDEX IF NOT EXISTS docs_seq ON docs(household_id, seq);
