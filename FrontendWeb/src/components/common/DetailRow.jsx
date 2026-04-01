import React from 'react';

export function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <p className="detail-label">{label}</p>
      <div className="detail-value">{value}</div>
    </div>
  );
}
