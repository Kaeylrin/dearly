-- Dearly: abuse protection. Run after 001_gifts.sql, in the Supabase SQL editor.
--
-- * Per-IP and global rate limits on creating/editing gifts and on uploads,
--   so a script can't flood the database or storage.
-- * Smaller upload size cap (real photos are ~90 KB, voice notes ~450 KB).
-- * Closes the default grants Supabase gives anon on every new function.
--
-- Rate-limit state lives in the `private` schema, which the API doesn't expose.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.rate_events (
  bucket text not null,
  at     timestamptz not null default now()
);
create index if not exists rate_events_bucket_at on private.rate_events (bucket, at);

-- Client IP as seen by Supabase's edge (Cloudflare sets cf-connecting-ip and
-- clients can't forge it). Null when unavailable.
create or replace function private.client_ip() returns text
language sql stable as $$
  select nullif(coalesce(
    current_setting('request.headers', true)::json ->> 'cf-connecting-ip',
    current_setting('request.headers', true)::json ->> 'x-real-ip'
  ), '')
$$;

-- Records one event; raises 'rate_limited' if the bucket is already at its limit.
create or replace function private.hit(p_bucket text, p_limit int, p_window interval) returns void
language plpgsql security definer set search_path = private, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtext(p_bucket));
  if (select count(*) from private.rate_events where bucket = p_bucket and at > now() - p_window) >= p_limit then
    raise exception 'rate_limited' using errcode = 'P0429', hint = 'Too many requests, try again later.';
  end if;
  insert into private.rate_events (bucket) values (p_bucket);
  -- Opportunistic cleanup, roughly every 200th call.
  if random() < 0.005 then
    delete from private.rate_events where at < now() - interval '1 day';
  end if;
end $$;

create or replace function private.guard(p_action text, p_ip_limit int, p_global_limit int) returns void
language plpgsql security definer set search_path = private, pg_temp as $$
declare
  ip text := private.client_ip();
begin
  if ip is not null then
    perform private.hit(p_action || ':' || ip, p_ip_limit, interval '1 hour');
  end if;
  perform private.hit(p_action || ':all', p_global_limit, interval '1 hour');
end $$;

-- Create: 15 gifts per IP per hour, 1500 site-wide per hour.
create or replace function public.create_gift(p_type text, p_data jsonb)
returns table (id text, edit_token uuid)
language plpgsql security definer set search_path = public as $$
declare
  new_id text;
begin
  perform private.guard('create', 15, 1500);
  loop
    new_id := new_gift_id();
    exit when not exists (select 1 from gifts g where g.id = new_id);
  end loop;
  return query
    insert into gifts (id, type, data) values (new_id, p_type, p_data)
    returning gifts.id, gifts.edit_token;
end $$;

-- Edit: 60 saves per IP per hour.
create or replace function public.update_gift(p_id text, p_token uuid, p_data jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform private.guard('update', 60, 5000);
  update gifts g set data = p_data, updated_at = now()
  where g.id = p_id and g.edit_token = p_token;
  return found;
end $$;

-- Uploads: 40 files per IP per hour, 3000 site-wide. Called from the storage policy.
create or replace function private.can_upload() returns boolean
language plpgsql security definer set search_path = private, pg_temp as $$
begin
  perform private.guard('upload', 40, 3000);
  return true;
end $$;

grant usage on schema private to anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.can_upload() to anon, authenticated;

drop policy if exists "gift media upload" on storage.objects;
create policy "gift media upload" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'gift-media'
    and name ~ '^[0-9a-f-]{36}\.[a-z0-9]{2,5}$'
    and private.can_upload()
  );

-- 1 MB per file is plenty for the shrunk photos and 45 s voice notes.
update storage.buckets set file_size_limit = 1048576 where id = 'gift-media';

-- Supabase grants execute on new functions to anon by default; only the four
-- RPCs the browser needs should be callable.
revoke all on function public.new_gift_id() from public, anon, authenticated;
revoke all on function public.create_gift(text, jsonb) from public;
revoke all on function public.get_gift(text, boolean) from public;
revoke all on function public.get_gift_for_edit(text, uuid) from public;
revoke all on function public.update_gift(text, uuid, jsonb) from public;
grant execute on function public.create_gift(text, jsonb) to anon, authenticated;
grant execute on function public.get_gift(text, boolean) to anon, authenticated;
grant execute on function public.get_gift_for_edit(text, uuid) to anon, authenticated;
grant execute on function public.update_gift(text, uuid, jsonb) to anon, authenticated;

-- The email function (server, service role) records sends here for its limits.
create table if not exists public.email_log (
  id         bigint generated always as identity primary key,
  ip         text,
  recipient  text not null,
  gift_id    text not null references public.gifts (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists email_log_ip_at on public.email_log (ip, created_at);
create index if not exists email_log_recipient_at on public.email_log (recipient, created_at);
create index if not exists email_log_created_at on public.email_log (created_at);
alter table public.email_log enable row level security;
revoke all on public.email_log from anon, authenticated;
