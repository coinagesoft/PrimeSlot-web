"use client";

import { useMemo, useState } from "react";

const PRIMARY = "#696cff";
const INITIAL_REQUESTS = [
  {
    id: "PA-1024",
    name: "Priya Patil",
    email: "priya.patil@example.com",
    phone: "+91 87654 32109",
    submittedAt: "21 Oct 2026",
    status: "Pending",
    changes: { "Full name": "Priya Patil", "Phone number": "+91 87654 32109", "City": "Pune", "Profession": "Product Designer" },
    previous: { "Full name": "Priya P.", "Phone number": "Not provided", "City": "Mumbai", "Profession": "Not provided" },
  },
  {
    id: "PA-1023",
    name: "Amit Deshmukh",
    email: "amit.deshmukh@example.com",
    phone: "+91 99887 76655",
    submittedAt: "20 Oct 2026",
    status: "Pending",
    changes: { "Full name": "Amit Deshmukh", "Phone number": "+91 99887 76655", "City": "Pimpri-Chinchwad", "Profession": "Software Engineer" },
    previous: { "Full name": "Amit D.", "Phone number": "Not provided", "City": "Pune", "Profession": "Not provided" },
  },
  {
    id: "PA-1022",
    name: "Sneha Kulkarni",
    email: "sneha.kulkarni@example.com",
    phone: "+91 90909 80808",
    submittedAt: "19 Oct 2026",
    status: "Approved",
    changes: { "Full name": "Sneha Kulkarni", "Phone number": "+91 90909 80808", "City": "Nashik", "Profession": "Teacher" },
    previous: { "Full name": "Sneha K.", "Phone number": "Not provided", "City": "Pune", "Profession": "Not provided" },
  },
  {
    id: "PA-1021",
    name: "Karan Joshi",
    email: "karan.joshi@example.com",
    phone: "+91 88776 65544",
    submittedAt: "18 Oct 2026",
    status: "Rejected",
    reason: "Please provide a valid phone number.",
    changes: { "Full name": "Karan Joshi", "Phone number": "12345", "City": "Mumbai", "Profession": "Accountant" },
    previous: { "Full name": "Karan J.", "Phone number": "Not provided", "City": "Pune", "Profession": "Not provided" },
  },
];

const STATUS_CLASS = {
  Pending: "pa-status-pending",
  Approved: "pa-status-approved",
  Rejected: "pa-status-rejected",
};

function initials(name = "") {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function StatusBadge({ status }) {
  return <span className={`pa-status ${STATUS_CLASS[status] || ""}`}>{status}</span>;
}

function StatCard({ title, value, icon, tone }) {
  return (
    <div className="col-6 col-xl-3">
      <div className="card pa-stat-card h-100">
        <div className="card-body d-flex justify-content-between align-items-center gap-2">
          <div className="min-w-0">
            <div className="pa-muted mb-2">{title}</div>
            <h3 className="pa-stat-value mb-0">{value}</h3>
          </div>
          <div className={`pa-stat-icon ${tone}`}><i className={icon} aria-hidden="true" /></div>
        </div>
      </div>
    </div>
  );
}

function RequestModal({ request, onClose, onApprove, onReject }) {
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  if (!request) return null;

  return (
    <div className="pa-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="pa-modal" role="dialog" aria-modal="true" aria-labelledby="pa-modal-title">
        <header className="pa-modal-header">
          <div>
            <h5 id="pa-modal-title" className="mb-1 fw-semibold">Profile Update Request</h5>
            <div className="pa-muted">Request ID: {request.id}</div>
          </div>
          <button className="btn btn-icon btn-text-secondary rounded-pill" onClick={onClose} type="button" aria-label="Close"><i className="ri-close-line fs-4" /></button>
        </header>
        <div className="pa-modal-body">
          <div className="d-flex align-items-center gap-3 pb-3 mb-3 border-bottom">
            <div className="pa-avatar">{initials(request.name)}</div>
            <div className="min-w-0 flex-grow-1">
              <div className="fw-semibold">{request.name}</div>
              <div className="pa-muted text-break">{request.email}</div>
              <div className="mt-2"><StatusBadge status={request.status} /></div>
            </div>
          </div>
          <div className="pa-changes-heading">Submitted profile details</div>
          <div className="table-responsive">
            <table className="table table-sm align-middle pa-change-table mb-3">
              <thead><tr><th>Field</th><th>Current details</th><th>Submitted details</th></tr></thead>
              <tbody>{Object.keys(request.changes).map((key) => (
                <tr key={key}><td className="fw-medium">{key}</td><td className="text-muted">{request.previous[key] || "—"}</td><td>{request.changes[key] || "—"}</td></tr>
              ))}</tbody>
            </table>
          </div>
          {request.reason && <div className="alert alert-warning mb-3"><strong>Rejection reason:</strong> {request.reason}</div>}
          {request.status === "Pending" && showReject && (
            <div className="mb-2">
              <label className="form-label" htmlFor="pa-reject-reason">Reason for rejection <span className="text-danger">*</span></label>
              <textarea id="pa-reject-reason" className="form-control" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain what the member needs to correct..." required />
            </div>
          )}
        </div>
        <footer className="pa-modal-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
          {request.status === "Pending" && !showReject && <>
            <button type="button" className="btn btn-outline-danger" onClick={() => setShowReject(true)}><i className="ri-close-circle-line me-1" />Reject</button>
            <button type="button" className="btn btn-primary" onClick={() => onApprove(request.id)}><i className="ri-check-line me-1" />Approve</button>
          </>}
          {request.status === "Pending" && showReject && <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowReject(false); setReason(""); }}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={!reason.trim()} onClick={() => onReject(request.id, reason.trim())}><i className="ri-close-circle-line me-1" />Confirm Rejection</button>
          </>}
        </footer>
      </section>
    </div>
  );
}

