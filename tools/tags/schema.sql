-- The visitor wall's tags (api/tags.ts). Run it with `mise run tags:sql` (or paste it into Neon's SQL editor, ttshowcase-tags); safe to run again.
-- A removed tag is deleted, not kept: its spot is free and its device may tag again.
--
-- Moving to strokes that keep their own tool and colour (PR7) takes two runs, in this order:
--   1. Run this whole file now (`mise run tags:sql`), BEFORE the deploy. It makes the old columns pen and color optional, so the old
--      code (which still writes them) and the new code (which doesn't) both work.
--   2. Deploy. When the new code is live, run step 2 at the bottom: remove the two dashes in front of it and run `mise run tags:sql` again.
-- A table made new from this file never has pen or color, and step 1 skips what isn't there.
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
-- Step 1: the old columns stay for now, but nothing needs to fill them.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = current_schema() and table_name = 'tags' and column_name = 'pen') then
    alter table tags alter column pen drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = current_schema() and table_name = 'tags' and column_name = 'color') then
    alter table tags alter column color drop not null;
  end if;
end $$;
-- One tag per device, enforced by the database too (two sends at the same moment can't both get in).
create unique index if not exists tags_one_per_device on tags (device);
create index if not exists tags_up on tags (created_at) where status = 'up';
-- Sends per scrambled address in the last day (rows older than a day are deleted on every send).
create table if not exists sends (
  ip_hash text not null,
  at      timestamptz not null default now()
);
create index if not exists sends_by_address on sends (ip_hash, at);

-- Step 2, only after the deploy: take the old columns away (this also drops the color check).
-- alter table tags drop column if exists pen, drop column if exists color;
