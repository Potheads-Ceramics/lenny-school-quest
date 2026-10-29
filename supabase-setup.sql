-- Lenny's School Quest: online save.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- One table, locked: the browser can only call the two functions below,
-- so nobody can list or browse the saves. A save is found only by its code.

create table if not exists public.lq_saves (
  code       text primary key,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.lq_saves enable row level security;  -- no policies = no direct access

create or replace function public.lq_get_save(p_code text)
returns jsonb language sql security definer set search_path = public as $$
  select state from public.lq_saves where code = upper(p_code);
$$;

create or replace function public.lq_put_save(p_code text, p_state jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_code !~ '^[A-Z]+-[A-Z]+-[0-9]{3}$' or pg_column_size(p_state) > 200000 then
    raise exception 'invalid save';
  end if;
  insert into public.lq_saves (code, state, updated_at)
  values (p_code, p_state, now())
  on conflict (code) do update set state = excluded.state, updated_at = now();
end;
$$;

revoke all on function public.lq_get_save(text) from public;
revoke all on function public.lq_put_save(text, jsonb) from public;
grant execute on function public.lq_get_save(text) to anon;
grant execute on function public.lq_put_save(text, jsonb) to anon;
revoke all on table public.lq_saves from anon, authenticated;
