import React from 'react';

export function ImportVocabForm({ 
  importTitle, setImportTitle, 
  importDescription, setImportDescription, 
  importFile, onFileChange, 
  onImport, 
  importing 
}) {
  return (
    <div className="import-form-card">
      <input
        className="import-input"
        placeholder="Tiêu đề bộ từ vựng (tuỳ chọn)"
        value={importTitle}
        onChange={(event) => setImportTitle(event.target.value)}
      />
      <input
        className="import-input"
        placeholder="Mô tả (tuỳ chọn)"
        value={importDescription}
        onChange={(event) => setImportDescription(event.target.value)}
      />
      <label className="file-picker">
        <span>{importFile?.name || "Chọn file Excel/CSV theo template"}</span>
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={onFileChange}
        />
      </label>
      <button className="import-button import-button-primary" type="button" onClick={onImport} disabled={importing}>
        {importing ? "Đang import..." : "Lưu vào Private"}
      </button>
    </div>
  );
}
