import React from 'react';

export function QuestionEditor({ 
  editDraft, 
  setEditDraft, 
  onSave, 
  saving, 
  saveMessage 
}) {
  const partNumber = Number.parseInt(editDraft.part_number, 10);

  return (
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

      {[5, 6, 7].includes(partNumber) && (
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
          disabled={[1, 2].includes(partNumber)}
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
          disabled={[1, 2].includes(partNumber)}
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
          disabled={[1, 2].includes(partNumber)}
          onChange={(event) =>
            setEditDraft((current) => ({ ...current, answerC: event.target.value }))
          }
        />
      </div>

      {partNumber !== 2 && (
        <div className="import-input-group">
          <label>Đáp án D:</label>
          <input
            className="import-input"
            placeholder="Nội dung đáp án D"
            value={editDraft.answerD}
            disabled={[1].includes(partNumber)}
            onChange={(event) =>
              setEditDraft((current) => ({ ...current, answerD: event.target.value }))
            }
          />
        </div>
      )}

      {[1, 2, 3, 4].includes(partNumber) && (
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
          {partNumber !== 2 && (
            <option value="D">Đáp án đúng: D</option>
          )}
        </select>
      </div>

      <button className="import-button import-button-primary" type="button" onClick={onSave} disabled={saving}>
        {saving ? "Đang lưu..." : "Lưu chỉnh sửa"}
      </button>
    </div>
  );
}
