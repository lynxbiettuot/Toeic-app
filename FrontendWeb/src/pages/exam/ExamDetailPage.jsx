import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetchJson, EXAM_API_BASE_URL } from '../../api/apiClient';

// Common Components
import { QuestionList } from './components/QuestionList';
import { QuestionViewer } from './components/QuestionViewer';
import { QuestionEditor } from './components/QuestionEditor';
import { QuestionCreator } from './components/QuestionCreator';

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
    if (!examSetId) return;

    setLoadingExam(true);
    setError("");

    try {
      const result = await apiFetchJson(`${EXAM_API_BASE_URL}/${examSetId}/questions`);
      setExam(result.data);

      setSelectedQuestionNumber((current) => {
        const hasSelectedQuestion = (result.data?.questions ?? []).some(
          (question) => question.question_number === current,
        );
        if (hasSelectedQuestion) return current;
        return result.data?.questions?.[0]?.question_number ?? null;
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Không thể tải danh sách câu hỏi.");
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
          setError(fetchError instanceof Error ? fetchError.message : "Không thể tải chi tiết câu hỏi.");
        }
      } finally {
        if (!ignore) setLoadingQuestion(false);
      }
    };

    loadQuestionDetail();
    return () => { ignore = true; };
  }, [examSetId, selectedQuestionNumber]);

  const handleSaveQuestion = async () => {
    if (!examSetId || !selectedQuestionNumber) return;

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

      await apiFetchJson(`${EXAM_API_BASE_URL}/${examSetId}/questions/${selectedQuestionNumber}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setSaveMessage("Đã lưu chỉnh sửa câu hỏi.");
    } catch (requestError) {
      setSaveMessage(requestError instanceof Error ? requestError.message : "Không thể lưu câu hỏi.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateQuestion = async () => {
    if (!examSetId) return;

    const partNumber = Number.parseInt(createDraft.part_number, 10);
    if (Number.isNaN(partNumber) || partNumber <= 0) {
      setCreateMessage("Part phải là số nguyên dương.");
      return;
    }

    const needsAnswersText = ![1, 2].includes(partNumber);
    if (needsAnswersText) {
      if (!createDraft.answerA.trim() || !createDraft.answerB.trim() || !createDraft.answerC.trim() || !createDraft.answerD.trim()) {
        setCreateMessage("Vui lòng nhập đủ đáp án A, B, C, D.");
        return;
      }
    }

    const currentQuestions = exam?.questions || [];
    const maxNumber = currentQuestions.length > 0 
      ? Math.max(...currentQuestions.map(q => q.question_number)) 
      : 0;
    const nextQuestionNumber = maxNumber + 1;

    try {
      setCreatingQuestion(true);
      setCreateMessage("");

      const payload = {
        question_number: nextQuestionNumber,
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
        body: JSON.stringify(payload),
      });

      await loadExam();
      setSelectedQuestionNumber(result?.data?.question_number ?? null);
      setShowCreateQuestionForm(false);
      setCreateDraft((curr) => ({ ...curr, content: "", image_url: "", audio_url: "", answerA: "", answerB: "", answerC: "", answerD: "" }));
      setCreateMessage("Đã thêm câu mới thành công.");
    } catch (requestError) {
      setCreateMessage(requestError instanceof Error ? requestError.message : "Không thể thêm câu hỏi.");
    } finally {
      setCreatingQuestion(false);
    }
  };

  return (
    <section className="exam-screen">
      <div className="exam-detail-header">
        <div>
          <h2>{exam?.title ?? "Chi tiết đề thi"}</h2>
          <p>Năm: {exam?.year ?? "-"} | Số câu: {exam?.questions?.length ?? 0}</p>
        </div>
        <Link className="exam-add-button" to="/admin/exams">Trở về danh sách</Link>
      </div>

      {error && <p className="page-feedback error">{error}</p>}

      <div className="exam-detail-layout">
        <QuestionList 
          questions={exam?.questions}
          selectedQuestionNumber={selectedQuestionNumber}
          onSelectQuestion={(num) => { setShowCreateQuestionForm(false); setSelectedQuestionNumber(num); }}
          onShowCreateForm={() => { setCreateMessage(""); setShowCreateQuestionForm(true); setSelectedQuestionNumber(null); }}
          isPublished={exam?.status === "PUBLISHED"}
          loading={loadingExam}
        />

        <section className="question-detail-card">
          <h3>Chi tiết câu hỏi</h3>
          
          <QuestionViewer 
            questionDetail={questionDetail} 
            loadingQuestion={loadingQuestion} 
          />

          {!loadingQuestion && questionDetail && (
            <QuestionEditor 
              editDraft={editDraft}
              setEditDraft={setEditDraft}
              onSave={handleSaveQuestion}
              saving={saving}
              saveMessage={saveMessage}
            />
          )}

          {showCreateQuestionForm && (
            <QuestionCreator 
              createDraft={createDraft}
              setCreateDraft={setCreateDraft}
              onCreate={handleCreateQuestion}
              creating={creatingQuestion}
              createMessage={createMessage}
              onClose={() => setShowCreateQuestionForm(false)}
              isPublished={exam?.status === "PUBLISHED"}
              isLimitReached={(exam?.questions ?? []).length >= 200}
            />
          )}
        </section>
      </div>
    </section>
  );
}
