import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { db } from "./lib/db";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Clients from "./components/Clients";
import Tasks from "./components/Tasks";
import LogTime from "./components/LogTime";
import Billing from "./components/Billing";
import Documents from "./components/Documents";
import Employees from "./components/Employees";
import Invoices from "./components/Invoices";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [tab, setTab] = useState("dashboard");

  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [firmInfo, setFirmInfo] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    const [c, t, e, d, emp, inv, fi] = await Promise.all([
      db.clients.list(),
      db.tasks.list(),
      db.timeEntries.list(),
      db.documents.list(),
      db.employees.list(),
      db.invoices.list(),
      db.firmInfo.get(),
    ]);
    setClients(c.data || []);
    setTasks(t.data || []);
    setEntries(e.data || []);
    setDocuments(d.data || []);
    setEmployees(emp.data || []);
    setInvoices(inv.data || []);
    setFirmInfo(fi.data || null);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (session) reload();
  }, [session, reload]);

  // Live sync: pick up changes made by other signed-in staff without a manual refresh.
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("back-office-changes")
      .on("postgres_changes", { event: "*", schema: "public" }, () => reload())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session, reload]);

  if (session === undefined) return null; // brief initial auth check
  if (!session) return <Login />;
  if (loadingData) return <div style={{ padding: 40, fontFamily: "var(--font-body)" }}>Opening the back office…</div>;

  const currentEmployee = employees.find((e) => e.user_id === session.user.id) || null;
  const isPartner = !!currentEmployee?.is_partner;

  const openTasks = tasks.filter((t) => t.status !== "Done");
  const overdueCount = openTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date(new Date().toDateString())).length;
  const newForMeCount = currentEmployee
    ? tasks.filter((t) => t.assignee_id === currentEmployee.id && t.status !== "Done" && !(t.seen_by || []).includes(currentEmployee.id)).length
    : 0;

  return (
    <div className="app-shell">
      <Sidebar tab={tab} setTab={setTab} overdueCount={overdueCount} newForMeCount={newForMeCount} isPartner={isPartner} />
      <main className="main">
        {tab === "dashboard" && <Dashboard clients={clients} tasks={tasks} goTo={setTab} />}
        {tab === "clients" && <Clients clients={clients} tasks={tasks} reload={reload} />}
        {tab === "tasks" && <Tasks tasks={tasks} clients={clients} employees={employees} currentEmployee={currentEmployee} reload={reload} />}
        {tab === "logtime" && <LogTime entries={entries} clients={clients} tasks={tasks} currentEmployee={currentEmployee} reload={reload} />}
        {tab === "billing" && isPartner && <Billing entries={entries} clients={clients} employees={employees} reload={reload} />}
        {tab === "documents" && <Documents documents={documents} clients={clients} reload={reload} />}
        {tab === "employees" && <Employees employees={employees} entries={entries} clients={clients} reload={reload} />}
        {tab === "invoices" && isPartner && <Invoices invoices={invoices} clients={clients} entries={entries} tasks={tasks} firmInfo={firmInfo} reload={reload} />}
      </main>
    </div>
  );
}
