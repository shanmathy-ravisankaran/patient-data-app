import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAppStore } from "../store";

const PAGE_SIZE = 100;

function PatientHistory() {
  const { patients } = useAppStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const filteredPatients = useMemo(
    () =>
      patients.filter((patient) =>
        patient.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      ),
    [patients, searchTerm]
  );
  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const paginatedPatients = filteredPatients.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <section className="page-card">
          <div className="page-header">
            <h2>Patient History</h2>
            <p>Review saved patients and search records by patient name.</p>
          </div>

          <div className="toolbar">
            <input
              type="text"
              placeholder="Search by patient name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredPatients.length === 0 ? (
            <p className="empty-state">No patients found.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ABHA ID</th>
                    <th>Name</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPatients.map((patient) => (
                    <tr key={patient.id}>
                      <td>{patient.abhaId || "--"}</td>
                      <td>{patient.name}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          onClick={() => navigate(`/patient/${patient.id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredPatients.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "16px",
                gap: "12px"
              }}
            >
              <button
                className="btn btn-secondary"
                disabled={page === 1}
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page === totalPages}
                onClick={() =>
                  setPage((currentPage) => Math.min(totalPages, currentPage + 1))
                }
              >
                Next
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default PatientHistory;
