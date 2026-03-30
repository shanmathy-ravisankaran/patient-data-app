import { Fragment, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useAppStore } from "../store";

const PAGE_SIZE = 75;

function AuditTrail() {
  const { auditLogs } = useAppStore();
  const [page, setPage] = useState(1);

  const groupedLogs = useMemo(() => {
    const groups = [];
    const groupMap = new Map();

    auditLogs.forEach((log) => {
      const groupKey = log.patientId || log.patientAbhaId || log.id;

      if (!groupMap.has(groupKey)) {
        const nextGroup = {
          key: groupKey,
          patientRef: log.patientAbhaId || log.patientId || "--",
          rows: []
        };

        groupMap.set(groupKey, nextGroup);
        groups.push(nextGroup);
      }

      groupMap.get(groupKey).rows.push(log);
    });

    return groups.map((group) => {
      const summaryLog =
        group.rows.find((row) => row.type === "ABHA ID") || group.rows[0];
      const detailRows = group.rows.filter((row) => row.id !== summaryLog.id);

      return {
        ...group,
        summaryLog,
        detailRows
      };
    });
  }, [auditLogs]);

  const totalPages = Math.max(1, Math.ceil(groupedLogs.length / PAGE_SIZE));
  const paginatedGroups = useMemo(
    () => groupedLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [groupedLogs, page]
  );

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
            <h2>Audit Trail</h2>
            <p>Track important actions performed in the application.</p>
          </div>

          {groupedLogs.length === 0 ? (
            <p className="empty-state">No logs yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Timestamp</th>
                    <th>Created By</th>
                    <th>Facility</th>
                    <th>Change History</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGroups.map((group) => (
                    <Fragment key={group.key}>
                      <tr style={{ fontWeight: 700 }}>
                        <td>{group.summaryLog.action || "Patient Created"}</td>
                        <td>
                          <div>{group.summaryLog.type}</div>
                          <small style={{ color: "#64748b" }}>
                            Ref: {group.patientRef}
                          </small>
                        </td>
                        <td>{group.summaryLog.from}</td>
                        <td>{group.summaryLog.to}</td>
                        <td>{group.summaryLog.timestamp}</td>
                        <td>{group.summaryLog.createdBy}</td>
                        <td>{group.summaryLog.facility}</td>
                        <td>{group.summaryLog.changeHistory}</td>
                      </tr>
                      {group.detailRows.map((log) => (
                        <tr key={log.id} style={{ color: "#64748b" }}>
                          <td />
                          <td style={{ paddingLeft: "28px" }}>{log.type}</td>
                          <td>{log.from}</td>
                          <td>{log.to}</td>
                          <td>{log.timestamp}</td>
                          <td />
                          <td />
                          <td />
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {groupedLogs.length > 0 && (
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

export default AuditTrail;
