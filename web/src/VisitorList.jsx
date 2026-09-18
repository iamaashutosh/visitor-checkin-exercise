import { useState, useEffect } from "react";
import { getVisitors, checkOut } from "./api";

function formatTime(isoString) {
  return new Date(isoString).toISOString().slice(11, 16);
}

export default function VisitorList({ onRefresh }) {
  const [visitors, setVisitors] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getVisitors(page).then((data) => {
      if (data) setVisitors(data);
    });
  }, [page, onRefresh]);

  function handleCheckOut(id) {
    setVisitors((prev) => prev.filter((v) => v.id !== id));
    checkOut(id);
  }

  return (
    <div>
      <h2>Active Visitors</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>SN</th>
            <th style={th}>Id</th>
            <th style={th}>Name</th>
            <th style={th}>Company</th>
            <th style={th}>Host</th>
            <th style={th}>Purpose</th>
            <th style={th}>Checked In</th>
            <th style={th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {visitors.map((v, i) => (
            <tr key={v.id}>
              <td style={td}>{(page - 1) * 20 + i + 1}</td>
              <td style={td}>{v.id}</td>
              <td style={td}>{v.full_name}</td>
              <td style={td}>{v.company_name}</td>
              <td style={td}>{v.host_name}</td>
              <td style={td}>{v.purpose}</td>
              <td style={td}>{formatTime(v.checked_in_at)}</td>
              <td style={td}>
                <button onClick={() => handleCheckOut(v.id)}>Check Out</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: "8px" }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </button>
        <span style={{ margin: "0 12px" }}>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={visitors.length < 20}>
          Next
        </button>
      </div>
    </div>
  );
}

const th = { borderBottom: "1px solid #ccc", padding: "6px 8px", textAlign: "left" };
const td = { padding: "6px 8px", borderBottom: "1px solid #eee" };
