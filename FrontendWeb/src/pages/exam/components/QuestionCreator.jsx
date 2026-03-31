import React from 'react';

export function QuestionCreator({ 
  createDraft, 
  setCreateDraft, 
  onCreate, 
  creating, 
  createMessage, 
  onClose,
  isPublished,
  isLimitReached
}) {
  const partNumber = Number.parseInt(createDraft.part_number, 10);

  return (
    <div className="answer-block add-question-block">
      <div className="question-list-head">
        <p className="detail-label">Thêm câu mới</p>
        <button
          className="table-inline-button"
          type="button"
          onClick={onClose}
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
          disabled={[1, 2, 3, 4].includes(partNumber)}
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
          disabled={[1, 2, 3, 4].includes(partNumber)}
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
          disabled={[1, 2, 3, 4].includes(partNumber)}
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
          disabled={[1, 2, 3, 4].includes(partNumber)}
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
        onClick={onCreate}
        disabled={creating || isLimitReached || isPublished}
      >
        {creating
          ? "Đang thêm..."
          : isPublished
          ? "Không thể thêm (Public)"
          : isLimitReached
          ? "Đã đạt giới hạn câu"
          : "Thêm câu"}
      </button>
    </div>
  );
}
