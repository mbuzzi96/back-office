import { supabase } from "../supabaseClient";

// Thin, table-shaped wrappers so components never write raw Supabase calls.
// Each returns { data, error } like the underlying client.

function table(name) {
  return {
    list: (orderBy = "created_at") => supabase.from(name).select("*").order(orderBy, { ascending: true }),
    insert: (row) => supabase.from(name).insert(row).select().single(),
    update: (id, patch) => supabase.from(name).update(patch).eq("id", id).select().single(),
    remove: (id) => supabase.from(name).delete().eq("id", id),
  };
}

export const db = {
  employees: table("employees"),
  clients: table("clients"),
  tasks: table("tasks"),
  timeEntries: table("time_entries"),
  documents: table("documents"),
  invoices: table("invoices"),
  firmInfo: {
    get: () => supabase.from("firm_info").select("*").eq("id", 1).single(),
    update: (patch) => supabase.from("firm_info").update(patch).eq("id", 1).select().single(),
  },
};
