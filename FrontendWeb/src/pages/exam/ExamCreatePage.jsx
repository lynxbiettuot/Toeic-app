import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetchJson, EXAM_API_BASE_URL } from '../../api/apiClient';

export function ExamCreatePage() {
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
        </form>
      </div>
    </section>
  );
}