export default function ProfileApprovalsPage() {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [notice, setNotice] = useState("");

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((request) => request.status === "Pending").length,
    approved: requests.filter((request) => request.status === "Approved").length,
    rejected: requests.filter((request) => request.status === "Rejected").length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesSearch = !query || [request.id, request.name, request.email, request.phone].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesSearch && (statusFilter === "All" || request.status === statusFilter);
    });
  }, [requests, search, statusFilter]);

  const approveRequest = (id) => {
    const request = requests.find((item) => item.id === id);
    setRequests((current) => current.map((item) => item.id === id ? { ...item, status: "Approved", reason: "" } : item));
    setSelectedRequest(null);
    setNotice(`${request?.name || "Profile request"} approved in demo data.`);
  };

  const rejectRequest = (id, reason) => {
    const request = requests.find((item) => item.id === id);
    setRequests((current) => current.map((item) => item.id === id ? { ...item, status: "Rejected", reason } : item));
    setSelectedRequest(null);
    setNotice(`${request?.name || "Profile request"} rejected in demo data.`);
  };

  return (
    <>
      <style jsx global>{`
        .profile-approvals-page { --pa-primary: ${PRIMARY}; --pa-text: #3b4058; color: var(--pa-text); font-size: 0.9375rem; }
        .profile-approvals-page, .profile-approvals-page *, .pa-modal-backdrop, .pa-modal-backdrop * { box-sizing: border-box; }
        .profile-approvals-page h4 { font-size: 1.375rem; line-height: 1.4; letter-spacing: 0; }
        .profile-approvals-page h5, .pa-modal h5 { font-size: 1.0625rem; line-height: 1.4; }
        .profile-approvals-page .pa-muted, .pa-modal .pa-muted { color: #a1a5b7; font-size: 0.8125rem; line-height: 1.5; }
        .profile-approvals-page .card { border: 0; border-radius: 0.75rem; box-shadow: 0 5px 18px rgba(45, 50, 80, 0.08); overflow: hidden; }
        .profile-approvals-page .card-body { padding: 1.25rem; }
        .profile-approvals-page .form-label { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.4375rem; }
        .profile-approvals-page .form-control, .profile-approvals-page .form-select, .pa-modal .form-control { min-height: 42px; font-size: 0.875rem; border-radius: 0.5rem; }
        .profile-approvals-page .form-control:focus, .profile-approvals-page .form-select:focus, .pa-modal .form-control:focus { border-color: var(--pa-primary); box-shadow: 0 0 0 0.15rem rgba(105,108,255,.15); }
        .profile-approvals-page .btn, .pa-modal .btn { min-height: 38px; font-size: 0.875rem; font-weight: 500; border-radius: 0.5rem; padding: 0.5rem 0.875rem; display: inline-flex; align-items: center; justify-content: center; gap: .25rem; }
        .profile-approvals-page .btn-primary, .pa-modal .btn-primary { background: var(--pa-primary); border-color: var(--pa-primary); }
        .profile-approvals-page .btn-primary:hover, .pa-modal .btn-primary:hover { background: #5f62e6; border-color: #5f62e6; }
        .profile-approvals-page .btn-icon, .pa-modal .btn-icon { width: 36px; min-width: 36px; height: 36px; min-height: 36px; padding: 0; }
        .profile-approvals-page .table { font-size: .875rem; margin-bottom: 0; }
        .profile-approvals-page .table > :not(caption) > * > * { padding: .9rem 1rem; vertical-align: middle; }
        .profile-approvals-page .table thead th { color: #8b90a5; font-size: .75rem; font-weight: 600; letter-spacing: .025em; white-space: nowrap; }
        .pa-stat-card { transition: transform .18s ease, box-shadow .18s ease; }
        .pa-stat-card:hover { transform: translateY(-2px); box-shadow: 0 7px 20px rgba(45,50,80,.12); }
        .pa-stat-value { font-size: 1.625rem; line-height: 1.2; font-weight: 600; }
        .pa-stat-icon { width: 46px; height: 46px; min-width: 46px; border-radius: .625rem; display: flex; align-items: center; justify-content: center; font-size: 1.375rem; }
        .pa-stat-icon.primary { color: #696cff; background: rgba(105,108,255,.14); }
        .pa-stat-icon.warning { color: #ffab00; background: rgba(255,171,0,.15); }
        .pa-stat-icon.success { color: #71dd37; background: rgba(113,221,55,.15); }
        .pa-stat-icon.danger { color: #ff3e1d; background: rgba(255,62,29,.12); }
        .pa-status { display: inline-block; border-radius: .375rem; padding: .32rem .55rem; font-size: .75rem; line-height: 1.3; font-weight: 500; white-space: nowrap; }
        .pa-status-pending { color: #ffab00; background: rgba(255,171,0,.15); }
        .pa-status-approved { color: #71dd37; background: rgba(113,221,55,.15); }
        .pa-status-rejected { color: #ff3e1d; background: rgba(255,62,29,.12); }
        .pa-avatar { width: 42px; height: 42px; flex: 0 0 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(105,108,255,.14); color: #696cff; font-weight: 600; }
        .pa-modal-backdrop { position: fixed; inset: 0; z-index: 20000; display: flex; align-items: center; justify-content: center; padding: 1rem; overflow-y: auto; background: rgba(40,50,70,.55); }
        .pa-modal { width: 100%; max-width: 850px; max-height: calc(100dvh - 2rem); overflow-y: auto; background: #fff; color: #3b4058; border-radius: .75rem; box-shadow: 0 1rem 3rem rgba(34,41,47,.24); }
        .pa-modal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e7eaf0; }
        .pa-modal-body { padding: 1.5rem; }
        .pa-modal-footer { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: .625rem; padding: 1rem 1.5rem; border-top: 1px solid #e7eaf0; }
        .pa-changes-heading { font-size: .875rem; font-weight: 600; margin-bottom: .75rem; }
        .pa-change-table { font-size: .8125rem !important; }
        .pa-change-table > :not(caption) > * > * { padding: .65rem .75rem !important; }
        @media (max-width: 767.98px) { .profile-approvals-page .card-body { padding: 1rem; } .pa-stat-value { font-size: 1.375rem; } .pa-stat-icon { width: 38px; height: 38px; min-width: 38px; font-size: 1.125rem; } .pa-modal-header, .pa-modal-body, .pa-modal-footer { padding: 1rem; } .pa-modal { max-height: calc(100dvh - 1.5rem); } }
        @media (max-width: 420px) { .profile-approvals-page h4 { font-size: 1.2rem; } .pa-stat-icon { display: none; } .pa-modal-footer > .btn { flex: 1; } }
        @media (prefers-reduced-motion: reduce) { .pa-stat-card { transition: none !important; } }
      `}</style>

      <main className="container-xxl flex-grow-1 container-p-y profile-approvals-page">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h4 className="fw-bold mb-1">Profile Approvals</h4>
            <p className="text-muted mb-0">Review and manage member profile update requests.</p>
          </div>
          <span className="badge bg-label-primary px-3 py-2">{stats.pending} pending review</span>
        </div>

        {notice && <div className="alert alert-primary alert-dismissible d-flex align-items-start gap-2 mb-4" role="status">
          <i className="ri-information-line fs-5" aria-hidden="true" /><div className="flex-grow-1">{notice}</div>
          <button type="button" className="btn-close" onClick={() => setNotice("")} aria-label="Close notification" />
        </div>}

        <div className="row g-3 g-xl-4 mb-4">
          <StatCard title="Total Requests" value={stats.total} icon="ri-file-list-3-line" tone="primary" />
          <StatCard title="Pending Review" value={stats.pending} icon="ri-time-line" tone="warning" />
          <StatCard title="Approved" value={stats.approved} icon="ri-checkbox-circle-line" tone="success" />
          <StatCard title="Rejected" value={stats.rejected} icon="ri-close-circle-line" tone="danger" />
        </div>

        <div className="card">
          <div className="card-header bg-transparent border-bottom p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div><h5 className="mb-1 fw-semibold">Member Requests</h5><small className="pa-muted">Review submitted changes before approving them.</small></div>
              <span className="badge bg-label-primary">{filteredRequests.length} result{filteredRequests.length === 1 ? "" : "s"}</span>
            </div>
          </div>
          <div className="card-body border-bottom">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-lg-8">
                <label className="form-label" htmlFor="pa-search">Search requests</label>
                <div className="input-group"><span className="input-group-text"><i className="ri-search-line" /></span><input id="pa-search" type="search" className="form-control" placeholder="Search member, email or request ID..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
              </div>
              <div className="col-8 col-lg-3">
                <label className="form-label" htmlFor="pa-status-filter">Status</label>
                <select id="pa-status-filter" className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="All">All statuses</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="col-4 col-lg-1"><button type="button" className="btn btn-outline-secondary w-100" title="Reset filters" aria-label="Reset filters" onClick={() => { setSearch(""); setStatusFilter("All"); }}><i className="ri-refresh-line" /></button></div>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light"><tr><th>Member</th><th>Request ID</th><th>Submitted</th><th>Status</th><th className="text-end">Action</th></tr></thead>
              <tbody>
                {filteredRequests.map((request) => <tr key={request.id}>
                  <td><div className="d-flex align-items-center gap-3"><div className="pa-avatar">{initials(request.name)}</div><div className="min-w-0"><div className="fw-semibold">{request.name}</div><small className="pa-muted text-break">{request.email}</small></div></div></td>
                  <td className="text-nowrap">{request.id}</td><td className="text-nowrap">{request.submittedAt}</td><td><StatusBadge status={request.status} /></td>
                  <td><div className="d-flex justify-content-end"><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSelectedRequest(request)}><i className="ri-eye-line me-1" />Review</button></div></td>
                </tr>)}
                {filteredRequests.length === 0 && <tr><td colSpan={5} className="text-center py-5"><i className="ri-file-search-line fs-1 text-muted d-block mb-2" /><h6 className="mb-1 fw-semibold">No requests found</h6><p className="pa-muted mb-0">Try changing your search or status filter.</p></td></tr>}
              </tbody>
            </table>
          </div>
          <div className="card-footer bg-transparent d-flex flex-wrap justify-content-between align-items-center gap-2"><small className="pa-muted">Showing {filteredRequests.length} of {requests.length} requests</small><small className="pa-muted"><i className="ri-database-2-line me-1" />Sample data</small></div>
        </div>
      </main>

      <RequestModal request={selectedRequest} onClose={() => setSelectedRequest(null)} onApprove={approveRequest} onReject={rejectRequest} />
    </>
  );
}
