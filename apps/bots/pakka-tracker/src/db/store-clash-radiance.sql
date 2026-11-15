-- Store Clash: Radiance seed data. Run after `yarn db:migrate`.
-- Week 1 is Oct 24-30, 2026; 8 weeks; best 6 scores count; top 4 per store qualify.
-- Future seasons: copy the two statements with a new slug/start/weeks/stores.
INSERT INTO store_clash_seasons (
  slug, name, starts_on, weeks, best_weeks, finals_on, event_types
)
VALUES (
  'radiance-2026',
  'Radiance',
  '2026-10-24',
  8,
  6,
  '2027-01-09',
  '{NEXUS_NIGHT}'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  starts_on = EXCLUDED.starts_on,
  weeks = EXCLUDED.weeks,
  best_weeks = EXCLUDED.best_weeks,
  finals_on = EXCLUDED.finals_on,
  event_types = EXCLUDED.event_types;

WITH season AS (
  SELECT id FROM store_clash_seasons WHERE slug = 'radiance-2026'
)
INSERT INTO store_clash_stores (
  season_id, store_id, weekday, start_time, display_order
)
SELECT season.id, v.store_id, v.weekday, v.start_time, v.display_order
FROM season
CROSS JOIN (
  VALUES
    ('019fd809-8920-7629-bc71-dfda298e85c1', 'Monday',    '6:30 PM',  1),
    ('019fcf63-a17b-725c-bccf-c7d42c01adc7', 'Tuesday',   '6:30 PM',  2),
    ('01a016b7-2141-7aa3-95d6-0851aa68c2a0', 'Tuesday',   '6:30 PM',  3),
    ('01a06d76-d828-713b-80cc-331858a22379', 'Tuesday',   '6:30 PM',  4),
    ('019fc93d-ea6d-7c15-b0fd-3a993a42766b', 'Wednesday', '6:30 PM',  5),
    ('01a01b91-75f2-7270-82e0-b90a7b9ae299', 'Wednesday', '6:30 PM',  6),
    ('019fb060-8fdf-757f-9734-4b14d5021025', 'Wednesday', '6:00 PM',  7),
    ('019ffcaa-f994-738f-90f8-0c2831635e40', 'Thursday',  '6:30 PM',  8),
    ('019fde73-a411-7225-b5f7-32b06e166be0', 'Thursday',  '6:15 PM',  9),
    ('01a01bba-c930-7e22-969b-7bd41ea6cdc2', 'Friday',    '6:30 PM', 10),
    ('019fb060-8d04-7fcb-af1e-d4e764384374', 'Saturday',  '5:30 PM', 11),
    ('019fd2d1-f7dd-75af-ab54-9cd118abd015', 'Sunday',    '11:00 AM', 12)
) AS v(store_id, weekday, start_time, display_order)
ON CONFLICT (season_id, store_id) DO UPDATE SET
  weekday = EXCLUDED.weekday,
  start_time = EXCLUDED.start_time,
  display_order = EXCLUDED.display_order;
