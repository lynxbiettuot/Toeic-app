import React from 'react';
import { PaginationControls } from '../../../components/common/PaginationControls';

export function VocabSetTable({ 
  sets = [], 
  loading, 
  onViewDetail, 
  onStatusChange, 
  getVocabDisplayStatus,
  currentPage,
  totalPages,
  onPageChange
}) {
  return (
    <>
      <div className="table-shell">
        <table className="exam-table">
          <thead>
            <tr>
              <th>Tên bộ</th>
              <th>Số thẻ</th>
              <th>Ngày tạo</th>
              <th>Người đăng</th>
              <th>Trạng thái</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  Đang tải danh sách bộ từ vựng...
                </td>
              </tr>
            ) : sets.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  Không có bộ từ vựng phù hợp.
                </td>
              </tr>
            ) : (
              sets.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.card_count}</td>
                  <td>{String(item.created_at).slice(0, 10)}</td>
                  <td>{item.ownerName} ({item.ownerType === "USER" ? "User" : "Admin"})</td>
                  <td>
                    <select
                      className="exam-filter inline-status-filter"
                      value={getVocabDisplayStatus(item)}
                      onChange={(event) => onStatusChange(item, event.target.value)}
                    >
                      <option value="PRIVATE">Private</option>
                      <option value="PUBLIC">Public</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="table-inline-button"
                      type="button"
                      onClick={() => onViewDetail(item)}
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

      {sets.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
