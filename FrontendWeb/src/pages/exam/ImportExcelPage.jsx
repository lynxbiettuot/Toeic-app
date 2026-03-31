import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { apiFetchJson, EXAM_API_BASE_URL } from '../../api/apiClient';
import { isHttpUrl } from '../../utils/helpers';

export function ImportExcelPage() {
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
      (row) => (row.audio && !isHttpUrl(row.audio)) || (row.image && !isHttpUrl(row.image)),
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
