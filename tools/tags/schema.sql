-- The visitor wall's tags (api/tags.ts). Run it with `mise run tags:sql` (or paste it into Neon's SQL editor, ttshowcase-tags); safe to run again.
-- A removed tag is deleted, not kept: its spot is free and its device may tag again.
create table if not exists tags (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  status      text not null default 'waiting' check (status in ('waiting', 'up')),
  name        text not null default '' check (length(name) <= 24),
  -- The strokes, in the order drawn: [{ "tool", "col", "seed", "pts", "dr" }, ...]. pts is [u, v, ms, pressure, ...],
  -- four numbers a point: u and v in tag pixels (320 a metre, the frame is 2.4 x 1.35 m), ms since the tag was
  -- started, pressure 0..1 with two decimals. dr is the drips: [[index into pts, length in mm, side offset in px], ...].
  strokes     jsonb not null,
  -- The spot on the wall in metres: middle, size, turn in degrees.
  x           real not null,
  y           real not null,
  w           real not null,
  h           real not null,
  turn        real not null,
  device      text not null
);
-- One tag per device, enforced by the database too (two sends at the same moment can't both get in).
create unique index if not exists tags_one_per_device on tags (device);
create index if not exists tags_up on tags (created_at) where status = 'up';
-- Sends per scrambled address in the last day (rows older than a day are deleted on every send). The mail form
-- (api/contact.ts) counts here too, under its own scrambled address.
create table if not exists sends (
  ip_hash text not null,
  at      timestamptz not null default now()
);
create index if not exists sends_by_address on sends (ip_hash, at);
