import React from 'react';

export function ManualCreateForm({ 
  title, setTitle, 
  description, setDescription, 
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

      <div className="import-actions">
        <button className="import-button import-button-primary" type="button" onClick={onSave}>
          Tạo bộ & Lưu Private
        </button>
      </div>

      <p className="mock-url" style={{ marginTop: '20px', color: '#666' }}>
        * Sau khi tạo, bạn có thể vào phần "Xem chi tiết" để thêm từng thẻ từ vựng.
      </p>
    </div>
  );
}
