-- Dearly: gifts table, media bucket, and the RPCs the browser calls.
-- Run once in the Supabase SQL editor (or `supabase db push`).
--
-- The browser never touches the table directly: RLS is on with no policies,
-- and everything goes through security-definer functions. Reading needs the
-- gift id (the share link); changing a gift also needs its edit token, which
-- only the sender's edit link carries.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.gifts (
  id              text primary key check (id ~ '^[A-Za-z0-9]{10}$'),
  type            text not null check (type in ('letter','bouquet','countdown','scratch','reasons','timeline','voice','quiz')),
  data            jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 400000),
  edit_token      uuid not null default gen_random_uuid(),
  recipient_email text,
  email_count     int not null default 0,
  emailed_at      timestamptz,
  view_count      int not null default 0,
  first_opened_at timestamptz,
  last_opened_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.gifts enable row level security;
revoke all on public.gifts from anon, authenticated;

-- 10-char id from an unambiguous alphabet, matching the old link format.
create or replace function public.new_gift_id() returns text
language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  bytes bytea := extensions.gen_random_bytes(10);
  result text := '';
begin
  for i in 0..9 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end $$;

create or replace function public.create_gift(p_type text, p_data jsonb)
returns table (id text, edit_token uuid)
language plpgsql security definer set search_path = public as $$
declare
  new_id text;
begin
  loop
    new_id := new_gift_id();
    exit when not exists (select 1 from gifts g where g.id = new_id);
  end loop;
  return query
    insert into gifts (id, type, data) values (new_id, p_type, p_data)
    returning gifts.id, gifts.edit_token;
end $$;

-- Recipient view. p_count is false for the sender's own preview.
create or replace function public.get_gift(p_id text, p_count boolean default true)
returns table (type text, data jsonb)
language plpgsql security definer set search_path = public as $$
begin
  if p_count then
    update gifts g set view_count = g.view_count + 1,
      first_opened_at = coalesce(g.first_opened_at, now()),
      last_opened_at = now()
    where g.id = p_id;
  end if;
  return query select g.type, g.data from gifts g where g.id = p_id;
end $$;

-- Sender's edit link.
create or replace function public.get_gift_for_edit(p_id text, p_token uuid)
returns table (type text, data jsonb, recipient_email text, emailed_at timestamptz, view_count int)
language sql security definer set search_path = public as $$
  select g.type, g.data, g.recipient_email, g.emailed_at, g.view_count
  from gifts g where g.id = p_id and g.edit_token = p_token;
$$;

-- Edits keep the same share link, so a link already sent shows the new version.
create or replace function public.update_gift(p_id text, p_token uuid, p_data jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update gifts g set data = p_data, updated_at = now()
  where g.id = p_id and g.edit_token = p_token;
  return found;
end $$;

revoke all on function public.new_gift_id() from public;
grant execute on function public.create_gift(text, jsonb) to anon, authenticated;
grant execute on function public.get_gift(text, boolean) to anon, authenticated;
grant execute on function public.get_gift_for_edit(text, uuid) to anon, authenticated;
grant execute on function public.update_gift(text, uuid, jsonb) to anon, authenticated;

-- Photos and voice notes. Public read (the gift link is the secret),
-- anonymous upload of small image/audio files only, no overwrite or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gift-media', 'gift-media', true, 6291456,
        array['image/jpeg','image/png','image/webp','audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav','audio/x-m4a','audio/aac'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gift media upload" on storage.objects;
create policy "gift media upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'gift-media' and name ~ '^[0-9a-f-]{36}\.[a-z0-9]{2,5}$');
