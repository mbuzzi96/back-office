-- Run this in the Supabase SQL editor AFTER schema.sql has already been run.
-- It adds a billing/invoices access flag to employees (internally called
-- is_partner, but it's really just "can see billing" — set it on whichever
-- specific people should have it, not necessarily every firm partner).
-- Regular staff keep the ability to log their own time (Log Time) and see
-- their own entries, but can no longer see the firm's billing records,
-- other people's hours, or Invoices at all.

alter table employees add column if not exists is_partner boolean not null default false;

-- Grant billing/invoices access to specific people (edit the name to match
-- exactly what you entered in the employees table). This does NOT need to
-- match every firm partner — for example, if only Michael Buzzi should see
-- billing and invoices, run just this one line:
-- update employees set is_partner = true where name = 'Michael Buzzi';

-- Helper used by the policies below: does the currently signed-in user have
-- billing/invoices access?
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

-- ---------- employees table: lock down who can grant partner access ----------
-- The original schema let any authenticated staff member edit any employees
-- row, which would let someone just flip their own is_partner checkbox to
-- true. Replace that with: everyone can still read the roster (needed for
-- assignment dropdowns), but only partners can create/edit/remove staff.
drop policy if exists "firm staff full access" on employees;
create policy "everyone can read the roster" on employees for select using (auth.role() = 'authenticated');
create policy "only billing admins manage employees" on employees for insert with check (is_current_user_partner());
create policy "only billing admins edit employees" on employees for update using (is_current_user_partner()) with check (is_current_user_partner());
create policy "only billing admins remove employees" on employees for delete using (is_current_user_partner());

-- ---------- invoices: partners only, full stop ----------
drop policy if exists "firm staff full access" on invoices;
create policy "billing access only" on invoices
  for all
  using (is_current_user_partner())
  with check (is_current_user_partner());

-- ---------- firm_info (letterhead): partners only ----------
drop policy if exists "firm staff full access" on firm_info;
create policy "billing access only" on firm_info
  for all
  using (is_current_user_partner())
  with check (is_current_user_partner());

-- ---------- time_entries: partners see everything, staff see only their own ----------
drop policy if exists "firm staff full access" on time_entries;

create policy "billing admins see all time entries" on time_entries
  for select
  using (is_current_user_partner());

create policy "staff see only their own time entries" on time_entries
  for select
  using (
    employee_id in (select id from employees where user_id = auth.uid())
  );

create policy "staff can log their own time" on time_entries
  for insert
  with check (
    employee_id in (select id from employees where user_id = auth.uid())
    or is_current_user_partner()
  );

create policy "edit own entries or billing admin can edit any" on time_entries
  for update
  using (
    employee_id in (select id from employees where user_id = auth.uid())
    or is_current_user_partner()
  )
  with check (
    employee_id in (select id from employees where user_id = auth.uid())
    or is_current_user_partner()
  );

create policy "delete own entries or billing admin can delete any" on time_entries
  for delete
  using (
    employee_id in (select id from employees where user_id = auth.uid())
    or is_current_user_partner()
  );

-- Note: the roster (names/roles) is still readable firm-wide, since Tasks
-- needs the full list to assign work — only writing to it is partner-only
-- now. Clients, tasks, and documents are unchanged. Ask if you also want
-- those split by partner (e.g. each partner only sees their own clients).
