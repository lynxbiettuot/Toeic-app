import React from 'react';

// Ô thống kê nhỏ dùng để hiển thị các chỉ số dashboard.
export function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
