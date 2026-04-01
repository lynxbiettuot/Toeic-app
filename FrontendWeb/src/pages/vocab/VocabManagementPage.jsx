import React, { useMemo, useState, useEffect } from 'react';
import { apiFetchJson, VOCAB_API_BASE_URL, VOCAB_STATUS_FILTERS, TABLE_PAGE_SIZE } from '../../api/apiClient';
import { isHttpUrl } from '../../utils/helpers';

// Sub-components
import { VocabSetTable } from './components/VocabSetTable';
import { ManualCreateForm } from './components/ManualCreateForm';
import { ImportVocabForm } from './components/ImportVocabForm';
import { VocabDetailModal } from './components/VocabDetailModal';

export function VocabManagementPage() {
  const [sets, setSets] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentSetPage, setCurrentSetPage] = useState(1);
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cardDraft, setCardDraft] = useState({
    word: "",
    definition: "",
    word_type: "",
    pronunciation: "",
    example: "",
    image_url: "",
  });
  const [cards, setCards] = useState([]);
  const [importTitle, setImportTitle] = useState("");
  const [importDescription, setImportDescription] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [detailReadOnly, setDetailReadOnly] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDraft, setDetailDraft] = useState({ title: "", description: "" });
  const [detailCards, setDetailCards] = useState([]);
  const [detailSearch, setDetailSearch] = useState("");
  const [selectedDetailCardId, setSelectedDetailCardId] = useState(null);
  const [savingDetail, setSavingDetail] = useState(false);
  const [message, setMessage] = useState("");

  const fetchSets = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());

    try {
      const result = await apiFetchJson(`${VOCAB_API_BASE_URL}?${params.toString()}`);
      const normalized = (result.data || []).filter((item) => !item.deleted_at);

      let filtered = normalized;
      if (statusFilter === "PRIVATE") {
        filtered = normalized.filter((item) => item.status === "DRAFT" || item.status === "HIDDEN");
      } else if (statusFilter === "PUBLIC") {
        filtered = normalized.filter((item) => item.status === "PUBLISHED");
      } else if (statusFilter === "WARNING") {
        filtered = normalized.filter((item) => !!item.warnedAt);
      }

      setSets(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets().catch((err) => setMessage(err instanceof Error ? err.message : "Không thể tải bộ từ vựng."));
  }, [search, statusFilter]);

  useEffect(() => { setCurrentSetPage(1); }, [search, statusFilter]);

  const totalSetPages = Math.max(1, Math.ceil(sets.length / TABLE_PAGE_SIZE));
  useEffect(() => { 
    if (currentSetPage > totalSetPages) setCurrentSetPage(totalSetPages); 
  }, [currentSetPage, totalSetPages]);

  const paginatedSets = useMemo(() => {
    const start = (currentSetPage - 1) * TABLE_PAGE_SIZE;
    return sets.slice(start, start + TABLE_PAGE_SIZE);
  }, [sets, currentSetPage]);

  const handleInlineStatusChange = async (setItem, nextDisplayStatus) => {
    const nextStatus = nextDisplayStatus === "PUBLIC" ? "PUBLISHED" : "HIDDEN";
    try {
      await apiFetchJson(`${VOCAB_API_BASE_URL}/${setItem.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchSets();
      setMessage("Cập nhật trạng thái bộ từ vựng thành công.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể cập nhật trạng thái bộ từ vựng.");
    }
  };

  const getVocabDisplayStatus = (setItem) => {
    if (setItem.warnedAt) return "WARNING";
    if (setItem.status === "PUBLISHED") return "PUBLIC";
    return "PRIVATE";
  };

  const addCardToDraft = () => {
    setMessage("");
    if (!cardDraft.word.trim() || !cardDraft.definition.trim()) {
      setMessage("Flashcard cần ít nhất từ vựng và định nghĩa.");
      return;
    }
    if (cardDraft.image_url.trim() && !isHttpUrl(cardDraft.image_url)) {
      setMessage("URL ảnh của flashcard phải là HTTP/HTTPS.");
      return;
    }
    setCards((curr) => [...curr, { id: Date.now(), ...cardDraft }]);
    setCardDraft({ word: "", definition: "", word_type: "", pronunciation: "", example: "", image_url: "" });
    setMessage("Đã thêm flashcard vào bản nháp.");
  };

  const saveManualSet = async () => {
    if (!title.trim()) { setMessage("Nhập tiêu đề bộ từ vựng trước khi lưu."); return; }
    try {
      await apiFetchJson(VOCAB_API_BASE_URL, {
        method: "POST",
        body: JSON.stringify({
          title, description,
          cards: cards.map((c) => ({ ...c }))
        }),
      });
      setTitle(""); setDescription(""); setCards([]); setMode(null);
      setMessage("Đã lưu bộ từ vựng ở trạng thái Private.");
      await fetchSets();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể tạo bộ từ vựng.");
    }
  };

  const loadSetDetail = async (setItem) => {
    try {
      setDetailLoading(true);
      const result = await apiFetchJson(`${VOCAB_API_BASE_URL}/${setItem.id}`);
      const detail = result.data;
      setSelectedSetId(detail.id);
      setDetailReadOnly(setItem?.ownerType === "USER");
      setDetailDraft({ title: detail.title || "", description: detail.description || "" });
      setDetailCards((detail.flashcards || []).map((c) => ({ ...c })));
      setDetailSearch(""); setSelectedDetailCardId(null); setMode("detail");
      setMessage("Đã tải chi tiết bộ từ vựng.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể tải chi tiết bộ từ vựng.");
    } finally {
      setDetailLoading(false);
    }
  };

  const saveDetailSet = async () => {
    if (!selectedSetId || !detailDraft.title.trim()) {
      setMessage("Tiêu đề bộ từ vựng không được để trống.");
      return;
    }
    try {
      setSavingDetail(true);
      await apiFetchJson(`${VOCAB_API_BASE_URL}/${selectedSetId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: detailDraft.title, 
          description: detailDraft.description,
          cards: detailCards.map((c) => ({ ...c })),
        }),
      });
      await fetchSets();
      setMode(null);
      setMessage("Đã lưu chỉnh sửa bộ từ vựng.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể lưu chỉnh sửa bộ từ vựng.");
    } finally {
      setSavingDetail(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) { setMessage("Vui lòng chọn file Excel/CSV để import."); return; }
    setImporting(true);
    const fd = new FormData();
    fd.append("file", importFile);
    fd.append("title", importTitle || `Imported vocab ${new Date().toISOString().slice(0, 10)}`);
    fd.append("description", importDescription || "Imported by admin");
    try {
      await apiFetchJson(`${VOCAB_API_BASE_URL}/import`, { method: "POST", body: fd });
      setMessage("Import thành công, bộ từ vựng đang ở trạng thái Private.");
      setMode(null); setImportFile(null); setImportTitle(""); setImportDescription("");
      await fetchSets();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể import bộ từ vựng.");
    } finally {
      setImporting(false);
    }
  };

  const filteredDetailCards = useMemo(() => {
    const keyword = detailSearch.trim().toLowerCase();
    if (!keyword) return detailCards;
    return detailCards.filter(c => c.word.toLowerCase().includes(keyword) || c.definition.toLowerCase().includes(keyword));
  }, [detailCards, detailSearch]);

  const selectedDetailCard = useMemo(() => detailCards.find(c => c.id === selectedDetailCardId) ?? null, [detailCards, selectedDetailCardId]);

  return (
    <section className="exam-screen">
      <div className="dashboard-heading-row exam-heading">
        <h2>Quản lý Từ vựng hệ thống</h2>
      </div>

      <div className="exam-toolbar">
        <input className="exam-search" placeholder="Tìm tên bộ từ vựng" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="exam-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {VOCAB_STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <button className="exam-add-button" onClick={() => { setSelectedSetId(null); setMode("manual"); }}>Tạo bộ mới</button>
      </div>

      {message && <p className="page-feedback info">{message}</p>}

      <VocabSetTable 
        sets={paginatedSets}
        loading={loading}
        onViewDetail={loadSetDetail}
        onStatusChange={handleInlineStatusChange}
        getVocabDisplayStatus={getVocabDisplayStatus}
        currentPage={currentSetPage}
        totalPages={totalSetPages}
        onPageChange={setCurrentSetPage}
      />

      {mode && (
        <div className="user-modal-overlay" onClick={() => setMode(null)}>
          <div className="create-panel vocab-panel user-modal vocab-modal-panel" onClick={(e) => e.stopPropagation()}>
            {mode !== "detail" && (
              <>
                <div className="create-tabs">
                  <button className={`create-tab ${mode === "manual" ? "is-active" : ""}`} onClick={() => setMode("manual")}>Nhập thủ công</button>
                  <button className={`create-tab ${mode === "import" ? "is-active" : ""}`} onClick={() => setMode("import")}>Import Excel/CSV</button>
                </div>
                <div className="table-action-group">
                  <button className="table-inline-button" onClick={() => setMode(null)}>Đóng</button>
                </div>
              </>
            )}

            {mode === "manual" && (
              <ManualCreateForm 
                title={title} setTitle={setTitle}
                description={description} setDescription={setDescription}
                onSave={saveManualSet}
              />
            )}

            {mode === "import" && (
              <ImportVocabForm 
                importTitle={importTitle} setImportTitle={setImportTitle}
                importDescription={importDescription} setImportDescription={setImportDescription}
                importFile={importFile} onFileChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                onImport={handleImportSubmit}
                importing={importing}
              />
            )}

            {mode === "detail" && (
              <VocabDetailModal 
                detailDraft={detailDraft} setDetailDraft={setDetailDraft}
                readOnly={detailReadOnly}
                onClose={() => setMode(null)}
                onShowList={() => setSelectedDetailCardId(null)}
                onAddCard={() => { const id = `new-${Date.now()}`; setDetailCards(curr => [...curr, { id, word: "", definition: "", word_type: "", pronunciation: "", example: "", image_url: "", audio_url: "" }]); setSelectedDetailCardId(id); }}
                loading={detailLoading}
                selectedSetId={selectedSetId}
                selectedDetailCard={selectedDetailCard}
                filteredDetailCards={filteredDetailCards}
                onViewCard={setSelectedDetailCardId}
                onUpdateCardField={(id, k, v) => setDetailCards(curr => curr.map(c => c.id === id ? { ...c, [k]: v } : c))}
                onRemoveCard={(id) => { setDetailCards(curr => curr.filter(c => c.id !== id)); if(selectedDetailCardId === id) setSelectedDetailCardId(null); }}
                onSaveSet={saveDetailSet}
                saving={savingDetail}
                detailSearch={detailSearch} setDetailSearch={setDetailSearch}
                detailCards={detailCards}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
