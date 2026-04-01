import React from 'react';
import { FlashcardTable } from './FlashcardTable';
import { FlashcardEditor } from './FlashcardEditor';

export function VocabDetailModal({ 
  detailDraft, setDetailDraft, 
  readOnly, 
  onClose, 
  onShowList, 
  onAddCard, 
  loading, 
  selectedSetId,
  selectedDetailCard,
  filteredDetailCards,
  onViewCard,
  onUpdateCardField,
  onRemoveCard,
  onSaveSet,
  saving,
  detailSearch, setDetailSearch,
  detailCards
}) {
  return (
    <div className="import-form-card">
      <div className="question-list-head">
        <h3>{detailDraft.title || "Chi tiết bộ từ vựng"}</h3>
        <div className="table-action-group">
          <button className="table-inline-button" type="button" onClick={onClose}>
            Đóng
          </button>
          {!readOnly && (
            <>
              <button
                className="table-inline-button"
                type="button"
                onClick={onShowList}
              >
                Danh sách từ
              </button>
              <button className="table-inline-button" type="button" onClick={onAddCard}>
                + Thêm thẻ
              </button>
            </>
          )}
        </div>
      </div>

      {loading && <p className="empty-state">Đang tải chi tiết bộ từ vựng...</p>}

      {!loading && selectedSetId && (
        <>
          {selectedDetailCard ? (
            <FlashcardEditor 
              card={selectedDetailCard}
              readOnly={readOnly}
              onUpdateField={onUpdateCardField}
              onBack={onShowList}
              onRemove={onRemoveCard}
              onSaveSet={onSaveSet}
              saving={saving}
            />
          ) : (
            <>
              <input
                className="import-input"
                placeholder="Tiêu đề bộ từ vựng"
                value={detailDraft.title}
                disabled={readOnly}
                onChange={(event) =>
                  setDetailDraft((current) => ({ ...current, title: event.target.value }))
                }
              />
              <input
                className="import-input"
                placeholder="Mô tả"
                value={detailDraft.description}
                disabled={readOnly}
                onChange={(event) =>
                  setDetailDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
              <input
                className="exam-search"
                placeholder="Tìm từ trong bộ flashcard"
                value={detailSearch}
                onChange={(event) => setDetailSearch(event.target.value)}
              />

              <FlashcardTable 
                cards={filteredDetailCards}
                onViewCard={onViewCard}
              />

              {!readOnly && (
                <button
                  className="import-button import-button-primary"
                  type="button"
                  onClick={onSaveSet}
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "Lưu chỉnh sửa bộ từ vựng"}
                </button>
              )}
            </>
          )}
        </>
      )}

      {!loading && !selectedSetId && (
        <p className="empty-state">Hãy chọn một bộ từ vựng trong bảng để xem và chỉnh sửa.</p>
      )}
    </div>
  );
}
