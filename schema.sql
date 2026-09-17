-- Smith Buzzi & Associates — Back Office
-- Run this whole file once in the Supabase SQL editor (Dashboard > SQL Editor > New query).

create extension if not exists "uuid-ossp";

-- ---------- employees ----------
-- One row per staff member. Optionally linked to a real Supabase Auth user
-- (auth.users) so "who's logged in" and "who's this timesheet for" are the
-- same identity — no manual picker needed, unlike the old artifact version.
create table employees (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  role text,
  is_partner boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- clients ----------
create table clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  entity_type text,
  status text not null default 'Active',
  email text,
  phone text,
  notes text,
  partner text, -- 'Michael Buzzi' | 'Julio Buzzi' | 'Jose Smith IV' | null
  created_at timestamptz not null default now()
);

-- ---------- tasks ----------
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  client_id uuid references clients(id) on delete set null,
  assignee_id uuid references employees(id) on delete set null,
  category text,
  due_date date,
  priority text default 'Medium',
  status text not null default 'To do',
  notes text,
  seen_by uuid[] not null default '{}', -- employee ids who've opened this task
  created_at timestamptz not null default now()
);

-- ---------- time entries ----------
create table time_entries (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  date date not null,
  minutes integer not null default 0,
  description text,
  billable boolean not null default true,
  billed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- document requests ----------
create table documents (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete set null,
  name text not null,
  description text,
  due_date date,
  status text not null default 'Requested', -- Requested | Received | Reviewed
  link text,
  requested_date date default current_date,
  created_at timestamptz not null default now()
);

-- ---------- invoices ----------
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete set null,
  number text not null,
  date date,
  due_date date,
  line_items jsonb not null default '[]', -- [{id, description, hours, amount, entryId}]
  linked_entry_ids uuid[] not null default '{}',
  notes text,
  status text not null default 'Draft', -- Draft | Sent | Paid
  paid_date date,
  created_at timestamptz not null default now()
);

-- ---------- firm letterhead (single row) ----------
create table firm_info (
  id int primary key default 1,
  name text,
  address_line1 text,
  address_line2 text,
  phone text,
  email text,
  website text,
  constraint single_row check (id = 1)
);
insert into firm_info (id, name) values (1, 'Smith Buzzi & Associates, LLC');

-- ---------- row-level security ----------
-- Simple firm-wide model: any signed-in staff account can read/write
-- clients, tasks, and documents. Time entries and Invoices/billing are
-- more restricted — see below. The is_partner flag on employees is a
-- specific "can see billing & invoices" grant, not the same thing as the
-- "partner" field on clients (which just records who a client belongs to).
-- In practice it might only be one person (e.g. just Michael Buzzi) even
-- though the firm has three partners — that's fine, it's your call per
-- employee, not tied to who's a partner in the business sense.

alter table employees enable row level security;
alter table clients enable row level security;
alter table tasks enable row level security;
alter table time_entries enable row level security;
alter table documents enable row level security;
alter table invoices enable row level security;
alter table firm_info enable row level security;

create policy "firm staff full access" on clients for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "firm staff full access" on tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "firm staff full access" on documents for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Helper used by several policies below: does the currently signed-in user
-- have billing/invoices access? Defined before it's referenced so this
-- script runs top-to-bottom. (Named "partner" internally, but it just means
-- "has this flag checked" — see the note above.)
create or replace function is_current_user_partner()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from employees e
    where e.user_id = auth.uid() and e.is_partner = true
  );
$$;

-- Employees table: everyone can READ the roster (needed for task-assignment
-- dropdowns, Sidebar, etc.) but only people with billing access can
-- add/edit/remove staff or change the is_partner flag itself — otherwise
-- anyone could grant themselves access by editing their own row.
create policy "everyone can read the roster" on employees for select using (auth.role() = 'authenticated');
create policy "only billing admins manage employees" on employees for insert with check (is_current_user_partner());
create policy "only billing admins edit employees" on employees for update using (is_current_user_partner()) with check (is_current_user_partner());
create policy "only billing admins remove employees" on employees for delete using (is_current_user_partner());

-- Invoices and the firm letterhead are restricted to whoever has billing
-- access checked. Time entries are readable by their own employee, or by
-- anyone with billing access (needed to manage billing across everyone's
-- hours). See 002-partner-only-billing.sql for more detail if you're
-- applying this to an existing database instead of a fresh one.

create policy "billing access only" on invoices for all using (is_current_user_partner()) with check (is_current_user_partner());
create policy "billing access only" on firm_info for all using (is_current_user_partner()) with check (is_current_user_partner());

create policy "billing admins see all time entries" on time_entries for select using (is_current_user_partner());
create policy "staff see only their own time entries" on time_entries for select using (employee_id in (select id from employees where user_id = auth.uid()));
create policy "staff can log their own time" on time_entries for insert with check (employee_id in (select id from employees where user_id = auth.uid()) or is_current_user_partner());
create policy "edit own entries or billing admin can edit any" on time_entries for update using (employee_id in (select id from employees where user_id = auth.uid()) or is_current_user_partner()) with check (employee_id in (select id from employees where user_id = auth.uid()) or is_current_user_partner());
create policy "delete own entries or billing admin can delete any" on time_entries for delete using (employee_id in (select id from employees where user_id = auth.uid()) or is_current_user_partner());

-- ---------- after running this ----------
-- 1. Dashboard > Authentication > Users > Add user, for each staff member
--    (set an email + password, or send an invite).
-- 2. Dashboard > Table Editor > employees > insert a row per staff member,
--    and set user_id to match the auth user you just created for them
--    (copy their UUID from Authentication > Users).
-- 3. Set is_partner = true ONLY on the employees row(s) who should see
--    Invoices and Time & Billing — e.g. just Michael Buzzi. Leave it false
--    for everyone else, including other partners if they shouldn't see
--    billing. Everyone (regardless of this flag) can still use Log Time,
--    Tasks, Clients, Documents, and Dashboard, and can see and edit their
--    own logged time afterward.
-- 4. Copy your Project URL and anon public key from
--    Project Settings > API into the app's .env file (see README.md).
