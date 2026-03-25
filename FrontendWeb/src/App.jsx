import { useEffect, useMemo, useState } from "react";
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

const ADMIN_CREDENTIALS = {
  email: "admin@gmail.com",
  password: "1234",
  name: "Tài khoản admin",
};

const API_BASE_URL = "http://localhost:3000/admin/exams";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="exams" element={<ExamListPage />} />
        <Route path="exams/new" element={<ExamCreatePage />} />
        <Route path="exams/import-excel" element={<ImportExcelPage />} />
        <Route path="exams/:examSetId" element={<ExamDetailPage />} />
      </Route>
    </Routes>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: ADMIN_CREDENTIALS.email,
    password: ADMIN_CREDENTIALS.password,
  });
  const [error, setError] = useState("");

  const helperText = useMemo(
    () =>
      `${ADMIN_CREDENTIALS.name}: ${ADMIN_CREDENTIALS.email} / ${ADMIN_CREDENTIALS.password}`,
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (
      form.email === ADMIN_CREDENTIALS.email &&
      form.password === ADMIN_CREDENTIALS.password
    ) {
      navigate("/admin/dashboard");
      return;
    }

    setError("Sai email hoặc mật khẩu. Hãy dùng đúng tài khoản admin có sẵn.");
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
                to="/admin/exams"
                label="Quản lý đề thi"
                active={location.pathname.startsWith("/admin/exams")}
              />
              <button
                className="sidebar-link sidebar-logout"
                type="button"
                onClick={() => navigate("/login")}
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

function DashboardPage() {
  const barData = [
    { label: "ETS 2024", height: "47%" },
    { label: "ETS 2023", height: "62%" },
    { label: "ETS 2025", height: "46%" },
    { label: "ETS 2022", height: "78%" },
    { label: "ETS 2021", height: "46%" },
  ];

  const linePoints = "8,74 92,20 176,82 260,28 344,70 428,34";

  return (
    <>
      <div className="dashboard-heading-row">
        <h2>Dashboard thống kê</h2>
        <button className="filter-chip">Tháng này</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Số user mới" value="1,250" />
        <StatCard label="Tổng lượt thi" value="5,430" />
        <StatCard label="Số user hoạt động" value="890" />
      </div>

      <div className="chart-grid">
        <section className="chart-card">
          <h3>Top 5 bộ đề được dùng nhiều nhất</h3>
          <div className="bar-chart">
            <div className="chart-axis axis-y" />
            <div className="chart-axis axis-x" />
            <div className="bar-list">
              {barData.map((item, index) => (
                <div className="bar-item" key={item.label}>
                  <div
                    className={`bar-fill color-${index + 1}`}
                    style={{ height: item.height }}
                  />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="chart-card pie-card">
          <h3>Tỷ lệ hoàn thành</h3>
          <div className="pie-chart">
            <div className="pie-center">75%</div>
          </div>
        </section>
      </div>

      <section className="chart-card line-card">
        <h3>Phổ điểm</h3>
        <div className="line-chart">
          <svg viewBox="0 0 440 110" preserveAspectRatio="none">
            <polyline points={linePoints} />
          </svg>
          <div className="chart-axis axis-y" />
          <div className="chart-axis axis-x" />
        </div>
      </section>
    </>
  );
}

function ExamListPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadExams = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(API_BASE_URL);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Không thể tải danh sách đề thi.");
        }

        if (!ignore) {
          setExams(result.data || []);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Không thể tải danh sách đề thi.",
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadExams();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredExams = exams.filter((exam) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return true;
    }

    return (
      exam.title.toLowerCase().includes(keyword) ||
      String(exam.year ?? "").includes(keyword)
    );
  });

  return (
    <section className="exam-screen">
      <div className="dashboard-heading-row exam-heading">
        <h2>Danh sách đề thi</h2>
      </div>

      <div className="exam-toolbar">
        <input
          className="exam-search"
          type="text"
          placeholder="Tìm kiếm tên đề, năm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="exam-filter" defaultValue="all">
          <option value="all">Tất cả trạng thái</option>
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
            ) : filteredExams.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  Chưa có đề thi nào. Hãy bấm "Thêm mới" để bắt đầu nhập đề.
                </td>
              </tr>
            ) : (
              filteredExams.map((exam, index) => (
                <tr key={exam.id}>
                  <td>{index + 1}</td>
                  <td>{exam.title}</td>
                  <td>{exam.year ?? "-"}</td>
                  <td>{normalizeStatusLabel(exam.status)}</td>
                  <td>
                    <Link className="table-action-link" to={`/admin/exams/${exam.id}`}>
                      Xem đề
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExamCreatePage() {
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

        <div className="create-placeholder">
          <p>Chưa có dữ liệu đề thi.</p>
          <span>Bạn có thể chọn cách nhập đề ở phía trên.</span>
        </div>
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

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setExcelFile(file);
    setStatus({
      type: "",
      message: "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim() || !year.trim() || !excelFile) {
      setStatus({
        type: "error",
        message: "Vui lòng nhập tên đề, năm xuất bản và chọn file Excel trước khi submit.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({
      type: "info",
      message: "Đang tải file Excel lên backend...",
    });

    const formData = new FormData();
    formData.append("title", title);
    formData.append("year", year);
    formData.append("type", "TOEIC");
    formData.append("excelFile", excelFile);

    try {
      const response = await fetch(`${API_BASE_URL}/import-excel`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Import đề thi thất bại.");
      }

      setStatus({
        type: "success",
        message: result.message || "Import đề thi thành công.",
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
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
            />
          </label>

          <div className="import-actions">
            <button
              className="import-button import-button-secondary"
              type="button"
              onClick={() => navigate("/admin/exams/new")}
            >
              Trở lại
            </button>
            <button
              className="import-button import-button-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang submit..." : "Submit"}
            </button>
          </div>

          <p className={`import-status ${status.type}`}>{status.message}</p>
          <p className="mock-url">Backend đang gọi: {`${API_BASE_URL}/import-excel`}</p>
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

  useEffect(() => {
    let ignore = false;

    const loadExam = async () => {
      setLoadingExam(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/${examSetId}/questions`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Không thể tải danh sách câu hỏi.");
        }

        if (!ignore) {
          setExam(result.data);
          const firstQuestionNumber = result.data?.questions?.[0]?.question_number ?? null;
          setSelectedQuestionNumber(firstQuestionNumber);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Không thể tải danh sách câu hỏi.",
          );
        }
      } finally {
        if (!ignore) {
          setLoadingExam(false);
        }
      }
    };

    if (examSetId) {
      loadExam();
    }

    return () => {
      ignore = true;
    };
  }, [examSetId]);

  useEffect(() => {
    let ignore = false;

    const loadQuestionDetail = async () => {
      if (!examSetId || !selectedQuestionNumber) {
        setQuestionDetail(null);
        return;
      }

      setLoadingQuestion(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/${examSetId}/questions/${selectedQuestionNumber}`,
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Không thể tải chi tiết câu hỏi.");
        }

        if (!ignore) {
          setQuestionDetail(result.data);
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
          <h3>Danh sách câu hỏi</h3>
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
                  onClick={() => setSelectedQuestionNumber(question.question_number)}
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
              <UrlDetailRow label="URL ảnh" value={questionDetail.image_url} />
              <UrlDetailRow label="URL audio" value={questionDetail.audio_url} />
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
            </div>
          ) : (
            <p className="empty-state">
              Hãy chọn một câu để xem hình ảnh, audio và đáp án.
            </p>
          )}
        </section>
      </div>
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

function UrlDetailRow({ label, value }) {
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
              <a
                key={url}
                className="url-link"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                {url}
              </a>
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

function getPageTitle(pathname) {
  if (pathname === "/admin/dashboard") {
    return "Admin - Dashboard";
  }

  if (pathname === "/admin/exams/import-excel") {
    return "Admin - Thêm mới Excel";
  }

  if (pathname === "/admin/exams/new") {
    return "Admin - Thêm mới";
  }

  if (/^\/admin\/exams\/\d+$/.test(pathname)) {
    return "Admin - Chi tiết đề";
  }

  return "Admin - Danh sách đề";
}

function normalizeStatusLabel(status) {
  if (status === "DRAFT") {
    return "Tạm ẩn";
  }

  if (status === "PUBLISHED") {
    return "Công khai";
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

export default App;
