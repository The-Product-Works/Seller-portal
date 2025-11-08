-- Create order_status_history table
create table public.order_status_history (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  changed_by uuid null,
  old_status text null,
  new_status text null,
  remarks text null,
  changed_at timestamp with time zone null default now(),
  constraint order_status_history_pkey primary key (id),
  constraint order_status_history_changed_by_fkey foreign key (changed_by) references auth.users (id),
  constraint order_status_history_order_id_fkey foreign key (order_id) references orders (id)
) tablespace pg_default;

create index if not exists idx_order_status_history_order_id on public.order_status_history using btree (order_id) tablespace pg_default;
create index if not exists idx_order_status_history_changed_at on public.order_status_history using btree (changed_at) tablespace pg_default;

-- Create order_tracking table
create table public.order_tracking (
  tracking_id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  status text not null,
  url text not null,
  location text null,
  notes text null,
  updated_at timestamp with time zone null default now(),
  constraint order_tracking_pkey primary key (tracking_id),
  constraint order_tracking_order_id_fkey foreign key (order_id) references orders (id) on delete cascade
) tablespace pg_default;

create index if not exists idx_order_tracking_order_id on public.order_tracking using btree (order_id) tablespace pg_default;

-- Create return_quality_checks table
create table public.return_quality_checks (
  qc_id uuid not null default gen_random_uuid (),
  return_id uuid not null,
  performed_by uuid null,
  result text null,
  remarks text null,
  checked_at timestamp with time zone null default now(),
  constraint return_quality_checks_pkey primary key (qc_id),
  constraint return_quality_checks_performed_by_fkey foreign key (performed_by) references sellers (id),
  constraint return_quality_checks_return_id_fkey foreign key (return_id) references order_returns (return_id),
  constraint return_quality_checks_result_check check (
    (result = any (array['passed'::text, 'failed'::text]))
  )
) tablespace pg_default;

create index if not exists idx_return_quality_checks_return_id on public.return_quality_checks using btree (return_id) tablespace pg_default;

-- Create return_tracking table
create table public.return_tracking (
  return_tracking_id uuid not null default gen_random_uuid (),
  return_id uuid not null,
  status text not null,
  location text null,
  notes text null,
  updated_at timestamp with time zone null default now(),
  constraint return_tracking_pkey primary key (return_tracking_id),
  constraint return_tracking_return_id_fkey foreign key (return_id) references order_returns (return_id) on delete cascade
) tablespace pg_default;

create index if not exists idx_return_tracking_return_id on public.return_tracking using btree (return_id) tablespace pg_default;

-- Enable RLS for new tables
alter table public.order_status_history enable row level security;
alter table public.order_tracking enable row level security;
alter table public.return_quality_checks enable row level security;
alter table public.return_tracking enable row level security;

-- Create RLS policies for order_status_history
create policy "sellers_view_own_order_status_history" on public.order_status_history
  for select
  using (
    order_id in (
      select id from orders where seller_id = (select id from sellers where user_id = auth.uid())
    )
  );

-- Create RLS policies for order_tracking
create policy "sellers_view_own_order_tracking" on public.order_tracking
  for select
  using (
    order_id in (
      select id from orders where seller_id = (select id from sellers where user_id = auth.uid())
    )
  );

create policy "sellers_insert_order_tracking" on public.order_tracking
  for insert
  with check (
    order_id in (
      select id from orders where seller_id = (select id from sellers where user_id = auth.uid())
    )
  );

-- Create RLS policies for return_quality_checks
create policy "sellers_view_own_return_qc" on public.return_quality_checks
  for select
  using (
    return_id in (
      select return_id from order_returns 
      where order_id in (
        select id from orders where seller_id = (select id from sellers where user_id = auth.uid())
      )
    )
  );

create policy "sellers_insert_return_qc" on public.return_quality_checks
  for insert
  with check (
    return_id in (
      select return_id from order_returns 
      where order_id in (
        select id from orders where seller_id = (select id from sellers where user_id = auth.uid())
      )
    )
  );

-- Create RLS policies for return_tracking
create policy "sellers_view_own_return_tracking" on public.return_tracking
  for select
  using (
    return_id in (
      select return_id from order_returns 
      where order_id in (
        select id from orders where seller_id = (select id from sellers where user_id = auth.uid())
      )
    )
  );

create policy "sellers_insert_return_tracking" on public.return_tracking
  for insert
  with check (
    return_id in (
      select return_id from order_returns 
      where order_id in (
        select id from orders where seller_id = (select id from sellers where user_id = auth.uid())
      )
    )
  );
