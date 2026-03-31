import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetchJson, EXAM_API_BASE_URL, EXAM_STATUS_FILTERS, TABLE_PAGE_SIZE } from '../../api/apiClient';
import { PaginationControls } from '../../components/common/PaginationControls';

export function ExamListPage() {
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
