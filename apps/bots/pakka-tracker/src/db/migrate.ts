import 'dotenv/config';

import { storeClashStatements } from 'src/db/store-clash';
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
    uvs_event_id text NOT NULL UNIQUE,
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
  `ALTER TABLE ottawa_events
    ADD COLUMN IF NOT EXISTS elo_complete boolean NOT NULL DEFAULT false`,
  // PlayRiftbound event ids exceed int4 and JS safe-integer range.
  `ALTER TABLE ottawa_events
    ALTER COLUMN uvs_event_id TYPE text USING uvs_event_id::text`,
  `CREATE TABLE IF NOT EXISTS rb_stores (
    id text PRIMARY KEY,
    name text NOT NULL,
    address jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS rb_events (
    id text PRIMARY KEY,
    name text NOT NULL,
    store_id text REFERENCES rb_stores(id),
    starts_at timestamptz NOT NULL,
    ends_at timestamptz,
    status text,
    tournament_type text,
    structure text,
    round_count integer,
    top_cut integer,
    is_local boolean NOT NULL DEFAULT true,
    location jsonb,
    platform_updated_at timestamptz,
    raw jsonb,
    fetch_count integer NOT NULL DEFAULT 0,
    fetch_attempts integer NOT NULL DEFAULT 0,
    completed_fetches integer NOT NULL DEFAULT 0,
    first_fetched_at timestamptz,
    last_fetched_at timestamptz,
    recheck_after timestamptz,
    elo_complete boolean NOT NULL DEFAULT false,
    elo_processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rb_events_starts_at ON rb_events (starts_at)`,
  `CREATE INDEX IF NOT EXISTS idx_rb_events_store ON rb_events (store_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rb_events_recheck ON rb_events (recheck_after)
    WHERE recheck_after IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_rb_events_elo_pending ON rb_events (starts_at)
    WHERE elo_complete = false`,
  `CREATE TABLE IF NOT EXISTS rb_event_participants (
    event_id text NOT NULL REFERENCES rb_events(id) ON DELETE CASCADE,
    esports_team_id text NOT NULL,
    player_id text NOT NULL,
    display_name text NOT NULL,
    tag_line text,
    status text,
    final_rank integer,
    record text,
    points integer,
    wins integer,
    losses integer,
    draws integer,
    matches_played integer,
    eloshowdown_player_id integer REFERENCES eloshowdown_players(player_id) ON DELETE SET NULL,
    elo_before integer,
    elo_after integer,
    elo_change integer,
    PRIMARY KEY (event_id, esports_team_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rb_participants_player
    ON rb_event_participants (player_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rb_participants_elo_player
    ON rb_event_participants (eloshowdown_player_id)`,
  `CREATE TABLE IF NOT EXISTS rb_rounds (
    event_id text NOT NULL REFERENCES rb_events(id) ON DELETE CASCADE,
    round_number integer NOT NULL,
    stage_id text,
    section_type text,
    status text,
    started_at timestamptz,
    duration_min integer,
    bye_team_ids text[],
    PRIMARY KEY (event_id, round_number)
  )`,
  `CREATE TABLE IF NOT EXISTS rb_matches (
    esports_match_id text PRIMARY KEY,
    event_id text NOT NULL REFERENCES rb_events(id) ON DELETE CASCADE,
    round_number integer NOT NULL,
    table_number integer,
    status text,
    strategy text,
    team1_id text,
    team2_id text,
    team1_outcome text,
    team2_outcome text
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rb_matches_event ON rb_matches (event_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rb_matches_team1 ON rb_matches (team1_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rb_matches_team2 ON rb_matches (team2_id)`,
  `CREATE TABLE IF NOT EXISTS rb_games (
    esports_game_id text PRIMARY KEY,
    esports_match_id text NOT NULL REFERENCES rb_matches(esports_match_id) ON DELETE CASCADE,
    game_number integer,
    team1_outcome text,
    team2_outcome text
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rb_games_match ON rb_games (esports_match_id)`,
  `CREATE TABLE IF NOT EXISTS rb_standings (
    event_id text NOT NULL REFERENCES rb_events(id) ON DELETE CASCADE,
    round_number integer NOT NULL,
    esports_team_id text NOT NULL,
    rank integer,
    match_points integer,
    omw numeric,
    gw numeric,
    ogw numeric,
    wins integer,
    losses integer,
    draws integer,
    PRIMARY KEY (event_id, round_number, esports_team_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rb_standings_event ON rb_standings (event_id)`,
  `CREATE TABLE IF NOT EXISTS rb_sync_state (
    id integer PRIMARY KEY,
    running_until timestamptz,
    last_started_at timestamptz,
    last_finished_at timestamptz,
    last_error text,
    last_discovered integer,
    last_fetched integer,
    last_failed integer
  )`,
  ...storeClashStatements,
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
