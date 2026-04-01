import React, { useMemo, useState, useEffect } from 'react';
import { apiFetchJson, DASHBOARD_API_BASE_URL, API_ROOT, TABLE_PAGE_SIZE } from '../../api/apiClient';
import { StatCard } from '../../components/common/StatCard';
import { DetailRow } from '../../components/common/DetailRow';
import { UrlDetailRow } from '../../components/common/UrlDetailRow';
import { PaginationControls } from '../../components/common/PaginationControls';

export function DashboardPage({ mode = "overview" }) {
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
    if (!isOverview) return;

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

    if (isOverview) return;

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
    return { ...item, x, y };
  });

  const linePoints =
    scoreChartData.length > 1
      ? scoreChartData.map((item) => `${item.x},${item.y}`).join(" ")
      : "44,174 500,174";

  const personalTrendPoints = useMemo(() => {
    const progress = profile?.progress ?? [];
    if (progress.length === 0) return "";

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
      const url = `${DASHBOARD_API_BASE_URL}/export?range=${range}`;

      const response = await fetch(url, {
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          try {
            await apiFetchJson(`${API_ROOT}/dashboard/overview?range=${range}`);
            return downloadOverviewReport();
          } catch (e) {
            window.location.hash = "/login";
            throw new Error("Phiên đăng nhập hết hạn.");
          }
        }
        throw new Error("Không thể xuất báo cáo.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `dashboard-${range}-${Date.now()}.csv`;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xuất báo cáo.");
    }
  };

  const handleViewUserFlashcardSet = async (setId) => {
    if (!selectedUserId) return;
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
    if (!keyword) return cards;
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
              Xuất CSV
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
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                    <line
                      key={p}
                      x1="44"
                      y1={174 - p * 150}
                      x2="500"
                      y2={174 - p * 150}
                      stroke="#f1f5f7"
                      strokeWidth="1"
                    />
                  ))}
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
                    <td colSpan="6" className="empty-state">Không tìm thấy user phù hợp.</td>
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
                        <button className="table-inline-button" type="button" onClick={() => setSelectedUserId(user.id)}>
                          Hồ sơ học viên
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {users.length > 0 && (
            <PaginationControls
              currentPage={currentUserPage}
              totalPages={totalUserPages}
              onPageChange={setCurrentUserPage}
            />
          )}

          {selectedUserId && (
            <div className="user-modal-overlay" onClick={closeUserProfileModal}>
              <section className="chart-card profile-card user-modal" onClick={(event) => event.stopPropagation()}>
                <div className="question-list-head">
                  <h3>Hồ sơ học viên: {profile?.user?.fullName ?? "-"}</h3>
                  <button className="table-inline-button" type="button" onClick={closeUserProfileModal}>Đóng</button>
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

                <p className="detail-label">Kho flashcard cá nhân</p>
                <div className="action-grid">
                  {(profile?.flashcards ?? []).length === 0 ? (
                    <p className="empty-state">User chưa có bộ flashcard nào.</p>
                  ) : (
                    (profile?.flashcards ?? []).map((item) => (
                      <div className="action-chip" key={item.id}>
                        <span>{item.title} ({item.type}) - {item.cardCount} thẻ</span>
                        <div className="table-action-group">
                          <button className="table-inline-button" type="button" onClick={() => handleViewUserFlashcardSet(item.id)}>
                            Xem bộ
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {selectedUserSet && (
                  <section className="chart-card profile-card">
                    <div className="question-list-head">
                      <h3>Nội dung bộ: {selectedUserSet.title}</h3>
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
                        <button className="table-inline-button" type="button" onClick={() => setSelectedSetWordId(null)}>
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
                                <tr><td colSpan="5" className="empty-state">Không có từ phù hợp.</td></tr>
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
                )}
              </section>
            </div>
          )}
        </>
      )}
      {error ? <p className="page-feedback error">{error}</p> : null}
    </section>
  );
}
