-- The visitor wall's tags (api/tags.ts). Paste into Neon's SQL editor (ttshowcase-tags); safe to run again.
-- A removed tag is deleted, not kept: its spot is free and its device may tag again.
create table if not exists tags (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  status      text not null default 'waiting' check (status in ('waiting', 'up')),
  name        text not null default '' check (length(name) <= 24),
  pen         text not null,
  color       text not null check (color ~ '^#[0-9a-f]{6}$'),
  -- Strokes as [x, y, ms, pressure 0..100, ...] per stroke, whole numbers, 1000 units = the tag's height.
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
