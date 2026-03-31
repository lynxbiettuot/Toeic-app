import React from 'react';

export function FlashcardTable({ 
  cards = [], 
  onViewCard 
}) {
  return (
    <div className="table-shell">
      <table className="exam-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Từ vựng</th>
            <th>Loại từ</th>
            <th>Định nghĩa</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {cards.length === 0 ? (
            <tr>
              <td colSpan="5" className="empty-state">
                Không có từ phù hợp tìm kiếm.
              </td>
            </tr>
          ) : (
            cards.map((card, index) => (
              <tr key={card.id} className="word-row" onClick={() => onViewCard(card.id)}>
                <td>{index + 1}</td>
                <td>{card.word || "-"}</td>
                <td>{card.word_type || "-"}</td>
                <td>{card.definition || "-"}</td>
                <td>
                  <button
                    className="table-inline-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewCard(card.id);
                    }}
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
