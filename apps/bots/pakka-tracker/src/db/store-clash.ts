// Store Clash schema + the shared standings function. The web explorer and the
// bot command both read from store_clash_standings(slug) so the scoring rules
// live in one place.
export const storeClashStatements: string[] = [
  `CREATE TABLE IF NOT EXISTS store_clash_seasons (
    id serial PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    starts_on date NOT NULL,
    weeks integer NOT NULL DEFAULT 8,
    best_weeks integer NOT NULL DEFAULT 6,
    finals_on date,
    event_types text[] NOT NULL DEFAULT '{NEXUS_NIGHT}',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS store_clash_stores (
    season_id integer NOT NULL REFERENCES store_clash_seasons(id) ON DELETE CASCADE,
    store_id text NOT NULL REFERENCES rb_stores(id),
    weekday text,
    start_time text,
    display_order integer,
    PRIMARY KEY (season_id, store_id)
  )`,
  `CREATE TABLE IF NOT EXISTS store_clash_player_stores (
    season_id integer NOT NULL REFERENCES store_clash_seasons(id) ON DELETE CASCADE,
    player_id text NOT NULL,
    store_id text NOT NULL,
    PRIMARY KEY (season_id, player_id)
  )`,
  `DROP FUNCTION IF EXISTS store_clash_standings(text)`,
  `CREATE FUNCTION store_clash_standings(p_slug text)
  RETURNS TABLE (
    season_slug text,
    season_name text,
    starts_on date,
    weeks integer,
    best_weeks integer,
    finals_on date,
    store_id text,
    store_name text,
    weekday text,
    start_time text,
    display_order integer,
    player_id text,
    display_name text,
    weeks_played integer,
    total_points integer,
    best_six_points integer,
    weekly_points jsonb,
    store_rank integer,
    qualified boolean
  )
  LANGUAGE sql
  STABLE
  AS $$
  WITH season AS (
    SELECT * FROM store_clash_seasons WHERE slug = p_slug
  ),
  participating AS (
    SELECT scs.store_id, scs.weekday, scs.start_time, scs.display_order
    FROM store_clash_stores scs
    JOIN season s ON s.id = scs.season_id
  ),
  eligible AS (
    SELECT ep.player_id,
           ep.display_name,
           e.store_id,
           ep.points::int AS points,
           floor(
             ((e.starts_at AT TIME ZONE 'America/Toronto')::date - s.starts_on) / 7.0
           )::int + 1 AS week_number
    FROM rb_events e
    JOIN rb_event_participants ep ON ep.event_id = e.id
    CROSS JOIN season s
    WHERE e.status = 'COMPLETED'
      AND e.store_id IN (SELECT store_id FROM participating)
      AND e.tournament_type = ANY (s.event_types)
      AND ep.final_rank IS NOT NULL
      AND ep.points IS NOT NULL
      AND (e.starts_at AT TIME ZONE 'America/Toronto')::date
          BETWEEN s.starts_on AND s.starts_on + (s.weeks * 7 - 1)
  ),
  weekly AS (
    SELECT player_id,
           store_id,
           week_number,
           max(points)::int AS points,
           max(display_name) AS display_name
    FROM eligible
    WHERE week_number BETWEEN 1 AND (SELECT weeks FROM season)
    GROUP BY player_id, store_id, week_number
  ),
  player_store AS (
    SELECT player_id,
           store_id,
           max(display_name) AS display_name,
           count(*)::int AS weeks_played,
           sum(points)::int AS total_points,
           max(points)::int AS best_week,
           jsonb_object_agg(week_number::text, points) AS weekly_points
    FROM weekly
    GROUP BY player_id, store_id
  ),
  assigned AS (
    SELECT DISTINCT ON (ps.player_id)
           ps.player_id,
           ps.display_name,
           ps.store_id,
           ps.weeks_played,
           ps.total_points,
           ps.best_week,
           ps.weekly_points
    FROM player_store ps
    LEFT JOIN store_clash_player_stores ov
           ON ov.season_id = (SELECT id FROM season)
          AND ov.player_id = ps.player_id
          AND ov.store_id = ps.store_id
    ORDER BY ps.player_id,
             (ov.player_id IS NOT NULL) DESC,
             ps.weeks_played DESC,
             ps.total_points DESC,
             ps.best_week DESC,
             ps.store_id ASC
  ),
  with_best AS (
    SELECT a.*,
           COALESCE((
             SELECT sum(top.value::int)
             FROM (
               SELECT value
               FROM jsonb_each_text(a.weekly_points)
               ORDER BY value::int DESC
               LIMIT (SELECT best_weeks FROM season)
             ) top
           ), 0)::int AS best_six_points
    FROM assigned a
  ),
  ranked AS (
    SELECT b.*,
           row_number() OVER (
             PARTITION BY b.store_id
             ORDER BY b.best_six_points DESC,
                      b.total_points DESC,
                      b.weeks_played DESC,
                      b.best_week DESC,
                      b.display_name ASC
           )::int AS store_rank
    FROM with_best b
  )
  SELECT s.slug,
         s.name,
         s.starts_on,
         s.weeks,
         s.best_weeks,
         s.finals_on,
         p.store_id,
         st.name,
         p.weekday,
         p.start_time,
         p.display_order,
         r.player_id,
         r.display_name,
         r.weeks_played,
         r.total_points,
         r.best_six_points,
         r.weekly_points,
         r.store_rank,
         COALESCE(r.store_rank <= 4, false)
  FROM participating p
  JOIN rb_stores st ON st.id = p.store_id
  CROSS JOIN season s
  LEFT JOIN ranked r ON r.store_id = p.store_id
  ORDER BY p.display_order ASC NULLS LAST, st.name ASC, r.store_rank ASC
  $$`,
];
