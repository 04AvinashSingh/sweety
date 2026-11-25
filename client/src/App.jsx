import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Droplet,
  LayoutDashboard,
  LogOut,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { api } from "./api/client";
import { today, shiftDate } from "./utils/dateUtils";
import AuthPage from "./pages/AuthPage";
import OverviewPage from "./pages/OverviewPage";
import ReportsPage from "./pages/ReportsPage";
import HistoryPage from "./pages/HistoryPage";
import ReadingFormModal from "./components/ReadingFormModal";
import DeleteReadingDialog from "./components/DeleteReadingDialog";

const navItems = [
  { key: "dashboard", Icon: LayoutDashboard, label: "Overview" },
  { key: "reports", Icon: TrendingUp, label: "Reports" },
  { key: "history", Icon: CalendarDays, label: "History" },
];

export default function App() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState("dashboard");
  const [date, setDate] = useState(today());
  const [period, setPeriod] = useState("daily");
  const [report, setReport] = useState(null);
  const [trend, setTrend] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyDate, setHistoryDate] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setReport(null);
      setTrend(null);
      setHistory(null);
      setModal(null);
      setDeleting(null);
      setError("");
      setDeleteError("");
      setHistoryDate("");
      setPage(1);
      return;
    }

    let active = true;
    setFetching(true);
    setError("");

    const requestPromise =
      view === "dashboard"
        ? Promise.all([
            api(`/reports/daily?date=${date}`),
            api(`/reports/month-to-date?date=${date}`),
          ]).then(([dailyReport, mtdTrend]) => {
            if (active) {
              setReport(dailyReport);
              setTrend(mtdTrend);
            }
          })
        : view === "reports"
          ? api(`/reports/${period}?date=${date}`).then((periodReport) => {
              if (active) setReport(periodReport);
            })
          : api(
              `/readings?page=${page}&limit=20${historyDate ? `&date=${historyDate}` : ""}`,
            ).then((historyData) => {
              if (active) setHistory(historyData);
            });

    requestPromise
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setFetching(false);
      });

    return () => {
      active = false;
    };
  }, [user, view, date, period, page, historyDate, refresh]);

  if (loading) return <div className="loading">Loading Sweety…</div>;
  if (!user) return <AuthPage />;

  async function save(values) {
    await api("/readings" + (modal?.reading ? "/" + modal.reading.id : ""), {
      method: modal?.reading ? "PUT" : "POST",
      body: JSON.stringify(values),
    });
    if (!modal?.reading && view === "history" && page !== 1) {
      setPage(1);
    }
    setRefresh((value) => value + 1);
  }

  async function remove() {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api("/readings/" + deleting.id, { method: "DELETE" });
      setDeleting(null);
      if (view === "history" && history?.data.length === 1 && page > 1) {
        setPage((value) => value - 1);
      }
      setRefresh((value) => value + 1);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  const formattedFullDate = new Date(date + "T12:00:00").toLocaleDateString(
    "en-IN",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  const isInitialLoading =
    fetching &&
    ((view === "dashboard" && !report) ||
      (view === "reports" && !report) ||
      (view === "history" && !history));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <a
            href="#overview"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              setView("dashboard");
            }}
          >
            <span className="brand-icon">
              <Droplet size={20} />
            </span>
            Sweety
          </a>
          <div className="mobile-user">
            <span className="avatar mini" title={user.name}>
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="Sign out"
              onClick={logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <nav aria-label="Main navigation">
          {navItems.map(({ key, Icon, label }) => (
            <button
              type="button"
              key={key}
              className={view === key ? "active" : ""}
              onClick={() => setView(key)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="profile">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div className="profile-meta">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Sign out"
            onClick={logout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="workspace">
        <main className="main-content">
          <div className="page-heading">
            <div>
              {view !== "history" && (
                <span className="eyebrow">{formattedFullDate}</span>
              )}
              <h1>
                {view === "dashboard"
                  ? `Hello, ${user.name.split(" ")[0]}`
                  : view === "reports"
                    ? "Glucose Reports"
                    : "Reading History"}
              </h1>
              <p className="muted">
                {view === "dashboard"
                  ? "Daily blood glucose log and summary."
                  : view === "reports"
                    ? "Highest, lowest, and average glucose summaries."
                    : "All logged blood glucose readings."}
              </p>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => setModal({})}
            >
              <Plus size={18} /> Add reading
            </button>
          </div>

          {error && (
            <div role="alert" className="error">
              <span>{error}</span>
              <button
                type="button"
                className="text-button"
                onClick={() => setRefresh((v) => v + 1)}
              >
                Try again
              </button>
            </div>
          )}

          {view !== "history" && (
            <div className="section-toolbar">
              <div className="toolbar-title">
                <h2>{view === "dashboard" ? "Daily summary" : "Summary"}</h2>
                {view === "dashboard" && (
                  <span className="soft-badge">
                    {date === today() ? "Today" : "Selected date"}
                  </span>
                )}
              </div>
              <div className="date-control">
                <button
                  type="button"
                  aria-label="Previous day"
                  onClick={() => setDate(shiftDate(date, -1))}
                >
                  <ChevronLeft size={17} />
                </button>
                <CalendarDays size={16} />
                <input
                  aria-label="Selected date"
                  type="date"
                  value={date}
                  max={today()}
                  onChange={(e) => {
                    if (e.target.value && e.target.value <= today()) {
                      setDate(e.target.value);
                    }
                  }}
                />
                <button
                  type="button"
                  aria-label="Next day"
                  disabled={date >= today()}
                  onClick={() => setDate(shiftDate(date, 1))}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}

          {isInitialLoading ? (
            <div className="loading" role="status">
              Loading your readings…
            </div>
          ) : view === "dashboard" ? (
            <OverviewPage
              date={date}
              report={report}
              trend={trend}
              onOpenModal={setModal}
              onDelete={(row) => {
                setDeleteError("");
                setDeleting(row);
              }}
              onViewHistory={() => setView("history")}
            />
          ) : view === "reports" ? (
            <ReportsPage
              period={period}
              report={report}
              onChangePeriod={setPeriod}
              onOpenModal={setModal}
              onDelete={(row) => {
                setDeleteError("");
                setDeleting(row);
              }}
            />
          ) : (
            <HistoryPage
              history={history}
              page={page}
              filterDate={historyDate}
              onChangeFilterDate={(nextDate) => {
                setHistoryDate(nextDate);
                setPage(1);
              }}
              onChangePage={setPage}
              onOpenModal={setModal}
              onDelete={(row) => {
                setDeleteError("");
                setDeleting(row);
              }}
            />
          )}

          <footer>
            <span>Sweety · Blood Glucose Tracker</span>
          </footer>
        </main>
      </div>

      {modal && (
        <ReadingFormModal
          reading={modal.reading}
          initialSlot={modal.initialSlot}
          date={date}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}

      {deleting && (
        <DeleteReadingDialog
          reading={deleting}
          busy={deleteBusy}
          error={deleteError}
          onClose={() => {
            setDeleteError("");
            setDeleting(null);
          }}
          onDelete={remove}
        />
      )}
    </div>
  );
}
