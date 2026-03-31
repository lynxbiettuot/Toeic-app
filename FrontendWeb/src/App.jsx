import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import * as XLSX from "xlsx";

const ADMIN_ACCOUNTS = [
  {
    email: "admin@gmail.com",
    password: "1234",
    name: "Admin mặc định",
  },
  {
    email: "manager@gmail.com",
    password: "1234",
    name: "Admin quản lý",
  },
];

const API_ROOT = "http://localhost:3000/admin";
const EXAM_API_BASE_URL = `${API_ROOT}/exams`;
const DASHBOARD_API_BASE_URL = `${API_ROOT}/dashboard`;
const VOCAB_API_BASE_URL = `${API_ROOT}/vocab-sets`;

const EXAM_STATUS_FILTERS = [
  { value: "ACTIVE", label: "Mặc định" },
  { value: "PRIVATE", label: "Private" },
  { value: "PUBLIC", label: "Public" },
];

const VOCAB_STATUS_FILTERS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PRIVATE", label: "Private" },
  { value: "PUBLIC", label: "Public" },
  { value: "WARNING", label: "Cảnh báo" },
];

const TABLE_PAGE_SIZE = 5;

const apiFetchJson = async (url, options = {}) => {
  const token = localStorage.getItem("toeic_admin_token");
  
  // Only set Content-Type to JSON if body is not FormData
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Nếu bị Unauthorized (401), có thể token đã hết hạn
    if (response.status === 401 && !url.includes("/auth/login")) {
      localStorage.removeItem("toeic_admin_token");
      window.location.hash = "/login"; // Force redirect if unauthorized
    }

    let errorMessage = "Request failed.";
    try {
      const errorResult = await response.json();
      errorMessage = errorResult?.message || errorMessage;
    } catch {
      // ignore json parse error
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage mode="overview" />} />
        <Route path="users" element={<DashboardPage mode="users" />} />
        <Route path="exams" element={<ExamListPage />} />
        <Route path="exams/new" element={<ExamCreatePage />} />
        <Route path="exams/import-excel" element={<ImportExcelPage />} />
        <Route path="exams/:examSetId" element={<ExamDetailPage />} />
        <Route path="vocab" element={<VocabManagementPage />} />
      </Route>
    </Routes>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: ADMIN_ACCOUNTS[0].email,
    password: ADMIN_ACCOUNTS[0].password,
  });
  const [error, setError] = useState("");

  const helperText = useMemo(
    () =>
      ADMIN_ACCOUNTS.map(
        (account) => `${account.name}: ${account.email} / ${account.password}`,
      ).join("\n"),
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:3000/auth/login/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Đăng nhập thất bại.");
      }

      // Save token and admin info
      localStorage.setItem("toeic_admin_token", result.accessToken);
      localStorage.setItem("toeic_admin_info", JSON.stringify(result.adminData || {}));
      
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi đăng nhập.");
    }
  };

  return (
    <main className="page login-page">
      <section className="login-card">
        <div className="login-visual">
          <div className="login-title-wrap">
            <p className="eyebrow">Màn hình đăng nhập Admin</p>
            <h1>Đăng nhập hệ thống quản trị TOEIC</h1>
            <span className="title-underline" />
          </div>

          <div className="sheet-illustration">
            <div className="sheet-grid" />
            <div className="sheet-shadow" />
            <div className="pencil" />
            <div className="pencil-tip" />
          </div>
        </div>

        <div className="login-panel">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-shell">
              <input
                className="login-input"
                type="email"
                name="email"
                placeholder="Username"
                value={form.email}
                onChange={handleChange}
              />

              <input
                className="login-input"
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
              />

              <button className="login-button" type="submit">
                Login
              </button>

              <p className="login-helper">{helperText}</p>
              {error ? <p className="login-error">{error}</p> : null}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("toeic_admin_token");
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("toeic_admin_token");
    localStorage.removeItem("toeic_admin_info");
    navigate("/login", { replace: true });
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <main className="page dashboard-page">
      <section className="dashboard-shell">
        <header className="dashboard-title">{pageTitle}</header>

        <div className="dashboard-layout">
          <aside className="sidebar">
            <div className="sidebar-brand">Hệ thống TOEIC</div>
            <nav className="sidebar-nav">
              <NavButton
                to="/admin/dashboard"
                label="Dashboard"
                active={location.pathname === "/admin/dashboard"}
              />
              <NavButton
                to="/admin/users"
                label="Quản lý người dùng"
                active={location.pathname === "/admin/users"}
              />
              <NavButton
                to="/admin/exams"
                label="Quản lý đề thi"
                active={location.pathname.startsWith("/admin/exams")}
              />
              <NavButton
                to="/admin/vocab"
                label="Quản lý Từ vựng"
                active={location.pathname.startsWith("/admin/vocab")}
              />
              <button
                className="sidebar-link sidebar-logout"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </nav>
          </aside>

          <section className="dashboard-main">
            <div className="topbar">
              <div className="topbar-pill" />
            </div>
            <div className="dashboard-content">
              <Outlet />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function DashboardPage({ mode = "overview" }) {
  const isOverview = mode === "overview";
  const [range, setRange] = useState("month");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedUserSet, setSelectedUserSet] = useState(null);
  const [selectedSetWordId, setSelectedSetWordId] = useState(null);
  const [setWordSearch, setSetWordSearch] = useState("");
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [userActionMessage, setUserActionMessage] = useState("");
  const [overview, setOverview] = useState({
    summary: {
      newUsers: 0,
      totalTests: 0,
      activeUsers: 0,
      completionRate: 0,
    },
    topExams: [],
    scoreDistribution: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOverview) {
      return;
    }

    const loadOverview = async () => {
      try {
        setError("");
        const result = await apiFetchJson(`${DASHBOARD_API_BASE_URL}/overview?range=${range}`);
        setOverview(result.data);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Không thể tải dashboard.");
      }
    };

    loadOverview();
  }, [isOverview, range]);

  useEffect(() => {
    setSelectedUserId(null);
    setProfile(null);
    setSelectedUserSet(null);
    setSelectedSetWordId(null);
    setSetWordSearch("");
    setUserActionMessage("");

    if (isOverview) {
      return;
    }

    const loadUsers = async () => {
      try {
        setError("");
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const result = await apiFetchJson(`${DASHBOARD_API_BASE_URL}/users${query}`);
        setUsers(result.data || []);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Không thể tải danh sách user.");
      }
    };

    loadUsers();
  }, [isOverview, search]);

  useEffect(() => {
    setCurrentUserPage(1);
  }, [search]);

  useEffect(() => {
    if (isOverview || !selectedUserId) {
      setProfile(null);
      return;
    }

    const loadProfile = async () => {
      try {
        setError("");
        const result = await apiFetchJson(`${DASHBOARD_API_BASE_URL}/users/${selectedUserId}/profile`);
        setProfile(result.data);
        setSelectedUserSet(null);
        setSelectedSetWordId(null);
        setSetWordSearch("");
        setUserActionMessage("");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Không thể tải hồ sơ user.");
      }
    };

    loadProfile();
  }, [isOverview, selectedUserId]);

  const topExamMax = Math.max(...overview.topExams.map((item) => item.attempts), 1);
  const topExamTotalAttempts = overview.topExams.reduce((sum, item) => sum + Number(item.attempts || 0), 0);
  const barData = overview.topExams.map((item) => ({
    label: item.title,
    attempts: item.attempts,
    percent: topExamTotalAttempts > 0 ? Math.round((item.attempts / topExamTotalAttempts) * 100) : 0,
    height: `${Math.max(12, Math.round((item.attempts / topExamMax) * 100))}%`,
  }));

  const completionRate = Math.max(0, Math.min(100, Number(overview.summary.completionRate ?? 0)));

  const scoreMaxCount = Math.max(...overview.scoreDistribution.map((entry) => entry.count), 1);
  const scoreChartData = overview.scoreDistribution.map((item, index) => {
    const x = 44 + index * 94;
    const y = 174 - Math.round((item.count / scoreMaxCount) * 128);
    return {
      ...item,
      x,
      y,
    };
  });

  const linePoints =
    scoreChartData.length > 1
      ? scoreChartData.map((item) => `${item.x},${item.y}`).join(" ")
      : "44,174 420,174";

  const personalTrendPoints = useMemo(() => {
    const progress = profile?.progress ?? [];
    if (progress.length === 0) {
      return "";
    }

    const maxScore = 990;
    const chartWidth = 420;
    const chartHeight = 70;
    const gap = progress.length > 1 ? chartWidth / (progress.length - 1) : 0;

    return progress
      .map((item, index) => {
        const score = Number(item.score ?? 0);
        const x = 8 + index * gap;
        const y = 90 - Math.round((Math.max(0, Math.min(maxScore, score)) / maxScore) * chartHeight);
        return `${x},${y}`;
      })
      .join(" ");
  }, [profile]);

  const downloadOverviewReport = async () => {
    try {
      setError("");
      const token = localStorage.getItem("toeic_admin_token");
      const response = await fetch(`${DASHBOARD_API_BASE_URL}/export?range=${range}`, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("toeic_admin_token");
          window.location.hash = "/login";
        }
        throw new Error("Không thể xuất báo cáo.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `dashboard-${range}-${Date.now()}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xuất báo cáo.");
    }
  };

  const handleDeleteUserFlashcard = async (setId) => {
    if (!selectedUserId) {
      return;
    }

    try {
      setError("");
      await apiFetchJson(`${DASHBOARD_API_BASE_URL}/users/${selectedUserId}/flashcards/${setId}`, {
        method: "DELETE",
      });

      const refreshed = await apiFetchJson(`${DASHBOARD_API_BASE_URL}/users/${selectedUserId}/profile`);
      setProfile(refreshed.data);
      setSelectedUserSet((current) => (current?.id === setId ? null : current));
      setSelectedSetWordId(null);
      setUserActionMessage("Đã xóa bộ flashcard của user.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xóa flashcard user.");
    }
  };

  const handleWarnUserFlashcard = async (setId) => {
    if (!selectedUserId) {
      return;
    }

    try {
      setError("");
      const result = await apiFetchJson(
        `${DASHBOARD_API_BASE_URL}/users/${selectedUserId}/flashcards/${setId}/warn`,
        {
          method: "POST",
        },
      );
      setUserActionMessage(result?.message || "Đã gửi cảnh báo.");
      
      // Refetch profile để cập nhật warnedAt
      const profileResult = await apiFetchJson(`${DASHBOARD_API_BASE_URL}/users/${selectedUserId}/profile`);
      setProfile(profileResult.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể cảnh báo bộ flashcard.");
    }
  };

  const handleViewUserFlashcardSet = async (setId) => {
    if (!selectedUserId) {
      return;
    }

    try {
      setError("");
      const result = await apiFetchJson(`${DASHBOARD_API_BASE_URL}/users/${selectedUserId}/flashcards/${setId}`);
      setSelectedUserSet(result.data);
      setSelectedSetWordId(null);
      setSetWordSearch("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải bộ flashcard của user.");
    }
  };

  const closeUserProfileModal = () => {
    setSelectedUserId(null);
    setSelectedUserSet(null);
    setSelectedSetWordId(null);
    setSetWordSearch("");
    setUserActionMessage("");
  };

  const filteredSetWords = useMemo(() => {
    const cards = selectedUserSet?.flashcards ?? [];
    const keyword = setWordSearch.trim().toLowerCase();
    if (!keyword) {
      return cards;
    }

    return cards.filter(
      (card) =>
        String(card.word ?? "").toLowerCase().includes(keyword) ||
        String(card.definition ?? "").toLowerCase().includes(keyword),
    );
  }, [selectedUserSet, setWordSearch]);

  const selectedSetWord = useMemo(
    () => (selectedUserSet?.flashcards ?? []).find((card) => card.id === selectedSetWordId) ?? null,
    [selectedUserSet, selectedSetWordId],
  );

  const totalUserPages = Math.max(1, Math.ceil(users.length / TABLE_PAGE_SIZE));

  useEffect(() => {
    if (currentUserPage > totalUserPages) {
      setCurrentUserPage(totalUserPages);
    }
  }, [currentUserPage, totalUserPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentUserPage - 1) * TABLE_PAGE_SIZE;
    return users.slice(start, start + TABLE_PAGE_SIZE);
  }, [users, currentUserPage]);

  return (
    <section className="exam-screen">
      <div className="dashboard-heading-row">
        <h2>{isOverview ? "Dashboard" : "Quản lý User"}</h2>
      </div>

      {isOverview ? (
        <>
          <div className="exam-toolbar compact-toolbar">
            <select
              className="exam-filter"
              value={range}
              onChange={(event) => setRange(event.target.value)}
            >
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
              <option value="all">Tất cả</option>
            </select>
            <button className="exam-add-button" type="button" onClick={downloadOverviewReport}>
              Xuất Excel
            </button>
          </div>

          <div className="stats-grid">
            <StatCard label="Số user mới" value={String(overview.summary.newUsers ?? 0)} />
            <StatCard label="Tổng lượt thi" value={String(overview.summary.totalTests ?? 0)} />
            <StatCard label="Số user hoạt động" value={String(overview.summary.activeUsers ?? 0)} />
          </div>

          <div className="chart-grid">
            <section className="chart-card">
              <h3>Top 5 bộ đề được làm nhiều nhất</h3>
              {barData.length === 0 ? (
                <p className="empty-state">Chưa có dữ liệu lượt thi cho khoảng thời gian này.</p>
              ) : (
                <div className="bar-chart enhanced">
                  <div className="chart-meta-row">
                    <span>Đơn vị: lượt thi</span>
                    <strong>Tổng top 5: {topExamTotalAttempts}</strong>
                  </div>
                  <div className="bar-list enhanced">
                    {barData.map((item, index) => (
                      <div className="bar-item enhanced" key={item.label}>
                        <span className="bar-value">{item.attempts}</span>
                        <div className={`bar-fill color-${index + 1}`} style={{ height: item.height }} />
                        <span className="bar-percent">{item.percent}%</span>
                        <span className="bar-label" title={item.label}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="chart-card pie-card">
              <h3>Tỷ lệ hoàn thành bài thi</h3>
              <div className="pie-chart" style={{ "--completion-rate": completionRate }}>
                <div className="pie-center">
                  <strong>{completionRate}%</strong>
                  <span>Hoàn thành</span>
                </div>
              </div>
              <div className="pie-legend">
                <span><i className="dot done" /> Đã nộp bài</span>
                <span><i className="dot pending" /> Chưa nộp</span>
              </div>
            </section>
          </div>

          <section className="chart-card line-card">
            <h3>Phổ điểm người dùng</h3>
            {scoreChartData.length === 0 ? (
              <p className="empty-state">Chưa có dữ liệu điểm để hiển thị phổ điểm.</p>
            ) : (
              <div className="line-chart enhanced">
                <svg viewBox="0 0 520 220" preserveAspectRatio="none">
                  <line x1="44" y1="24" x2="44" y2="174" className="line-axis" />
                  <line x1="44" y1="174" x2="500" y2="174" className="line-axis" />

                  <polyline points={linePoints} className="line-path" />

                  {scoreChartData.map((item) => (
                    <g key={item.label}>
                      <circle cx={item.x} cy={item.y} r="4" className="line-point" />
                      <text x={item.x} y={item.y - 10} textAnchor="middle" className="line-value-label">
                        {item.count}
                      </text>
                      <text x={item.x} y="196" textAnchor="middle" className="line-x-label">
                        {item.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="exam-toolbar compact-toolbar">
            <input
              className="exam-search"
              type="text"
              placeholder="Tìm theo họ tên hoặc email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="table-shell">
            <table className="exam-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Ngày đăng ký</th>
                  <th>Điểm trung bình</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      Không tìm thấy user phù hợp.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td>{(currentUserPage - 1) * TABLE_PAGE_SIZE + index + 1}</td>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>{user.registerDate}</td>
                      <td>{user.averageScore}</td>
                      <td>
                        <button
                          className="table-inline-button"
                          type="button"
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          Hồ sơ học viên
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {users.length > 0 ? (
            <PaginationControls
              currentPage={currentUserPage}
              totalPages={totalUserPages}
              onPageChange={setCurrentUserPage}
            />
          ) : null}

          {selectedUserId ? (
            <div className="user-modal-overlay" onClick={closeUserProfileModal}>
              <section className="chart-card profile-card user-modal" onClick={(event) => event.stopPropagation()}>
                <div className="question-list-head">
                  <h3>Hồ sơ học viên: {profile?.user?.fullName ?? "-"}</h3>
                  <button className="table-inline-button" type="button" onClick={closeUserProfileModal}>
                    Đóng
                  </button>
                </div>

                <p className="detail-label">Lịch sử thi thử</p>
                <div className="table-shell">
                  <table className="exam-table">
                    <thead>
                      <tr>
                        <th>Đề thi</th>
                        <th>Reading</th>
                        <th>Listening</th>
                        <th>Thời gian làm bài</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(profile?.tests ?? []).map((item) => (
                        <tr key={`${item.id}-${item.exam}`}>
                          <td>{item.exam}</td>
                          <td>{item.reading}</td>
                          <td>{item.listening}</td>
                          <td>{item.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="detail-label">Thống kê cá nhân (xu hướng điểm)</p>
                <div className="line-chart personal-line-chart">
                  <svg viewBox="0 0 440 110" preserveAspectRatio="none">
                    <polyline points={personalTrendPoints || "8,80 428,80"} />
                  </svg>
                  <div className="chart-axis axis-y" />
                  <div className="chart-axis axis-x" />
                </div>

                <p className="detail-label">Kho flashcard cá nhân (chỉ xem, cho phép xóa)</p>
                <div className="action-grid">
                  {(profile?.flashcards ?? []).length === 0 ? (
                    <p className="empty-state">User chưa có bộ flashcard public.</p>
                  ) : (
                    (profile?.flashcards ?? []).map((item) => (
                      <div className="action-chip" key={item.id}>
                        <span>
                          {item.title} ({item.type}) - {item.cardCount} thẻ
                        </span>
                        <div className="table-action-group">
                          <button
                            className="table-inline-button"
                            type="button"
                            onClick={() => handleViewUserFlashcardSet(item.id)}
                          >
                            Xem bộ
                          </button>
                          <button
                            className="table-inline-button"
                            type="button"
                            disabled={!!item.warnedAt}
                            onClick={() => handleWarnUserFlashcard(item.id)}
                          >
                            {item.warnedAt ? "Đã cảnh báo" : "Cảnh báo"}
                          </button>
                          <button
                            className="table-inline-button danger"
                            type="button"
                            onClick={() => handleDeleteUserFlashcard(item.id)}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {selectedUserSet ? (
                  <section className="chart-card profile-card">
                    <div className="question-list-head">
                      <h3>Nội dung bộ: {selectedUserSet.title}</h3>
                      <div className="table-action-group">
                        <button
                          className="table-inline-button"
                          type="button"
                          disabled={!!selectedUserSet.warnedAt}
                          onClick={() => handleWarnUserFlashcard(selectedUserSet.id)}
                        >
                          {selectedUserSet.warnedAt ? "Đã cảnh báo" : "Cảnh báo"} người dùng
                        </button>
                        <button
                          className="table-inline-button danger"
                          type="button"
                          onClick={() => handleDeleteUserFlashcard(selectedUserSet.id)}
                        >
                          Xóa bộ này
                        </button>
                      </div>
                    </div>

                    {selectedSetWord ? (
                      <div className="answer-block">
                        <p className="detail-label">Chi tiết từ vựng</p>
                        <DetailRow label="Từ vựng" value={selectedSetWord.word || "-"} />
                        <DetailRow label="Định nghĩa" value={selectedSetWord.definition || "-"} />
                        <DetailRow label="Loại từ" value={selectedSetWord.word_type || "-"} />
                        <DetailRow label="Phiên âm" value={selectedSetWord.pronunciation || "-"} />
                        <DetailRow label="Ví dụ" value={selectedSetWord.example || "-"} />
                        <UrlDetailRow label="URL ảnh" value={selectedSetWord.image_url} mediaType="image" />
                        <UrlDetailRow label="URL audio" value={selectedSetWord.audio_url} mediaType="audio" />

                        <button
                          className="table-inline-button"
                          type="button"
                          onClick={() => setSelectedSetWordId(null)}
                        >
                          Quay lại bảng từ
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          className="exam-search"
                          type="text"
                          placeholder="Tìm từ trong bộ flashcard"
                          value={setWordSearch}
                          onChange={(event) => setSetWordSearch(event.target.value)}
                        />

                        <div className="table-shell">
                          <table className="exam-table">
                            <thead>
                              <tr>
                                <th>STT</th>
                                <th>Từ vựng</th>
                                <th>Loại từ</th>
                                <th>Định nghĩa</th>
                                <th>Chi tiết</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSetWords.length === 0 ? (
                                <tr>
                                  <td colSpan="5" className="empty-state">
                                    Không có từ phù hợp.
                                  </td>
                                </tr>
                              ) : (
                                filteredSetWords.map((card, index) => (
                                  <tr key={card.id} className="word-row" onClick={() => setSelectedSetWordId(card.id)}>
                                    <td>{index + 1}</td>
                                    <td>{card.word || "-"}</td>
                                    <td>{card.word_type || "-"}</td>
                                    <td>{card.definition || "-"}</td>
                                    <td>
                                      <button
                                        className="table-inline-button"
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedSetWordId(card.id);
                                        }}
                                      >
                                        Xem từ
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </section>
                ) : null}
              </section>
            </div>
          ) : null}
        </>
      )}
      {error ? <p className="page-feedback error">{error}</p> : null}
    </section>
  );
}

function ExamListPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [currentExamPage, setCurrentExamPage] = useState(1);

  const fetchExams = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      const keyword = search.trim();

      if (keyword) {
        params.set("search", keyword);
      }

      if (statusFilter !== "ACTIVE") {
        params.set("status", statusFilter);
      }

      const queryString = params.toString();
      const result = await apiFetchJson(queryString ? `${EXAM_API_BASE_URL}?${queryString}` : EXAM_API_BASE_URL);
      setExams(result.data || []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Không thể tải danh sách đề thi.");
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [search, statusFilter]);

  useEffect(() => {
    setCurrentExamPage(1);
  }, [search, statusFilter]);

  const totalExamPages = Math.max(1, Math.ceil(exams.length / TABLE_PAGE_SIZE));

  useEffect(() => {
    if (currentExamPage > totalExamPages) {
      setCurrentExamPage(totalExamPages);
    }
  }, [currentExamPage, totalExamPages]);

  const paginatedExams = useMemo(() => {
    const start = (currentExamPage - 1) * TABLE_PAGE_SIZE;
    return exams.slice(start, start + TABLE_PAGE_SIZE);
  }, [exams, currentExamPage]);

  const getExamDisplayStatus = (exam) => {
    if (exam.status === "PUBLISHED") {
      return "PUBLIC";
    }
    return "PRIVATE";
  };

  const handleInlineExamStatusChange = async (exam, nextDisplayStatus) => {
    const nextStatus = nextDisplayStatus === "PUBLIC" ? "PUBLISHED" : "HIDDEN";

    try {
      await apiFetchJson(`${EXAM_API_BASE_URL}/${exam.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      fetchExams();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể cập nhật trạng thái đề.");
    }
  };

  const handleDeleteExam = async (exam) => {
    try {
      await apiFetchJson(`${EXAM_API_BASE_URL}/${exam.id}`, {
        method: "DELETE",
      });

      fetchExams();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xóa đề.");
    }
  };

  return (
    <section className="exam-screen">
      <div className="dashboard-heading-row exam-heading">
        <h2>Quản lý đề thi TOEIC</h2>
      </div>

      <div className="exam-toolbar">
        <input
          className="exam-search"
          type="text"
          placeholder="Tìm theo tên đề hoặc năm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="exam-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          {EXAM_STATUS_FILTERS.map((item) => (
            <option value={item.value} key={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Link className="exam-add-button" to="/admin/exams/new">
          Thêm mới
        </Link>
      </div>

      {error ? <p className="page-feedback error">{error}</p> : null}

      <div className="table-shell">
        <table className="exam-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên đề</th>
              <th>Năm</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  Đang tải danh sách đề thi...
                </td>
              </tr>
            ) : exams.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  Không có đề thi phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              paginatedExams.map((exam, index) => (
                <tr key={exam.id}>
                  <td>{(currentExamPage - 1) * TABLE_PAGE_SIZE + index + 1}</td>
                  <td>{exam.title}</td>
                  <td>{exam.year ?? "-"}</td>
                  <td>
                    <select
                      className="exam-filter inline-status-filter"
                      value={getExamDisplayStatus(exam)}
                      onChange={(event) => {
                        handleInlineExamStatusChange(exam, event.target.value).catch((requestError) => {
                          setError(
                            requestError instanceof Error
                              ? requestError.message
                              : "Không thể cập nhật trạng thái đề.",
                          );
                        });
                      }}
                    >
                      <option value="PRIVATE">Private</option>
                      <option value="PUBLIC">Public</option>
                    </select>
                  </td>
                  <td>
                    <div className="table-action-group">
                      <Link className="table-action-link" to={`/admin/exams/${exam.id}`}>
                        Xem đề
                      </Link>
                      <button
                        className="table-inline-button danger"
                        type="button"
                        onClick={() => handleDeleteExam(exam)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {exams.length > 0 ? (
        <PaginationControls
          currentPage={currentExamPage}
          totalPages={totalExamPages}
          onPageChange={setCurrentExamPage}
        />
      ) : null}
    </section>
  );
}

function ExamCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [message, setMessage] = useState({
    type: "",
    value: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateExam = async (event) => {
    event.preventDefault();
    setMessage({ type: "", value: "" });

    if (!title.trim() || !year.trim()) {
      setMessage({ type: "error", value: "Vui lòng nhập tên đề và năm." });
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await apiFetchJson(EXAM_API_BASE_URL, {
        method: "POST",
        body: JSON.stringify({
          title,
          year,
          type: "TOEIC",
        }),
      });

      setMessage({ type: "success", value: result.message || "Tạo đề thi nháp thành công." });
      const examId = result?.data?.id;
      window.setTimeout(() => {
        navigate(examId ? `/admin/exams/${examId}` : "/admin/exams");
      }, 700);
    } catch (requestError) {
      setMessage({
        type: "error",
        value: requestError instanceof Error ? requestError.message : "Không thể tạo đề thi nháp.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="exam-screen">
      <div className="create-panel">
        <div className="create-tabs">
          <button className="create-tab is-active" type="button">
            Nhập thủ công
          </button>
          <Link className="create-tab create-tab-link" to="/admin/exams/import-excel">
            Import Excel
          </Link>
        </div>

        <form className="import-form-card manual-form" onSubmit={handleCreateExam}>
          <h3>Tạo đề thủ công</h3>
          <input
            className="import-input"
            type="text"
            placeholder="Tên đề thi"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            className="import-input"
            type="text"
            placeholder="Năm"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />

          <div className="import-actions">
            <button className="import-button import-button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang tạo..." : "Tạo đề nháp"}
            </button>
          </div>

          <p className={`import-status ${message.type}`}>{message.value}</p>
          <p className="mock-url">Đã bỏ chức năng bảng quy đổi điểm theo yêu cầu.</p>
        </form>
      </div>
    </section>
  );
}

function ImportExcelPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [status, setStatus] = useState({
    type: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);

  const extractPreviewFromExcel = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames?.[0];

    if (!firstSheetName) {
      throw new Error("Không tìm thấy sheet dữ liệu trong file Excel.");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
      blankrows: false,
    });

    if (!rows.length) {
      throw new Error("File Excel không có dữ liệu để preview.");
    }

    const firstDataRow = rows[0];
    const getByHeader = (targetHeader) => {
      const key = Object.keys(firstDataRow).find(
        (header) => String(header).trim().toUpperCase() === targetHeader,
      );
      return key ? String(firstDataRow[key] ?? "").trim() : "";
    };

    const image = getByHeader("QUESTION_IMAGE_URL");
    const audio = getByHeader("QUESTION_AUDIO_URL");

    if (!image && !audio) {
      throw new Error(
        "Không tìm thấy dữ liệu ở cột Question_Image_URL hoặc Question_Audio_URL tại dòng đầu tiên.",
      );
    }

    setPreviewRows([
      {
        row: 1,
        image,
        audio,
      },
    ]);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0] ?? null;
    setExcelFile(file);
    setStatus({ type: "", message: "" });
    setPreviewRows([]);

    if (file) {
      try {
        await extractPreviewFromExcel(file);
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "Không thể đọc file Excel để preview.",
        });
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim() || !year.trim() || !excelFile) {
      setStatus({
        type: "error",
        message: "Vui lòng nhập tên đề, năm và chọn file Excel.",
      });
      return;
    }

    const invalidRow = previewRows.find(
      (row) => !isHttpUrl(row.audio) || !isHttpUrl(row.image),
    );
    if (invalidRow) {
      setStatus({
        type: "error",
        message: `Dòng ${invalidRow.row}: URL media không hợp lệ (chỉ nhận HTTP/HTTPS).`,
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({
      type: "info",
      message: "Đang upload và validate file Excel...",
    });

    const formData = new FormData();
    formData.append("title", title);
    formData.append("year", year);
    formData.append("type", "TOEIC");
    formData.append("excelFile", excelFile);

    try {
      const result = await apiFetchJson(`${EXAM_API_BASE_URL}/import-excel`, {
        method: "POST",
        body: formData,
      });

      setStatus({
        type: "success",
        message: "Import hợp lệ. Đề đã lưu với trạng thái Nháp.",
      });

      const examId = result?.data?.examId;
      window.setTimeout(() => {
        navigate(examId ? `/admin/exams/${examId}` : "/admin/exams");
      }, 900);
    } catch (submitError) {
      setStatus({
        type: "error",
        message:
          submitError instanceof Error
            ? submitError.message
            : "Không thể gửi file Excel lên backend.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="exam-screen">
      <div className="create-panel">
        <div className="create-tabs">
          <Link className="create-tab create-tab-link" to="/admin/exams/new">
            Nhập thủ công
          </Link>
          <button className="create-tab is-active" type="button">
            Import Excel
          </button>
        </div>

        <form className="import-form-card" onSubmit={handleSubmit}>
          <input
            className="import-input"
            type="text"
            placeholder="Tên đề thi"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <input
            className="import-input"
            type="text"
            placeholder="Năm xuất bản"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />

          <label className="file-picker">
            <span>{excelFile ? excelFile.name : "Chọn file Excel từ máy"}</span>
            <input type="file" accept=".xlsx" onChange={handleFileChange} />
          </label>

          {previewRows.length > 0 ? (
            <div className="preview-box">
              <p className="detail-label">Preview nhanh dữ liệu media</p>
              {previewRows.map((row) => (
                <div key={row.row} className="preview-row">
                  <span>Dòng {row.row}</span>
                  {row.image ? (
                    <div className="preview-row-media">
                      <a className="url-link" href={row.image} target="_blank" rel="noreferrer">
                        {row.image}
                      </a>
                      <img className="media-preview-image" src={row.image} alt={`Preview ảnh dòng ${row.row}`} />
                    </div>
                  ) : null}
                  {row.audio ? (
                    <div className="preview-row-media">
                      <a className="url-link" href={row.audio} target="_blank" rel="noreferrer">
                        {row.audio}
                      </a>
                      <audio className="media-preview-audio" controls preload="none" src={row.audio}>
                        Trình duyệt không hỗ trợ audio.
                      </audio>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="import-actions">
            <button
              className="import-button import-button-secondary"
              type="button"
              onClick={() => navigate("/admin/exams/new")}
            >
              Trở lại
            </button>
            <button className="import-button import-button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu vào Nháp"}
            </button>
          </div>

          <p className={`import-status ${status.type}`}>{status.message}</p>
        </form>
      </div>
    </section>
  );
}

function ExamDetailPage() {
  const { examSetId } = useParams();
  const [exam, setExam] = useState(null);
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState(null);
  const [questionDetail, setQuestionDetail] = useState(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showCreateQuestionForm, setShowCreateQuestionForm] = useState(false);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [createDraft, setCreateDraft] = useState({
    part_number: "5",
    content: "",
    image_url: "",
    audio_url: "",
    correct_answer: "A",
    answerA: "",
    answerB: "",
    answerC: "",
    answerD: "",
  });
  const [editDraft, setEditDraft] = useState({
    content: "",
    image_url: "",
    audio_url: "",
    correct_answer: "A",
    answerA: "",
    answerB: "",
    answerC: "",
    answerD: "",
  });

  const loadExam = useCallback(async () => {
    if (!examSetId) {
      return;
    }

    setLoadingExam(true);
    setError("");

    try {
      const result = await apiFetchJson(`${EXAM_API_BASE_URL}/${examSetId}/questions`);
      setExam(result.data);

      setSelectedQuestionNumber((current) => {
        const hasSelectedQuestion = (result.data?.questions ?? []).some(
          (question) => question.question_number === current,
        );
        if (hasSelectedQuestion) {
          return current;
        }

        return result.data?.questions?.[0]?.question_number ?? null;
      });
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Không thể tải danh sách câu hỏi.",
      );
    } finally {
      setLoadingExam(false);
    }
  }, [examSetId]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  useEffect(() => {
    let ignore = false;

    const loadQuestionDetail = async () => {
      if (!examSetId || !selectedQuestionNumber) {
        setQuestionDetail(null);
        return;
      }

      setLoadingQuestion(true);

      try {
        const result = await apiFetchJson(
          `${EXAM_API_BASE_URL}/${examSetId}/questions/${selectedQuestionNumber}`,
        );

        if (!ignore) {
          setQuestionDetail(result.data);
          const answers = result.data?.answers ?? [];
          const getAnswer = (label) => answers.find((item) => item.option_label === label)?.content || "";

          setEditDraft({
            content: result.data?.content || "",
            image_url: result.data?.image_url || "",
            audio_url: result.data?.audio_url || "",
            correct_answer: result.data?.correct_answer || "A",
            answerA: getAnswer("A"),
            answerB: getAnswer("B"),
            answerC: getAnswer("C"),
            answerD: getAnswer("D"),
          });
          setSaveMessage("");
        }
      } catch (fetchError) {
        if (!ignore) {
          setQuestionDetail(null);
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Không thể tải chi tiết câu hỏi.",
          );
        }
      } finally {
        if (!ignore) {
          setLoadingQuestion(false);
        }
      }
    };

    loadQuestionDetail();

    return () => {
      ignore = true;
    };
  }, [examSetId, selectedQuestionNumber]);

  const handleSaveQuestion = async () => {
    if (!examSetId || !selectedQuestionNumber) {
      return;
    }

    try {
      setSaving(true);
      setSaveMessage("");

      const payload = {
        content: editDraft.content,
        image_url: editDraft.image_url,
        audio_url: editDraft.audio_url,
        correct_answer: editDraft.correct_answer,
        answers: [
          { option_label: "A", content: editDraft.answerA },
          { option_label: "B", content: editDraft.answerB },
          { option_label: "C", content: editDraft.answerC },
          { option_label: "D", content: editDraft.answerD },
        ],
      };

      await apiFetchJson(
        `${EXAM_API_BASE_URL}/${examSetId}/questions/${selectedQuestionNumber}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      setSaveMessage("Đã lưu chỉnh sửa câu hỏi.");
    } catch (requestError) {
      setSaveMessage(requestError instanceof Error ? requestError.message : "Không thể lưu câu hỏi.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateQuestion = async () => {
    if (!examSetId) {
      return;
    }

    const partNumber = Number.parseInt(createDraft.part_number, 10);
    if (Number.isNaN(partNumber) || partNumber <= 0) {
      setCreateMessage("Part phải là số nguyên dương.");
      return;
    }

    if (!createDraft.answerA.trim() || !createDraft.answerB.trim() || !createDraft.answerC.trim() || !createDraft.answerD.trim()) {
      setCreateMessage("Vui lòng nhập đủ đáp án A, B, C, D.");
      return;
    }

    try {
      setCreatingQuestion(true);
      setCreateMessage("");

      const payload = {
        part_number: partNumber,
        content: createDraft.content,
        image_url: createDraft.image_url,
        audio_url: createDraft.audio_url,
        correct_answer: createDraft.correct_answer,
        answers: [
          { option_label: "A", content: createDraft.answerA },
          { option_label: "B", content: createDraft.answerB },
          { option_label: "C", content: createDraft.answerC },
          { option_label: "D", content: createDraft.answerD },
        ],
      };

      const result = await apiFetchJson(`${EXAM_API_BASE_URL}/${examSetId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      await loadExam();
      setSelectedQuestionNumber(result?.data?.question_number ?? null);
      setShowCreateQuestionForm(false);
      setCreateDraft((current) => ({
        ...current,
        content: "",
        image_url: "",
        audio_url: "",
        answerA: "",
        answerB: "",
        answerC: "",
        answerD: "",
      }));
      setCreateMessage("Đã thêm câu mới thành công.");
    } catch (requestError) {
      setCreateMessage(
        requestError instanceof Error ? requestError.message : "Không thể thêm câu hỏi.",
      );
    } finally {
      setCreatingQuestion(false);
    }
  };

  return (
    <section className="exam-screen">
      <div className="exam-detail-header">
        <div>
          <h2>{exam?.title ?? "Chi tiết đề thi"}</h2>
          <p>
            Năm: {exam?.year ?? "-"} | Số câu: {exam?.questions?.length ?? 0}
          </p>
        </div>
        <Link className="exam-add-button" to="/admin/exams">
          Trở về danh sách
        </Link>
      </div>

      {error ? <p className="page-feedback error">{error}</p> : null}

      <div className="exam-detail-layout">
        <section className="question-list-card">
          <div className="question-list-head">
            <h3>Danh sách câu hỏi</h3>
            <button
              className="exam-add-button question-add-inline"
              type="button"
              onClick={() => {
                setCreateMessage("");
                setShowCreateQuestionForm(true);
                setSelectedQuestionNumber(null);
              }}
            >
              + Thêm câu
            </button>
          </div>
          {loadingExam ? (
            <p className="empty-state">Đang tải câu hỏi...</p>
          ) : (
            <div className="question-grid">
              {(exam?.questions ?? []).map((question) => (
                <button
                  key={question.id}
                  className={`question-chip ${
                    selectedQuestionNumber === question.question_number ? "is-active" : ""
                  }`}
                  type="button"
                  onClick={() => {
                    setShowCreateQuestionForm(false);
                    setSelectedQuestionNumber(question.question_number);
                  }}
                >
                  {question.question_number}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="question-detail-card">
          <h3>Chi tiết câu hỏi</h3>
          {loadingQuestion ? (
            <p className="empty-state">Đang tải chi tiết câu hỏi...</p>
          ) : questionDetail ? (
            <div className="question-detail-content">
              <DetailRow label="Câu số" value={questionDetail.question_number} />
              <DetailRow label="Part" value={questionDetail.part_number} />
              <DetailRow label="Nội dung" value={questionDetail.content || "Không có"} />
              <UrlDetailRow label="URL ảnh" value={questionDetail.image_url} mediaType="image" />
              <UrlDetailRow label="URL audio" value={questionDetail.audio_url} mediaType="audio" />
              <DetailRow
                label="Transcript"
                value={questionDetail.transcript || questionDetail.group?.transcript || "Không có"}
              />
              <DetailRow
                label="Đoạn văn nhóm"
                value={questionDetail.group?.passage_text || "Không có"}
              />
              <DetailRow label="Đáp án đúng" value={questionDetail.correct_answer} />

              <div className="answer-block">
                <p className="detail-label">Các đáp án</p>
                <div className="answer-list">
                  {(questionDetail.answers ?? []).map((answer) => (
                    <div key={answer.option_label} className="answer-item">
                      <strong>{answer.option_label}.</strong> {answer.content}
                    </div>
                  ))}
                </div>
              </div>

              <div className="answer-block">
                <p className="detail-label">Sửa nhanh câu hỏi</p>
                <textarea
                  className="import-input import-textarea"
                  value={editDraft.content}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, content: event.target.value }))
                  }
                />
                <input
                  className="import-input"
                  placeholder="URL ảnh"
                  value={editDraft.image_url}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, image_url: event.target.value }))
                  }
                />
                <input
                  className="import-input"
                  placeholder="URL audio"
                  value={editDraft.audio_url}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, audio_url: event.target.value }))
                  }
                />
                <input
                  className="import-input"
                  placeholder="Đáp án A"
                  value={editDraft.answerA}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, answerA: event.target.value }))
                  }
                />
                <input
                  className="import-input"
                  placeholder="Đáp án B"
                  value={editDraft.answerB}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, answerB: event.target.value }))
                  }
                />
                <input
                  className="import-input"
                  placeholder="Đáp án C"
                  value={editDraft.answerC}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, answerC: event.target.value }))
                  }
                />
                <input
                  className="import-input"
                  placeholder="Đáp án D"
                  value={editDraft.answerD}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, answerD: event.target.value }))
                  }
                />
                <select
                  className="exam-filter"
                  value={editDraft.correct_answer}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, correct_answer: event.target.value }))
                  }
                >
                  <option value="A">Đáp án đúng: A</option>
                  <option value="B">Đáp án đúng: B</option>
                  <option value="C">Đáp án đúng: C</option>
                  <option value="D">Đáp án đúng: D</option>
                </select>

                <button className="import-button import-button-primary" type="button" onClick={handleSaveQuestion} disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu chỉnh sửa"}
                </button>
              </div>
            </div>
          ) : (
            <p className="empty-state">Hãy chọn một câu để xem chi tiết.</p>
          )}

          {showCreateQuestionForm ? (
            <div className="answer-block add-question-block">
              <div className="question-list-head">
                <p className="detail-label">Thêm câu mới</p>
                <button
                  className="table-inline-button"
                  type="button"
                  onClick={() => setShowCreateQuestionForm(false)}
                >
                  Đóng
                </button>
              </div>
              <input
                className="import-input"
                type="number"
                min="1"
                placeholder="Part (ví dụ: 5)"
                value={createDraft.part_number}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, part_number: event.target.value }))
                }
              />
              <textarea
                className="import-input import-textarea"
                placeholder="Nội dung câu hỏi"
                value={createDraft.content}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, content: event.target.value }))
                }
              />
              <input
                className="import-input"
                placeholder="URL ảnh"
                value={createDraft.image_url}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, image_url: event.target.value }))
                }
              />
              <input
                className="import-input"
                placeholder="URL audio"
                value={createDraft.audio_url}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, audio_url: event.target.value }))
                }
              />
              <input
                className="import-input"
                placeholder="Đáp án A"
                value={createDraft.answerA}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, answerA: event.target.value }))
                }
              />
              <input
                className="import-input"
                placeholder="Đáp án B"
                value={createDraft.answerB}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, answerB: event.target.value }))
                }
              />
              <input
                className="import-input"
                placeholder="Đáp án C"
                value={createDraft.answerC}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, answerC: event.target.value }))
                }
              />
              <input
                className="import-input"
                placeholder="Đáp án D"
                value={createDraft.answerD}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, answerD: event.target.value }))
                }
              />
              <select
                className="exam-filter"
                value={createDraft.correct_answer}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, correct_answer: event.target.value }))
                }
              >
                <option value="A">Đáp án đúng: A</option>
                <option value="B">Đáp án đúng: B</option>
                <option value="C">Đáp án đúng: C</option>
                <option value="D">Đáp án đúng: D</option>
              </select>

              <button
                className="import-button import-button-primary"
                type="button"
                onClick={handleCreateQuestion}
                disabled={creatingQuestion}
              >
                {creatingQuestion ? "Đang thêm..." : "Thêm câu"}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function VocabManagementPage() {
  const [sets, setSets] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentSetPage, setCurrentSetPage] = useState(1);
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cardDraft, setCardDraft] = useState({
    word: "",
    definition: "",
    word_type: "",
    pronunciation: "",
    example: "",
    image_url: "",
  });
  const [cards, setCards] = useState([]);
  const [importTitle, setImportTitle] = useState("");
  const [importDescription, setImportDescription] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [detailReadOnly, setDetailReadOnly] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDraft, setDetailDraft] = useState({
    title: "",
    description: "",
  });
  const [detailCards, setDetailCards] = useState([]);
  const [detailSearch, setDetailSearch] = useState("");
  const [selectedDetailCardId, setSelectedDetailCardId] = useState(null);
  const [savingDetail, setSavingDetail] = useState(false);
  const [message, setMessage] = useState("");

  const fetchSets = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    const keyword = search.trim();

    if (keyword) {
      params.set("search", keyword);
    }

    try {
      const result = await apiFetchJson(`${VOCAB_API_BASE_URL}?${params.toString()}`);
      const normalized = (result.data || []).filter((item) => !item.deleted_at);

      let filtered = normalized;
      if (statusFilter === "PRIVATE") {
        filtered = normalized.filter((item) => item.status === "DRAFT" || item.status === "HIDDEN");
      } else if (statusFilter === "PUBLIC") {
        filtered = normalized.filter((item) => item.status === "PUBLISHED");
      } else if (statusFilter === "WARNING") {
        filtered = normalized.filter((item) => !!item.warnedAt);
      }

      setSets(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets().catch((requestError) => {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể tải bộ từ vựng.");
    });
  }, [search, statusFilter]);

  useEffect(() => {
    setCurrentSetPage(1);
  }, [search, statusFilter]);

  const totalSetPages = Math.max(1, Math.ceil(sets.length / TABLE_PAGE_SIZE));

  useEffect(() => {
    if (currentSetPage > totalSetPages) {
      setCurrentSetPage(totalSetPages);
    }
  }, [currentSetPage, totalSetPages]);

  const paginatedSets = useMemo(() => {
    const start = (currentSetPage - 1) * TABLE_PAGE_SIZE;
    return sets.slice(start, start + TABLE_PAGE_SIZE);
  }, [sets, currentSetPage]);

  const changeSetStatus = async (setId, nextStatus) => {
    try {
      await apiFetchJson(`${VOCAB_API_BASE_URL}/${setId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchSets();
      setMessage("Cập nhật trạng thái bộ từ vựng thành công.");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể cập nhật trạng thái bộ từ vựng.");
    }
  };

  const getVocabDisplayStatus = (setItem) => {
    if (setItem.warnedAt) {
      return "WARNING";
    }

    if (setItem.status === "PUBLISHED") {
      return "PUBLIC";
    }

    return "PRIVATE";
  };

  const handleInlineStatusChange = async (setItem, nextDisplayStatus) => {
    if (nextDisplayStatus === "WARNING") {
      if (setItem.ownerType !== "USER") {
        setMessage("Trạng thái Cảnh báo chỉ áp dụng cho bộ từ vựng do user đăng.");
        return;
      }
      await handleWarnUserSet(setItem.id);
      return;
    }

    await changeSetStatus(setItem.id, nextDisplayStatus === "PUBLIC" ? "PUBLISHED" : "HIDDEN");
  };

  const isOptionalHttpUrl = (value) => !value.trim() || isHttpUrl(value);

  const addCard = () => {
    setMessage("");
    if (!cardDraft.word.trim() || !cardDraft.definition.trim()) {
      setMessage("Flashcard cần ít nhất từ vựng và định nghĩa.");
      return;
    }

    if (!isOptionalHttpUrl(cardDraft.image_url)) {
      setMessage("URL ảnh của flashcard phải là HTTP/HTTPS.");
      return;
    }

    setCards((current) => [
      ...current,
      {
        id: Date.now(),
        ...cardDraft,
      },
    ]);
    setCardDraft({
      word: "",
      definition: "",
      word_type: "",
      pronunciation: "",
      example: "",
      image_url: "",
    });
    setMessage("Đã thêm flashcard vào bản nháp.");
  };

  const removeCard = (cardId) => {
    setCards((current) => current.filter((card) => card.id !== cardId));
  };

  const saveDraftSet = async () => {
    if (!title.trim()) {
      setMessage("Nhập tiêu đề bộ từ vựng trước khi lưu.");
      return;
    }

    try {
      await apiFetchJson(VOCAB_API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          cards: cards.map((item) => ({
            word: item.word,
            definition: item.definition,
            word_type: item.word_type,
            pronunciation: item.pronunciation,
            example: item.example,
            image_url: item.image_url,
          })),
        }),
      });

      setTitle("");
      setDescription("");
      setCards([]);
      setMode(null);
      setMessage("Đã lưu bộ từ vựng ở trạng thái Private.");
      await fetchSets();
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể tạo bộ từ vựng.");
    }
  };

  const handleSoftDelete = async (setId) => {
    try {
      await apiFetchJson(`${VOCAB_API_BASE_URL}/${setId}`, { method: "DELETE" });
      await fetchSets();
      setMessage("Đã xóa mềm bộ từ vựng.");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể xóa mềm bộ từ vựng.");
    }
  };

  const handleRestore = async (setId) => {
    try {
      await apiFetchJson(`${VOCAB_API_BASE_URL}/${setId}/restore`, { method: "POST" });
      await fetchSets();
      setMessage("Đã khôi phục bộ từ vựng.");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể khôi phục bộ từ vựng.");
    }
  };

  const handleWarnUserSet = async (setId) => {
    try {
      const result = await apiFetchJson(`${VOCAB_API_BASE_URL}/${setId}/warn`, {
        method: "POST",
      });
      setMessage(result.message || "Đã cảnh báo user.");
      // Refetch list để cập nhật warnedAt
      await fetchSets();
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể cảnh báo user.");
    }
  };

  const loadSetDetail = async (setItem) => {
    const setId = setItem?.id;

    try {
      setDetailLoading(true);
      const result = await apiFetchJson(`${VOCAB_API_BASE_URL}/${setId}`);
      const detail = result.data;

      setSelectedSetId(detail.id);
      setDetailReadOnly(setItem?.ownerType === "USER");
      setDetailDraft({
        title: detail.title || "",
        description: detail.description || "",
      });
      setDetailCards(
        (detail.flashcards || []).map((card) => ({
          id: card.id,
          word: card.word || "",
          definition: card.definition || "",
          word_type: card.word_type || "",
          pronunciation: card.pronunciation || "",
          example: card.example || "",
          image_url: card.image_url || "",
          audio_url: card.audio_url || "",
        })),
      );
      setDetailSearch("");
      setSelectedDetailCardId(null);
      setMode("detail");
      setMessage("Đã tải chi tiết bộ từ vựng.");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể tải chi tiết bộ từ vựng.");
    } finally {
      setDetailLoading(false);
    }
  };

  const updateDetailCard = (cardId, key, value) => {
    setDetailCards((current) =>
      current.map((card) => (card.id === cardId ? { ...card, [key]: value } : card)),
    );
  };

  const removeDetailCard = (cardId) => {
    setDetailCards((current) => current.filter((card) => card.id !== cardId));
    setSelectedDetailCardId((current) => (current === cardId ? null : current));
  };

  const addDetailCard = () => {
    const newCardId = `new-${Date.now()}`;
    setDetailCards((current) => [
      ...current,
      {
        id: newCardId,
        word: "",
        definition: "",
        word_type: "",
        pronunciation: "",
        example: "",
        image_url: "",
        audio_url: "",
      },
    ]);
    setSelectedDetailCardId(newCardId);
  };

  const saveDetailSet = async () => {
    if (!selectedSetId) {
      return;
    }

    if (!detailDraft.title.trim()) {
      setMessage("Tiêu đề bộ từ vựng không được để trống.");
      return;
    }

    const invalidCard = detailCards.find(
      (card) =>
        (card.image_url && !isHttpUrl(card.image_url)) ||
        (card.audio_url && !isHttpUrl(card.audio_url)),
    );
    if (invalidCard) {
      setMessage(`URL ảnh/audio không hợp lệ cho từ ${invalidCard.word || "(trống)"}.`);
      return;
    }

    try {
      setSavingDetail(true);
      await apiFetchJson(`${VOCAB_API_BASE_URL}/${selectedSetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: detailDraft.title,
          description: detailDraft.description,
          cards: detailCards.map((card) => ({
            word: card.word,
            definition: card.definition,
            word_type: card.word_type,
            pronunciation: card.pronunciation,
            example: card.example,
            image_url: card.image_url,
            audio_url: card.audio_url,
          })),
        }),
      });

      await fetchSets();
      setMode(null);
      setMessage("Đã lưu chỉnh sửa bộ từ vựng.");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể lưu chỉnh sửa bộ từ vựng.");
    } finally {
      setSavingDetail(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      setMessage("Vui lòng chọn file Excel/CSV để import.");
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("title", importTitle || `Imported vocab ${new Date().toISOString().slice(0, 10)}`);
    formData.append("description", importDescription || "Imported by admin");

    try {
      await apiFetchJson(`${VOCAB_API_BASE_URL}/import`, {
        method: "POST",
        body: formData,
      });

      setMessage("Import thành công, bộ từ vựng đang ở trạng thái Private.");
      setMode(null);
      setImportFile(null);
      setImportTitle("");
      setImportDescription("");
      await fetchSets();
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể import bộ từ vựng.");
    } finally {
      setImporting(false);
    }
  };

  const filteredDetailCards = useMemo(() => {
    const keyword = detailSearch.trim().toLowerCase();
    if (!keyword) {
      return detailCards;
    }

    return detailCards.filter(
      (card) =>
        card.word.toLowerCase().includes(keyword) ||
        card.definition.toLowerCase().includes(keyword),
    );
  }, [detailCards, detailSearch]);

  const selectedDetailCard = useMemo(
    () => detailCards.find((card) => card.id === selectedDetailCardId) ?? null,
    [detailCards, selectedDetailCardId],
  );

  return (
    <section className="exam-screen">
      <div className="dashboard-heading-row exam-heading">
        <h2>Quản lý Từ vựng hệ thống</h2>
      </div>

      <div className="exam-toolbar">
        <input
          className="exam-search"
          type="text"
          placeholder="Tìm tên bộ từ vựng"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="exam-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          {VOCAB_STATUS_FILTERS.map((item) => (
            <option value={item.value} key={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          className="exam-add-button"
          type="button"
          onClick={() => {
            setSelectedSetId(null);
            setMode("manual");
          }}
        >
          Tạo bộ mới
        </button>
      </div>

      <div className="table-shell">
        <table className="exam-table">
          <thead>
            <tr>
              <th>Tên bộ</th>
              <th>Số thẻ</th>
              <th>Ngày tạo</th>
              <th>Người đăng</th>
              <th>Trạng thái</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  Đang tải danh sách bộ từ vựng...
                </td>
              </tr>
            ) : sets.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  Không có bộ từ vựng phù hợp.
                </td>
              </tr>
            ) : (
              paginatedSets.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.card_count}</td>
                  <td>{String(item.created_at).slice(0, 10)}</td>
                  <td>{item.ownerName} ({item.ownerType === "USER" ? "User" : "Admin"})</td>
                  <td>
                    <select
                      className="exam-filter inline-status-filter"
                      value={getVocabDisplayStatus(item)}
                      onChange={(event) => {
                        handleInlineStatusChange(item, event.target.value).catch((requestError) => {
                          setMessage(
                            requestError instanceof Error
                              ? requestError.message
                              : "Không thể cập nhật trạng thái bộ từ vựng.",
                          );
                        });
                      }}
                    >
                      <option value="PRIVATE">Private</option>
                      <option value="PUBLIC">Public</option>
                      <option value="WARNING" disabled={item.ownerType !== "USER"}>
                        Cảnh báo
                      </option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="table-inline-button"
                      type="button"
                      onClick={() => loadSetDetail(item)}
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sets.length > 0 ? (
        <PaginationControls
          currentPage={currentSetPage}
          totalPages={totalSetPages}
          onPageChange={setCurrentSetPage}
        />
      ) : null}

      {mode ? (
        <div className="user-modal-overlay" onClick={() => setMode(null)}>
          <div className="create-panel vocab-panel user-modal vocab-modal-panel" onClick={(event) => event.stopPropagation()}>
          {mode !== "detail" ? (
            <>
              <div className="create-tabs">
                <button
                  className={`create-tab ${mode === "manual" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setMode("manual")}
                >
                  Nhập thủ công
                </button>
                <button
                  className={`create-tab ${mode === "import" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setMode("import")}
                >
                  Import Excel/CSV
                </button>
              </div>
              <div className="table-action-group">
                <button className="table-inline-button" type="button" onClick={() => setMode(null)}>
                  Đóng
                </button>
              </div>
            </>
          ) : null}

          {mode === "manual" ? (
            <div className="import-form-card">
            <input
              className="import-input"
              placeholder="Tiêu đề bộ từ vựng"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <input
              className="import-input"
              placeholder="Mô tả ngắn"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />

            <p className="detail-label">Thêm flashcard</p>
            <input
              className="import-input"
              placeholder="Từ vựng"
              value={cardDraft.word}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, word: event.target.value }))
              }
            />
            <input
              className="import-input"
              placeholder="Định nghĩa"
              value={cardDraft.definition}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, definition: event.target.value }))
              }
            />
            <input
              className="import-input"
              placeholder="Loại từ (noun, verb...)"
              value={cardDraft.word_type}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, word_type: event.target.value }))
              }
            />
            <input
              className="import-input"
              placeholder="Phiên âm"
              value={cardDraft.pronunciation}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, pronunciation: event.target.value }))
              }
            />
            <textarea
              className="import-input import-textarea"
              placeholder="Ví dụ"
              value={cardDraft.example}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, example: event.target.value }))
              }
            />
            <input
              className="import-input"
              placeholder="URL ảnh"
              value={cardDraft.image_url}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, image_url: event.target.value }))
              }
            />

            <div className="import-actions">
              <button className="import-button import-button-secondary" type="button" onClick={addCard}>
                Thêm thẻ
              </button>
              <button className="import-button import-button-primary" type="button" onClick={saveDraftSet}>
                Lưu bộ Private
              </button>
            </div>

            {cards.length > 0 ? (
              <div className="preview-box">
                <p className="detail-label">Danh sách thẻ nháp</p>
                <div className="action-grid">
                  {cards.map((card) => (
                    <div className="action-chip" key={card.id}>
                      <span>
                        <strong>{card.word}</strong>: {card.definition}
                      </span>
                      <button className="table-inline-button danger" type="button" onClick={() => removeCard(card.id)}>
                        Xóa thẻ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

              <p className="mock-url">Đã nhập: {cards.length} flashcard</p>
            </div>
          ) : mode === "import" ? (
            <div className="import-form-card">
              <input
                className="import-input"
                placeholder="Tiêu đề bộ từ vựng (tuỳ chọn)"
                value={importTitle}
                onChange={(event) => setImportTitle(event.target.value)}
              />
              <input
                className="import-input"
                placeholder="Mô tả (tuỳ chọn)"
                value={importDescription}
                onChange={(event) => setImportDescription(event.target.value)}
              />
              <label className="file-picker">
                <span>{importFile?.name || "Chọn file Excel/CSV theo template"}</span>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <div className="preview-box">
                <p className="detail-label">Preview danh sách thẻ</p>
                <div className="preview-row">
                  <span>Word</span>
                  <span>Definition</span>
                  <span>Image_URL / Audio_URL (HTTP/HTTPS)</span>
                </div>
              </div>
              <button className="import-button import-button-primary" type="button" onClick={handleImportSubmit} disabled={importing}>
                {importing ? "Đang import..." : "Lưu vào Private"}
              </button>
            </div>
          ) : (
            <div className="import-form-card">
              <div className="question-list-head">
                <h3>{detailDraft.title || "Chi tiết bộ từ vựng"}</h3>
                <div className="table-action-group">
                  <button className="table-inline-button" type="button" onClick={() => setMode(null)}>
                    Đóng
                  </button>
                  {!detailReadOnly ? (
                    <>
                      <button
                        className="table-inline-button"
                        type="button"
                        onClick={() => setSelectedDetailCardId(null)}
                      >
                        Danh sách từ
                      </button>
                      <button className="table-inline-button" type="button" onClick={addDetailCard}>
                        + Thêm thẻ
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {detailLoading ? <p className="empty-state">Đang tải chi tiết bộ từ vựng...</p> : null}

              {!detailLoading && selectedSetId ? (
                <>
                  {selectedDetailCard ? (
                    <div className="answer-block">
                      <p className="detail-label">Chi tiết từ vựng</p>
                      <input
                        className="import-input"
                        placeholder="Word"
                        value={selectedDetailCard.word}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "word", event.target.value)}
                      />
                      <input
                        className="import-input"
                        placeholder="Definition"
                        value={selectedDetailCard.definition}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "definition", event.target.value)}
                      />
                      <input
                        className="import-input"
                        placeholder="Word type"
                        value={selectedDetailCard.word_type}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "word_type", event.target.value)}
                      />
                      <input
                        className="import-input"
                        placeholder="Pronunciation"
                        value={selectedDetailCard.pronunciation}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "pronunciation", event.target.value)}
                      />
                      <textarea
                        className="import-input import-textarea"
                        placeholder="Example"
                        value={selectedDetailCard.example}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "example", event.target.value)}
                      />
                      <input
                        className="import-input"
                        placeholder="Image URL"
                        value={selectedDetailCard.image_url}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "image_url", event.target.value)}
                      />

                      <div className="table-action-group card-detail-actions">
                        {!detailReadOnly ? (
                          <>
                            <button className="table-inline-button" type="button" onClick={() => setSelectedDetailCardId(null)}>
                              Quay lại danh sách từ
                            </button>
                            <button className="table-inline-button danger" type="button" onClick={() => removeDetailCard(selectedDetailCard.id)}>
                              Xóa thẻ
                            </button>
                            <button
                              className="import-button import-button-primary"
                              type="button"
                              onClick={saveDetailSet}
                              disabled={savingDetail}
                            >
                              {savingDetail ? "Đang lưu..." : "Lưu chỉnh sửa bộ từ vựng"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        className="import-input"
                        placeholder="Tiêu đề bộ từ vựng"
                        value={detailDraft.title}
                        disabled={detailReadOnly}
                        onChange={(event) =>
                          setDetailDraft((current) => ({ ...current, title: event.target.value }))
                        }
                      />
                      <input
                        className="import-input"
                        placeholder="Mô tả"
                        value={detailDraft.description}
                        disabled={detailReadOnly}
                        onChange={(event) =>
                          setDetailDraft((current) => ({ ...current, description: event.target.value }))
                        }
                      />
                      <input
                        className="exam-search"
                        placeholder="Tìm từ trong bộ flashcard"
                        value={detailSearch}
                        onChange={(event) => setDetailSearch(event.target.value)}
                      />

                      <div className="table-shell">
                        <table className="exam-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Từ vựng</th>
                              <th>Loại từ</th>
                              <th>Định nghĩa</th>
                              <th>Hành động</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDetailCards.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="empty-state">
                                  Không có từ phù hợp tìm kiếm.
                                </td>
                              </tr>
                            ) : (
                              filteredDetailCards.map((card, index) => (
                                <tr key={card.id} className="word-row" onClick={() => setSelectedDetailCardId(card.id)}>
                                  <td>{index + 1}</td>
                                  <td>{card.word || "-"}</td>
                                  <td>{card.word_type || "-"}</td>
                                  <td>{card.definition || "-"}</td>
                                  <td>
                                    <button
                                      className="table-inline-button"
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedDetailCardId(card.id);
                                      }}
                                    >
                                      Xem chi tiết
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {!detailReadOnly ? (
                        <button
                          className="import-button import-button-primary"
                          type="button"
                          onClick={saveDetailSet}
                          disabled={savingDetail}
                        >
                          {savingDetail ? "Đang lưu..." : "Lưu chỉnh sửa bộ từ vựng"}
                        </button>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}

              {!detailLoading && !selectedSetId ? (
                <p className="empty-state">Hãy chọn một bộ từ vựng trong bảng để xem và chỉnh sửa.</p>
              ) : null}

            </div>
          )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <p className="detail-label">{label}</p>
      <div className="detail-value">{value}</div>
    </div>
  );
}

function UrlDetailRow({ label, value, mediaType = "link" }) {
  const urls = splitPipeSeparatedUrls(value);

  return (
    <div className="detail-row">
      <p className="detail-label">{label}</p>
      <div className="detail-value">
        {urls.length === 0 ? (
          "Không có"
        ) : (
          <div className="url-list">
            {urls.map((url) => (
              <div className="url-preview-item" key={url}>
                <a className="url-link" href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>

                {mediaType === "image" ? (
                  <img className="media-preview-image" src={url} alt="Preview ảnh" />
                ) : null}

                {mediaType === "audio" ? (
                  <audio className="media-preview-audio" controls preload="none" src={url}>
                    Trình duyệt không hỗ trợ audio.
                  </audio>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NavButton({ to, label, active }) {
  return (
    <Link className={`sidebar-link ${active ? "is-active" : ""}`} to={to}>
      {label}
    </Link>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function PaginationControls({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="pagination-wrap">
      <button
        className="table-inline-button"
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        Trước
      </button>

      <div className="pagination-pages">
        {pages.map((page) => (
          <button
            className={`table-inline-button ${page === currentPage ? "pagination-active" : ""}`}
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        className="table-inline-button"
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        Sau
      </button>
    </div>
  );
}

function getPageTitle(pathname) {
  if (pathname === "/admin/dashboard") {
    return "Admin - Dashboard";
  }

  if (pathname === "/admin/users") {
    return "Admin - Quản lý người dùng";
  }

  if (pathname === "/admin/exams/import-excel") {
    return "Admin - Import đề thi";
  }

  if (pathname === "/admin/exams/new") {
    return "Admin - Tạo đề thi";
  }

  if (/^\/admin\/exams\/\d+$/.test(pathname)) {
    return "Admin - Chi tiết đề";
  }

  if (pathname.startsWith("/admin/vocab")) {
    return "Admin - Quản lý Từ vựng";
  }

  return "Admin - Quản lý đề thi";
}

function normalizeStatusLabel(status) {
  if (status === "DRAFT") {
    return "Nháp";
  }

  if (status === "PUBLISHED") {
    return "Công khai";
  }

  if (status === "HIDDEN") {
    return "Tạm ẩn";
  }

  if (status === "DELETED") {
    return "Đã xóa";
  }

  return status || "-";
}

function splitPipeSeparatedUrls(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isHttpUrl(value) {
  if (!value) {
    return false;
  }
  return /^https?:\/\//i.test(value.trim());
}

export default App;
