-- t286u no curse-word names (Dave). Mirrors names.js isBad() exactly (same lists, same normalisation). Signatures of claim_name/name_free unchanged.
create or replace function public.name_bad_cands(t text) returns text[] language plpgsql immutable set search_path = '' as $$
declare base text[] := array[t]; b text; x text; i int; v text; list text[]; nx text[]; out text[] := '{}'; n int;
begin
  if position('1' in t) > 0 then base := base || replace(t, '1', 'l'); end if;
  foreach b in array base loop
    list := array[regexp_replace(regexp_replace(translate(b, '013457@$!', 'oieastasi'), '8', '', 'g'), '\*+', '*', 'g')];
    for n in 1..3 loop nx := '{}';
      foreach x in array list loop i := position('*' in x);
        if i = 0 then nx := nx || x; else foreach v in array array['a','e','i','o','u',''] loop nx := nx || (substr(x, 1, i - 1) || v || substr(x, i + 1)); end loop; end if;
      end loop; list := nx; end loop;
    foreach x in array list loop out := out || regexp_replace(x, '[^a-z]', '', 'g'); end loop;
  end loop; return out; end $$;

create or replace function public.is_bad_name(p_name text) returns boolean language plpgsql immutable set search_path = '' as $$
declare
  anyw text[] := array['fuck','fuk','fvck','phuck','cunt','nigg','niga','faggot','fagot','motherf','bitch','biatch','whore','slut','wank','twat','bastard','bollock','asshole','ashole','arsehole','dickhead','dikhead','shithead','bullshit','cocksuck','coksuck','dildo','jizz','retard','douche','cumshot','blowjob','handjob'];
  tokw text[] := array['ass','asses','arse','dick','dicks','cock','cocks','tit','tits','titty','titties','boob','boobs','shit','shits','shitty','piss','pissed','crap','damn','fag','fags','cum','sex','sexy','penis','vagina','pussy','prick','porn','rape','rapist','spic','kike','chink','hoe','hoes','anus','anal','homo','tranny','dyke','coon','gook','negro'];
  wl text[] := array['scunthorpe','fuku','swank','snigger'];
  raw text := lower(coalesce(p_name, '')); toks text[]; c text; r text; rc text; w text; t text;
begin
  select coalesce(array_agg(z), '{}') into toks from regexp_split_to_table(raw, '[^a-z0-9@$!*]+') z where z <> '';
  if array_length(toks, 1) is null then return false; end if;
  foreach c in array public.name_bad_cands(array_to_string(toks, '')) loop
    r := c; foreach w in array wl loop r := replace(r, w, ''); end loop; rc := regexp_replace(r, '(.)\1+', '\1', 'g');
    foreach w in array anyw loop
      if position(w in r) > 0 or (regexp_replace(w, '(.)\1+', '\1', 'g') = w and position(w in rc) > 0) then return true; end if; end loop;
    foreach w in array tokw loop if char_length(c) >= char_length(w) and regexp_replace(c, '(.)\1+', '\1', 'g') = regexp_replace(w, '(.)\1+', '\1', 'g') then return true; end if; end loop;
  end loop;
  foreach t in array toks loop foreach c in array public.name_bad_cands(t) loop
    foreach w in array tokw loop if char_length(c) >= char_length(w) and regexp_replace(c, '(.)\1+', '\1', 'g') = regexp_replace(w, '(.)\1+', '\1', 'g') then return true; end if; end loop;
  end loop; end loop;
  return false; end $$;

create or replace function public.claim_name(p_name text, p_owner text, p_legacy boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare k text := lower(btrim(coalesce(p_name, ''))); d text := btrim(coalesce(p_name, '')); cur text;
begin
  if char_length(k) < 1 or char_length(k) > 14 or p_owner is null or char_length(p_owner) < 16 or char_length(p_owner) > 64 or p_owner like '\_\_%' then return 'bad'; end if;
  if public.is_bad_name(d) then return 'bad'; end if;   -- t286u
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
  select not public.is_bad_name(p_name) and not exists (select 1 from public.player_names where name_key = lower(btrim(coalesce(p_name, ''))) and owner_id is distinct from p_owner);
$$;

-- release existing claims that are now blocked (ET excluded); 0 at the time of writing (claims were et, julie, lj)
delete from public.player_names where public.is_bad_name(display) and name_key <> 'et';

revoke all on function public.is_bad_name(text) from public, anon, authenticated;
revoke all on function public.name_bad_cands(text) from public, anon, authenticated;
revoke all on function public.claim_name(text, text, boolean) from public;
revoke all on function public.name_free(text, text) from public;
grant execute on function public.claim_name(text, text, boolean) to anon, authenticated;
grant execute on function public.name_free(text, text) to anon, authenticated;
