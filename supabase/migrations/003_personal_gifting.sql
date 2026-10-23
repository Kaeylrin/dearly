-- v1.2.0. Apply to an isolated testing project first, after 001 and 002.
begin;
alter table public.gifts add column unlock_at timestamptz;
alter table public.gifts add column notify_opened boolean not null default false;
alter table public.gifts add column allow_replies boolean not null default false;
alter table public.gifts add column sender_email text;
alter table public.gifts drop constraint gifts_type_check;
alter table public.gifts add constraint gifts_type_check check (type in ('letter','bouquet','countdown','scratch','reasons','timeline','voice','quiz','bundle'));
alter table public.gifts add constraint sender_email_consent check ((notify_opened and sender_email is not null) or (not notify_opened and sender_email is null));

create table public.gift_replies (
  id uuid primary key default gen_random_uuid(),
  gift_id text not null references public.gifts(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);
create index gift_replies_gift_at on public.gift_replies(gift_id, created_at);
alter table public.gift_replies enable row level security;
revoke all on public.gift_replies from public, anon, authenticated;

create table public.opened_notifications (
  gift_id text primary key references public.gifts(id) on delete cascade,
  sent_at timestamptz,
  claimed_at timestamptz,
  attempts int not null default 0
);
alter table public.opened_notifications enable row level security;
revoke all on public.opened_notifications from public, anon, authenticated;
grant select, update on public.opened_notifications to service_role;
grant select on public.gifts to service_role;

create function private.apply_gift_settings(p_id text, p_settings jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  notify boolean := coalesce((p_settings->>'notifyOpened')::boolean, false);
  email text := nullif(trim(p_settings->>'senderEmail'), '');
begin
  if notify and (email is null or length(email) > 254 or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$') then
    raise exception 'invalid_sender_email' using errcode = '22023';
  end if;
  update gifts set unlock_at = nullif(p_settings->>'unlockAt', '')::timestamptz,
    notify_opened = notify, sender_email = case when notify then email else null end,
    allow_replies = coalesce((p_settings->>'allowReplies')::boolean, false)
  where id = p_id;
end $$;
revoke all on function private.apply_gift_settings(text, jsonb) from public, anon, authenticated;

-- Replace, rather than overload, to keep old clients' calls unambiguous.
drop function public.create_gift(text, jsonb);
create function public.create_gift(p_type text, p_data jsonb, p_settings jsonb default null)
returns table(id text, edit_token uuid)
language plpgsql security definer set search_path = public, pg_temp as $$
declare new_id text;
begin
  perform private.guard('create', 15, 1500);
  loop
    new_id := new_gift_id();
    exit when not exists(select 1 from gifts g where g.id = new_id);
  end loop;
  insert into gifts(id, type, data) values(new_id, p_type, p_data);
  if p_settings is not null then perform private.apply_gift_settings(new_id, p_settings); end if;
  return query select g.id, g.edit_token from gifts g where g.id = new_id;
end $$;

drop function public.update_gift(text, uuid, jsonb);
create function public.update_gift(p_id text, p_token uuid, p_data jsonb, p_settings jsonb default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform private.guard('update', 60, 5000);
  perform 1 from gifts where id = p_id and edit_token = p_token for update;
  if not found then return false; end if;
  update gifts set data = p_data, updated_at = now() where id = p_id;
  if p_settings is not null then perform private.apply_gift_settings(p_id, p_settings); end if;
  return true;
end $$;

-- Always gate the content in Postgres. Changing a phone clock cannot unlock it.
drop function public.get_gift(text, boolean);
create function public.get_gift(p_id text, p_count boolean default true)
returns table(type text, data jsonb, locked boolean, unlock_at timestamptz, server_now timestamptz, notify_opened boolean, allow_replies boolean)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Opening notices are recorded only by the explicit recipient action, never a GET/crawler.
  return query select g.type,
    case when g.unlock_at > now() then null else g.data end,
    coalesce(g.unlock_at > now(), false), g.unlock_at, now(), g.notify_opened, g.allow_replies
  from gifts g where g.id = p_id;
end $$;

drop function public.get_gift_for_edit(text, uuid);
create function public.get_gift_for_edit(p_id text, p_token uuid)
returns table(type text, data jsonb, recipient_email text, emailed_at timestamptz, view_count int, settings jsonb)
language sql security definer set search_path = public, pg_temp as $$
  select g.type, g.data, g.recipient_email, g.emailed_at, g.view_count,
    jsonb_build_object('unlockAt', g.unlock_at, 'notifyOpened', g.notify_opened, 'allowReplies', g.allow_replies, 'senderEmail', g.sender_email)
  from gifts g where g.id = p_id and g.edit_token = p_token;
$$;

create function public.get_gift_replies(p_id text, p_token uuid)
returns table(id uuid, message text, created_at timestamptz)
language sql security definer set search_path = public, pg_temp as $$
  select r.id, r.message, r.created_at from gift_replies r
  join gifts g on g.id = r.gift_id where g.id = p_id and g.edit_token = p_token
  order by r.created_at desc limit 100;
$$;

-- Only our server can record opens/replies, using its trusted connection IP.
create function public.record_gift_event(p_id text, p_action text, p_message text, p_ip text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare g gifts%rowtype;
begin
  select * into g from gifts where id = p_id for update;
  if not found or g.unlock_at > now() then return false; end if;
  if p_action = 'open' then
    if p_ip is not null then perform private.hit('open:' || p_ip, 120, interval '1 hour'); end if;
    update gifts set view_count = view_count + 1, first_opened_at = coalesce(first_opened_at, now()), last_opened_at = now() where id = p_id;
    if g.first_opened_at is null and g.notify_opened then
      insert into opened_notifications(gift_id) values(p_id) on conflict do nothing;
    end if;
  elsif p_action = 'reply' and g.allow_replies then
    if p_message is null or char_length(trim(p_message)) not between 1 and 500 then raise exception 'invalid_reply' using errcode = '22023'; end if;
    perform private.hit('reply:gift:' || p_id, 10, interval '1 day');
    if p_ip is not null then perform private.hit('reply:ip:' || p_ip, 20, interval '1 hour'); end if;
    perform private.hit('reply:all', 3000, interval '1 day');
    insert into gift_replies(gift_id, message) values(p_id, trim(p_message));
  else return false;
  end if;
  return true;
end $$;

create function public.claim_opened_notifications(p_id text default null)
returns table(gift_id text, sender_email text, gift_type text)
language sql security definer set search_path = public, pg_temp as $$
  with pending as (
    select n.gift_id from opened_notifications n join gifts g on g.id = n.gift_id
    where n.sent_at is null and g.notify_opened and (p_id is null or n.gift_id = p_id)
      and (n.claimed_at is null or n.claimed_at < now() - interval '10 minutes')
    order by n.gift_id limit 20 for update of n skip locked
  ), claimed as (
    update opened_notifications n set claimed_at = now(), attempts = attempts + 1
    from pending p where n.gift_id = p.gift_id returning n.gift_id
  ) select c.gift_id, g.sender_email, g.type from claimed c join gifts g on g.id = c.gift_id;
$$;

-- Atomically reserve an email slot before contacting the provider. Browser resets
-- and concurrent requests cannot bypass the three-sends-per-three-hours window.
create function public.reserve_gift_email(p_id text, p_token uuid, p_to text, p_ip text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare kind text;
begin
  select type into kind from gifts where id = p_id and edit_token = p_token for update;
  if not found then return null; end if;
  perform private.hit('mail:gift:' || p_id, 3, interval '3 hours');
  if p_ip is not null then perform private.hit('mail:ip:' || p_ip, 3, interval '3 hours'); end if;
  perform private.hit('mail:to:' || lower(p_to), 3, interval '1 day');
  perform private.hit('mail:all', 300, interval '1 day');
  insert into email_log(ip, recipient, gift_id) values(p_ip, lower(p_to), p_id);
  update gifts set recipient_email = lower(p_to), emailed_at = now(), email_count = email_count + 1 where id = p_id;
  return kind;
end $$;

revoke all on function public.create_gift(text,jsonb,jsonb), public.update_gift(text,uuid,jsonb,jsonb), public.get_gift(text,boolean), public.get_gift_for_edit(text,uuid), public.get_gift_replies(text,uuid) from public, anon, authenticated;
grant execute on function public.create_gift(text,jsonb,jsonb), public.update_gift(text,uuid,jsonb,jsonb), public.get_gift(text,boolean), public.get_gift_for_edit(text,uuid), public.get_gift_replies(text,uuid) to anon, authenticated;
revoke all on function public.record_gift_event(text,text,text,text), public.claim_opened_notifications(text), public.reserve_gift_email(text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.record_gift_event(text,text,text,text), public.claim_opened_notifications(text), public.reserve_gift_email(text,uuid,text,text) to service_role;
commit;
