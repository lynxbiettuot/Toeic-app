import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetchJson, EXAM_API_BASE_URL } from '../../api/apiClient';
import { DetailRow } from '../../components/common/DetailRow';
import { UrlDetailRow } from '../../components/common/UrlDetailRow';

export function ExamDetailPage() {
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
    part_number: "5",
    content: "",
    image_url: "",
    audio_url: "",
    correct_answer: "A",
    answerA: "",
    answerB: "",
    answerC: "",
    answerD: "",
    explanation: "",
    transcript: "",
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
          const cleanValue = (val) => {
            if (!val) return "";
            const s = String(val).trim();
            if (s.toLowerCase() === "không có" || s.toLowerCase() === "(trống)") return "";
            return s;
          };

          const answers = result.data?.answers ?? [];
          const getAnswer = (label) => cleanValue(answers.find((item) => item.option_label === label)?.content);

          setEditDraft({
            part_number: String(result.data?.part_number || "5"),
            content: cleanValue(result.data?.content),
            image_url: cleanValue(result.data?.image_url),
            audio_url: cleanValue(result.data?.audio_url),
            correct_answer: result.data?.correct_answer || "A",
            answerA: getAnswer("A"),
            answerB: getAnswer("B"),
            answerC: getAnswer("C"),
            answerD: getAnswer("D"),
            explanation: cleanValue(result.data?.explanation),
            transcript: cleanValue(result.data?.transcript || result.data?.group?.transcript),
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
        part_number: Number.parseInt(editDraft.part_number, 10),
        content: editDraft.content,
        image_url: editDraft.image_url,
        audio_url: editDraft.audio_url,
        correct_answer: editDraft.correct_answer,
        explanation: editDraft.explanation,
        transcript: editDraft.transcript,
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
              className={`exam-add-button question-add-inline ${
                (exam?.questions ?? []).length >= 200 || exam?.status === "PUBLISHED" ? "is-disabled" : ""
              }`}
              type="button"
              disabled={(exam?.questions ?? []).length >= 200 || exam?.status === "PUBLISHED"}
              onClick={() => {
                setCreateMessage("");
                setShowCreateQuestionForm(true);
                setSelectedQuestionNumber(null);
              }}
              title={
                exam?.status === "PUBLISHED"
                  ? "Không thể thêm câu khi đề đang công khai"
                  : (exam?.questions ?? []).length >= 200
                  ? "Đã đạt giới hạn 200 câu"
                  : ""
              }
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
                    <div
                      key={answer.option_label}
                      className={`answer-item ${
                        answer.option_label === questionDetail.correct_answer ? "is-correct" : ""
                      }`}
                    >
                      <strong>{answer.option_label}.</strong> {answer.content || (Number.parseInt(questionDetail.part_number, 10) <= 2 ? "(Nghe)" : "Không có nội dung")}
                      {answer.option_label === questionDetail.correct_answer && " (Đáp án đúng)"}
                    </div>
                  ))}
                </div>
              </div>

              <div className="answer-block">
                <p className="detail-label">Sửa nhanh câu hỏi</p>
                {saveMessage && <p className="page-feedback info">{saveMessage}</p>}
                <div className="import-input-group">
                  <label>Part:</label>
                  <select
                    className="exam-filter"
                    value={editDraft.part_number}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, part_number: event.target.value }))
                    }
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <option key={num} value={num}>
                        Part {num}
                      </option>
                    ))}
                  </select>
                </div>
                {[5, 6, 7].includes(Number.parseInt(editDraft.part_number, 10)) && (
                  <div className="import-input-group">
                    <label>Nội dung:</label>
                    <textarea
                      className="import-input import-textarea"
                      placeholder="Nội dung câu hỏi"
                      value={editDraft.content}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, content: event.target.value }))
                      }
                    />
                  </div>
                )}
                <div className="import-input-group">
                  <label>URL ảnh:</label>
                  <input
                    className="import-input"
                    placeholder="URL ảnh"
                    value={editDraft.image_url}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, image_url: event.target.value }))
                    }
                  />
                </div>
                <div className="import-input-group">
                  <label>URL audio:</label>
                  <input
                    className="import-input"
                    placeholder="URL audio"
                    value={editDraft.audio_url}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, audio_url: event.target.value }))
                    }
                  />
                </div>
                <div className="import-input-group">
                  <label>Đáp án A:</label>
                  <input
                    className="import-input"
                    placeholder="Nội dung đáp án A"
                    value={editDraft.answerA}
                    disabled={[1, 2].includes(Number.parseInt(editDraft.part_number, 10))}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, answerA: event.target.value }))
                    }
                  />
                </div>
                <div className="import-input-group">
                  <label>Đáp án B:</label>
                  <input
                    className="import-input"
                    placeholder="Nội dung đáp án B"
                    value={editDraft.answerB}
                    disabled={[1, 2].includes(Number.parseInt(editDraft.part_number, 10))}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, answerB: event.target.value }))
                    }
                  />
                </div>
                <div className="import-input-group">
                  <label>Đáp án C:</label>
                  <input
                    className="import-input"
                    placeholder="Nội dung đáp án C"
                    value={editDraft.answerC}
                    disabled={[1, 2].includes(Number.parseInt(editDraft.part_number, 10))}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, answerC: event.target.value }))
                    }
                  />
                </div>
                {Number.parseInt(editDraft.part_number, 10) !== 2 && (
                  <div className="import-input-group">
                    <label>Đáp án D:</label>
                    <input
                      className="import-input"
                      placeholder="Nội dung đáp án D"
                      value={editDraft.answerD}
                      disabled={[1].includes(Number.parseInt(editDraft.part_number, 10))}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, answerD: event.target.value }))
                      }
                    />
                  </div>
                )}
                {[1, 2, 3, 4].includes(Number.parseInt(editDraft.part_number, 10)) && (
                  <div className="import-input-group">
                    <label>Transcript:</label>
                    <textarea
                      className="import-input import-textarea"
                      placeholder="Nội dung transcript"
                      value={editDraft.transcript}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, transcript: event.target.value }))
                      }
                    />
                  </div>
                )}
                <div className="import-input-group">
                  <label>Đúng:</label>
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
                    {Number.parseInt(editDraft.part_number, 10) !== 2 && (
                      <option value="D">Đáp án đúng: D</option>
                    )}
                  </select>
                </div>

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
              {createMessage && <p className="page-feedback info">{createMessage}</p>}
              <div className="import-input-group">
                <label>Part:</label>
                <select
                  className="exam-filter"
                  value={createDraft.part_number}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, part_number: event.target.value }))
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <option key={num} value={num}>
                      Part {num}
                    </option>
                  ))}
                </select>
              </div>
              <div className="import-input-group">
                <label>Nội dung:</label>
                <textarea
                  className="import-input import-textarea"
                  placeholder="Nội dung câu hỏi"
                  value={createDraft.content}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, content: event.target.value }))
                  }
                />
              </div>
              <div className="import-input-group">
                <label>URL ảnh:</label>
                <input
                  className="import-input"
                  placeholder="URL ảnh"
                  value={createDraft.image_url}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, image_url: event.target.value }))
                  }
                />
              </div>
              <div className="import-input-group">
                <label>URL audio:</label>
                <input
                  className="import-input"
                  placeholder="URL audio"
                  value={createDraft.audio_url}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, audio_url: event.target.value }))
                  }
                />
              </div>
              <div className="import-input-group">
                <label>Đáp án A:</label>
                <input
                  className="import-input"
                  placeholder="Nội dung đáp án A"
                  value={createDraft.answerA}
                  disabled={[1, 2, 3, 4].includes(Number.parseInt(createDraft.part_number, 10))}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, answerA: event.target.value }))
                  }
                />
              </div>
              <div className="import-input-group">
                <label>Đáp án B:</label>
                <input
                  className="import-input"
                  placeholder="Nội dung đáp án B"
                  value={createDraft.answerB}
                  disabled={[1, 2, 3, 4].includes(Number.parseInt(createDraft.part_number, 10))}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, answerB: event.target.value }))
                  }
                />
              </div>
              <div className="import-input-group">
                <label>Đáp án C:</label>
                <input
                  className="import-input"
                  placeholder="Nội dung đáp án C"
                  value={createDraft.answerC}
                  disabled={[1, 2, 3, 4].includes(Number.parseInt(createDraft.part_number, 10))}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, answerC: event.target.value }))
                  }
                />
              </div>
              <div className="import-input-group">
                <label>Đáp án D:</label>
                <input
                  className="import-input"
                  placeholder="Nội dung đáp án D"
                  value={createDraft.answerD}
                  disabled={[1, 2, 3, 4].includes(Number.parseInt(createDraft.part_number, 10))}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, answerD: event.target.value }))
                  }
                />
              </div>
              <div className="import-input-group">
                <label>Đúng:</label>
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
              </div>

              <button
                className="import-button import-button-primary"
                type="button"
                onClick={handleCreateQuestion}
                disabled={creatingQuestion || (exam?.questions ?? []).length >= 200 || exam?.status === "PUBLISHED"}
              >
                {creatingQuestion
                  ? "Đang thêm..."
                  : exam?.status === "PUBLISHED"
                  ? "Không thể thêm (Public)"
                  : (exam?.questions ?? []).length >= 200
                  ? "Đã đạt giới hạn câu"
                  : "Thêm câu"}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
