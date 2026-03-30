import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";

function Dashboard() {
  const navigate = useNavigate();
  const { patients, auditLogs } = useAppStore();

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <section className="page-card">
          <div className="page-header">
            <h1>Dashboard</h1>
            <p>Welcome back. Manage patient records, view history, and review audit activity.</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Patients</span>
              <strong>{patients.length}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Audit Entries</span>
              <strong>{auditLogs.length}</strong>
            </div>
          </div>

          <div className="dashboard-actions">
            <button className="btn" onClick={() => navigate("/patient")}>
              Add Patient
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/history")}
            >
              View Patient History
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
