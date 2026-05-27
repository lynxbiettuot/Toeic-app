import React from 'react';

// Hiển thị một dòng label/value dùng chung trong các panel chi tiết.
export function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <p className="detail-label">{label}</p>
      <div className="detail-value">{value}</div>
    </div>
  );
}
