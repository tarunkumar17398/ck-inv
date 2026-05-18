create table public.store_settings (
  id text primary key default 'default' check (id = 'default'),
  store_name text not null default 'CK Arts',
  store_address text not null default 'Baburajapuram, Tamil Nadu',
  store_phone text not null default '+91 96981 06106',
  store_gst_number text not null default '33BDZPT3087K1ZL',
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

create policy "read" on public.store_settings for select using (true);
create policy "write" on public.store_settings for insert with check (id='default');
create policy "edit" on public.store_settings for update using (id='default');

insert into public.store_settings (id) values ('default');