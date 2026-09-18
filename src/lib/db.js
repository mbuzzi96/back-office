import { supabase } from "../supabaseClient";

// Thin, table-shaped wrappers so components never write raw Supabase calls.

// Postgres rejects an empty string "" for date/uuid columns (it's not the
// same as no value). Forms default optional date fields to "" when nothing's
// picked, so convert those to null before anything reaches the database —
// this is what was silently breaking invoice/task/document creation whenever
// an optional date was left blank.
function sanitize(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = value === "" ? null : value;
  }
  return out;
}

// Every write now throws on error instead of returning it silently, so a
// failed save surfaces immediately instead of just not appearing afterward.
function table(name) {
  return {
    list: (orderBy = "created_at") => supabase.from(name).select("*").order(orderBy, { ascending: true }),
    insert: async (row) => {
      const { data, error } = await supabase.from(name).insert(sanitize(row)).select().single();
      if (error) throw new Error(error.message);
      return { data, error: null };
    },
    update: async (id, patch) => {
      const { data, error } = await supabase.from(name).update(sanitize(patch)).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return { data, error: null };
    },
    remove: async (id) => {
      const { error } = await supabase.from(name).delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { error: null };
    },
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
    update: async (patch) => {
      const { data, error } = await supabase.from("firm_info").update(sanitize(patch)).eq("id", 1).select().single();
      if (error) throw new Error(error.message);
      return { data, error: null };
    },
  },
};
