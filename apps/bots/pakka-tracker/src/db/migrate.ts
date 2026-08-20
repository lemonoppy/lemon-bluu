import 'dotenv/config';

import Query from 'src/lib/db';
import { logger } from 'src/lib/logger';

const statements: string[] = [
  `CREATE TABLE IF NOT EXISTS eloshowdown_players (
    player_id integer PRIMARY KEY,
    riftbound_id text UNIQUE,
    display_name text NOT NULL,
    community_tag text,
    country text,
    current_elo integer,
    elo_updated_at timestamptz,
    is_squad boolean NOT NULL DEFAULT false,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS ottawa_events (
    id serial PRIMARY KEY,
    uvs_event_id integer NOT NULL UNIQUE,
    name text NOT NULL,
    store_id integer NOT NULL,
    start_datetime timestamptz NOT NULL,
    end_datetime timestamptz,
    processed_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS event_players (
    event_id integer NOT NULL REFERENCES ottawa_events(id) ON DELETE CASCADE,
    player_id integer NOT NULL REFERENCES eloshowdown_players(player_id) ON DELETE CASCADE,
    uvs_username text,
    rank integer,
    record text,
    points integer,
    matches_played integer,
    wins integer NOT NULL DEFAULT 0,
    losses integer NOT NULL DEFAULT 0,
    draws integer NOT NULL DEFAULT 0,
    elo_before integer,
    elo_after integer,
    elo_change integer,
    PRIMARY KEY (event_id, player_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_event_players_player ON event_players (player_id)`,
  `CREATE INDEX IF NOT EXISTS idx_event_players_event ON event_players (event_id)`,
  `CREATE TABLE IF NOT EXISTS elo_history (
    player_id integer NOT NULL REFERENCES eloshowdown_players(player_id) ON DELETE CASCADE,
    match_id bigint NOT NULL,
    match_date timestamptz NOT NULL,
    elo_before integer NOT NULL,
    elo_after integer NOT NULL,
    elo_change integer NOT NULL,
    opponent_id integer,
    opponent_name text,
    result text,
    PRIMARY KEY (player_id, match_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_elo_history_date ON elo_history (match_date)`,
];

async function main() {
  for (const statement of statements) {
    const result = await Query(statement);
    if (result.isErr()) {
      logger.error(result.error, 'Migration failed');
      process.exit(1);
    }
  }
  logger.info('Database schema is up to date');
}

main();
