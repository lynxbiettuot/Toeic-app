import React from 'react';

export function FlashcardEditor({ 
  card, 
  readOnly, 
  onUpdateField, 
  onBack, 
  onRemove, 
  onSaveSet, 
  saving 
}) {
  return (
    <div className="answer-block">
      <p className="detail-label">Chi tiết từ vựng</p>
      <input
        className="import-input"
        placeholder="Word"
        value={card.word}
        disabled={readOnly}
        onChange={(event) => onUpdateField(card.id, "word", event.target.value)}
      />
      <input
        className="import-input"
        placeholder="Definition"
        value={card.definition}
        disabled={readOnly}
        onChange={(event) => onUpdateField(card.id, "definition", event.target.value)}
      />
      <input
        className="import-input"
        placeholder="Word type"
        value={card.word_type}
        disabled={readOnly}
        onChange={(event) => onUpdateField(card.id, "word_type", event.target.value)}
      />
      <input
        className="import-input"
        placeholder="Pronunciation"
        value={card.pronunciation}
        disabled={readOnly}
        onChange={(event) => onUpdateField(card.id, "pronunciation", event.target.value)}
      />
      <textarea
        className="import-input import-textarea"
        placeholder="Example"
        value={card.example}
        disabled={readOnly}
        onChange={(event) => onUpdateField(card.id, "example", event.target.value)}
      />
      <input
        className="import-input"
        placeholder="Image URL"
        value={card.image_url}
        disabled={readOnly}
        onChange={(event) => onUpdateField(card.id, "image_url", event.target.value)}
      />

      <div className="table-action-group card-detail-actions">
        {!readOnly && (
          <>
            <button className="table-inline-button" type="button" onClick={onBack}>
              Quay lại danh sách từ
            </button>
            <button className="table-inline-button danger" type="button" onClick={() => onRemove(card.id)}>
              Xóa thẻ
            </button>
            <button
              className="import-button import-button-primary"
              type="button"
              onClick={onSaveSet}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu chỉnh sửa bộ từ vựng"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
