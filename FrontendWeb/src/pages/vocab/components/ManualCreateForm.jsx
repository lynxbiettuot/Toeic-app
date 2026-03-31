import React from 'react';

export function ManualCreateForm({ 
  title, setTitle, 
  description, setDescription, 
  cardDraft, setCardDraft, 
  cards, onAddCard, onRemoveCard, 
  onSave 
}) {
  return (
    <div className="import-form-card">
      <input
        className="import-input"
        placeholder="Tiêu đề bộ từ vựng"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <input
        className="import-input"
        placeholder="Mô tả ngắn"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      <p className="detail-label">Thêm flashcard</p>
      <input
        className="import-input"
        placeholder="Từ vựng"
        value={cardDraft.word}
        onChange={(event) =>
          setCardDraft((current) => ({ ...current, word: event.target.value }))
        }
      />
      <input
        className="import-input"
        placeholder="Định nghĩa"
        value={cardDraft.definition}
        onChange={(event) =>
          setCardDraft((current) => ({ ...current, definition: event.target.value }))
        }
      />
      <input
        className="import-input"
        placeholder="Loại từ (noun, verb...)"
        value={cardDraft.word_type}
        onChange={(event) =>
          setCardDraft((current) => ({ ...current, word_type: event.target.value }))
        }
      />
      <input
        className="import-input"
        placeholder="Phiên âm"
        value={cardDraft.pronunciation}
        onChange={(event) =>
          setCardDraft((current) => ({ ...current, pronunciation: event.target.value }))
        }
      />
      <textarea
        className="import-input import-textarea"
        placeholder="Ví dụ"
        value={cardDraft.example}
        onChange={(event) =>
          setCardDraft((current) => ({ ...current, example: event.target.value }))
        }
      />
      <input
        className="import-input"
        placeholder="URL ảnh"
        value={cardDraft.image_url}
        onChange={(event) =>
          setCardDraft((current) => ({ ...current, image_url: event.target.value }))
        }
      />

      <div className="import-actions">
        <button className="import-button import-button-secondary" type="button" onClick={onAddCard}>
          Thêm thẻ
        </button>
        <button className="import-button import-button-primary" type="button" onClick={onSave}>
          Lưu bộ Private
        </button>
      </div>

      {cards.length > 0 && (
        <div className="preview-box">
          <p className="detail-label">Danh sách thẻ nháp</p>
          <div className="action-grid">
            {cards.map((card) => (
              <div className="action-chip" key={card.id}>
                <span>
                  <strong>{card.word}</strong>: {card.definition}
                </span>
                <button className="table-inline-button danger" type="button" onClick={() => onRemoveCard(card.id)}>
                  Xóa thẻ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mock-url">Đã nhập: {cards.length} flashcard</p>
    </div>
  );
}
