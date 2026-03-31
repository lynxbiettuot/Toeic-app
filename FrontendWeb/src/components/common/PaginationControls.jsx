import React from 'react';

export function PaginationControls({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="pagination-wrap">
      <button
        className="table-inline-button"
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        Trước
      </button>

      <div className="pagination-pages">
        {pages.map((page) => (
          <button
            className={`table-inline-button ${page === currentPage ? "pagination-active" : ""}`}
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        className="table-inline-button"
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        Sau
      </button>
    </div>
  );
}
