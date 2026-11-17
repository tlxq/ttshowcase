-- The visitor wall's tags (api/tags.ts). Applied with `mise run tags:db`; safe to run again.
create table if not exists tags (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  status      text not null default 'waiting' check (status in ('waiting', 'up', 'removed')),
  name        text not null default '' check (length(name) <= 24),
  pen         text not null,
  color       text not null check (color ~ '^#[0-9a-f]{6}$'),
  -- Strokes as [x, y, ms, pressure 0..100, ...] per stroke, whole numbers, 1000 units = the tag's height.
  strokes     jsonb not null,
  x           real not null,
  y           real not null,
  w           real not null,
  turn        real not null,
  device      text not null,
  ip_hash     text not null,
  remove_hash text not null
);
create index if not exists tags_up on tags (created_at) where status = 'up';
create index if not exists tags_recent on tags (created_at);
