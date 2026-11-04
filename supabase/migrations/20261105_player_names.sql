-- t2xx unique player names (Dave: "no one can use the same name twice"). Anon can only call the two RPCs below.
create table if not exists public.player_names (
  name_key text primary key check (char_length(name_key) between 1 and 14),   -- lower(trim(name))
  display text not null,
  owner_id text not null,                                                      -- per-device secret (localStorage neonarcade.nameKey), never broadcast
  created_at timestamptz not null default now()
);
create unique index if not exists player_names_owner on public.player_names (owner_id);   -- one name per device
alter table public.player_names enable row level security;                              -- no policies: anon/authenticated get nothing directly
revoke all on public.player_names from anon, authenticated;

-- ET is Dave's: reserved until his device (which already had ET saved before this update) claims it with p_legacy
insert into public.player_names (name_key, display, owner_id) values ('et', 'ET', '__reserved__') on conflict do nothing;

create or replace function public.claim_name(p_name text, p_owner text, p_legacy boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare k text := lower(btrim(coalesce(p_name, ''))); d text := btrim(coalesce(p_name, '')); cur text;
begin
  if char_length(k) < 1 or char_length(k) > 14 or p_owner is null or char_length(p_owner) < 16 or char_length(p_owner) > 64 or p_owner like '\_\_%' then return 'bad'; end if;
  select owner_id into cur from public.player_names where name_key = k for update;
  if cur is not null and cur <> p_owner then
    if not (cur = '__reserved__' and k = 'et' and p_legacy) then return 'taken'; end if;
  end if;
  delete from public.player_names where owner_id = p_owner and name_key <> k;   -- rename releases the old name
  insert into public.player_names (name_key, display, owner_id) values (k, d, p_owner)
    on conflict (name_key) do update set display = excluded.display, owner_id = excluded.owner_id;
  return 'ok';
end $$;

create or replace function public.name_free(p_name text, p_owner text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.player_names where name_key = lower(btrim(coalesce(p_name, ''))) and owner_id is distinct from p_owner);
$$;

revoke all on function public.claim_name(text, text, boolean) from public;
revoke all on function public.name_free(text, text) from public;
grant execute on function public.claim_name(text, text, boolean) to anon, authenticated;
grant execute on function public.name_free(text, text) to anon, authenticated;
