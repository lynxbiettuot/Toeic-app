import React from 'react';

export function QuestionList({ 
  questions = [], 
  selectedQuestionNumber, 
  onSelectQuestion, 
  onShowCreateForm, 
  isPublished,
  loading 
}) {
  const isLimitReached = questions.length >= 200;

  return (
    <section className="question-list-card">
      <div className="question-list-head">
        <h3>Danh sách câu hỏi</h3>
        <button
          className={`exam-add-button question-add-inline ${
            isLimitReached || isPublished ? "is-disabled" : ""
          }`}
          type="button"
          disabled={isLimitReached || isPublished}
          onClick={onShowCreateForm}
          title={
            isPublished
              ? "Không thể thêm câu khi đề đang công khai"
              : isLimitReached
              ? "Đã đạt giới hạn 200 câu"
              : ""
          }
        >
          + Thêm câu
        </button>
      </div>
      {loading ? (
        <p className="empty-state">Đang tải câu hỏi...</p>
      ) : (
        <div className="question-grid">
          {questions.map((question) => (
            <button
              key={question.id}
              className={`question-chip ${
                selectedQuestionNumber === question.question_number ? "is-active" : ""
              }`}
              type="button"
              onClick={() => onSelectQuestion(question.question_number)}
            >
              {question.question_number}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
