import React, { useMemo, useState, useEffect } from 'react';
import { apiFetchJson, VOCAB_API_BASE_URL, VOCAB_STATUS_FILTERS, TABLE_PAGE_SIZE } from '../../api/apiClient';
import { PaginationControls } from '../../components/common/PaginationControls';
import { isHttpUrl } from '../../utils/helpers';

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
  const [detailDraft, setDetailDraft] = useState({
    title: "",
    description: "",
  });
  const [detailCards, setDetailCards] = useState([]);
  const [detailSearch, setDetailSearch] = useState("");
  const [selectedDetailCardId, setSelectedDetailCardId] = useState(null);
  const [savingDetail, setSavingDetail] = useState(false);
  const [message, setMessage] = useState("");

  const fetchSets = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    const keyword = search.trim();

    if (keyword) {
      params.set("search", keyword);
    }

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
    fetchSets().catch((requestError) => {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể tải bộ từ vựng.");
    });
  }, [search, statusFilter]);

  useEffect(() => {
    setCurrentSetPage(1);
  }, [search, statusFilter]);

  const totalSetPages = Math.max(1, Math.ceil(sets.length / TABLE_PAGE_SIZE));

  useEffect(() => {
    if (currentSetPage > totalSetPages) {
      setCurrentSetPage(totalSetPages);
    }
  }, [currentSetPage, totalSetPages]);

  const paginatedSets = useMemo(() => {
    const start = (currentSetPage - 1) * TABLE_PAGE_SIZE;
    return sets.slice(start, start + TABLE_PAGE_SIZE);
  }, [sets, currentSetPage]);

  const changeSetStatus = async (setId, nextStatus) => {
    try {
      await apiFetchJson(`${VOCAB_API_BASE_URL}/${setId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchSets();
      setMessage("Cập nhật trạng thái bộ từ vựng thành công.");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể cập nhật trạng thái bộ từ vựng.");
    }
  };

  const getVocabDisplayStatus = (setItem) => {
    if (setItem.warnedAt) return "WARNING";
    if (setItem.status === "PUBLISHED") return "PUBLIC";
    return "PRIVATE";
  };

  const handleInlineStatusChange = async (setItem, nextDisplayStatus) => {
    await changeSetStatus(setItem.id, nextDisplayStatus === "PUBLIC" ? "PUBLISHED" : "HIDDEN");
  };

  const isOptionalHttpUrl = (value) => !value.trim() || isHttpUrl(value);

  const addCard = () => {
    setMessage("");
    if (!cardDraft.word.trim() || !cardDraft.definition.trim()) {
      setMessage("Flashcard cần ít nhất từ vựng và định nghĩa.");
      return;
    }
    if (!isOptionalHttpUrl(cardDraft.image_url)) {
      setMessage("URL ảnh của flashcard phải là HTTP/HTTPS.");
      return;
    }
    setCards((current) => [...current, { id: Date.now(), ...cardDraft }]);
    setCardDraft({
      word: "",
      definition: "",
      word_type: "",
      pronunciation: "",
      example: "",
      image_url: "",
    });
    setMessage("Đã thêm flashcard vào bản nháp.");
  };

  const removeCard = (cardId) => {
    setCards((current) => current.filter((card) => card.id !== cardId));
  };

  const saveDraftSet = async () => {
    if (!title.trim()) {
      setMessage("Nhập tiêu đề bộ từ vựng trước khi lưu.");
      return;
    }
    try {
      await apiFetchJson(VOCAB_API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          cards: cards.map((item) => ({
            word: item.word,
            definition: item.definition,
            word_type: item.word_type,
            pronunciation: item.pronunciation,
            example: item.example,
            image_url: item.image_url,
          })),
        }),
      });
      setTitle("");
      setDescription("");
      setCards([]);
      setMode(null);
      setMessage("Đã lưu bộ từ vựng ở trạng thái Private.");
      await fetchSets();
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể tạo bộ từ vựng.");
    }
  };

  const loadSetDetail = async (setItem) => {
    const setId = setItem?.id;
    try {
      setDetailLoading(true);
      const result = await apiFetchJson(`${VOCAB_API_BASE_URL}/${setId}`);
      const detail = result.data;
      setSelectedSetId(detail.id);
      setDetailReadOnly(setItem?.ownerType === "USER");
      setDetailDraft({
        title: detail.title || "",
        description: detail.description || "",
      });
      setDetailCards(
        (detail.flashcards || []).map((card) => ({
          id: card.id,
          word: card.word || "",
          definition: card.definition || "",
          word_type: card.word_type || "",
          pronunciation: card.pronunciation || "",
          example: card.example || "",
          image_url: card.image_url || "",
          audio_url: card.audio_url || "",
        })),
      );
      setDetailSearch("");
      setSelectedDetailCardId(null);
      setMode("detail");
      setMessage("Đã tải chi tiết bộ từ vựng.");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể tải chi tiết bộ từ vựng.");
    } finally {
      setDetailLoading(false);
    }
  };

  const updateDetailCard = (cardId, key, value) => {
    setDetailCards((current) =>
      current.map((card) => (card.id === cardId ? { ...card, [key]: value } : card)),
    );
  };

  const removeDetailCard = (cardId) => {
    setDetailCards((current) => current.filter((card) => card.id !== cardId));
    setSelectedDetailCardId((current) => (current === cardId ? null : current));
  };

  const addDetailCard = () => {
    const newCardId = `new-${Date.now()}`;
    setDetailCards((current) => [
      ...current,
      {
        id: newCardId,
        word: "",
        definition: "",
        word_type: "",
        pronunciation: "",
        example: "",
        image_url: "",
        audio_url: "",
      },
    ]);
    setSelectedDetailCardId(newCardId);
  };

  const saveDetailSet = async () => {
    if (!selectedSetId) return;
    if (!detailDraft.title.trim()) {
      setMessage("Tiêu đề bộ từ vựng không được để trống.");
      return;
    }
    const invalidCard = detailCards.find(
      (card) =>
        (card.image_url && !isHttpUrl(card.image_url)) ||
        (card.audio_url && !isHttpUrl(card.audio_url)),
    );
    if (invalidCard) {
      setMessage(`URL ảnh/audio không hợp lệ cho từ ${invalidCard.word || "(trống)"}.`);
      return;
    }
    try {
      setSavingDetail(true);
      await apiFetchJson(`${VOCAB_API_BASE_URL}/${selectedSetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: detailDraft.title,
          description: detailDraft.description,
          cards: detailCards.map((card) => ({
            word: card.word,
            definition: card.definition,
            word_type: card.word_type,
            pronunciation: card.pronunciation,
            example: card.example,
            image_url: card.image_url,
            audio_url: card.audio_url,
          })),
        }),
      });
      await fetchSets();
      setMode(null);
      setMessage("Đã lưu chỉnh sửa bộ từ vựng.");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể lưu chỉnh sửa bộ từ vựng.");
    } finally {
      setSavingDetail(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      setMessage("Vui lòng chọn file Excel/CSV để import.");
      return;
    }
    setImporting(true);
    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("title", importTitle || `Imported vocab ${new Date().toISOString().slice(0, 10)}`);
    formData.append("description", importDescription || "Imported by admin");
    try {
      await apiFetchJson(`${VOCAB_API_BASE_URL}/import`, {
        method: "POST",
        body: formData,
      });
      setMessage("Import thành công, bộ từ vựng đang ở trạng thái Private.");
      setMode(null);
      setImportFile(null);
      setImportTitle("");
      setImportDescription("");
      await fetchSets();
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Không thể import bộ từ vựng.");
    } finally {
      setImporting(false);
    }
  };

  const filteredDetailCards = useMemo(() => {
    const keyword = detailSearch.trim().toLowerCase();
    if (!keyword) return detailCards;
    return detailCards.filter(
      (card) =>
        card.word.toLowerCase().includes(keyword) ||
        card.definition.toLowerCase().includes(keyword),
    );
  }, [detailCards, detailSearch]);

  const selectedDetailCard = useMemo(
    () => detailCards.find((card) => card.id === selectedDetailCardId) ?? null,
    [detailCards, selectedDetailCardId],
  );

  return (
    <section className="exam-screen">
      <div className="dashboard-heading-row exam-heading">
        <h2>Quản lý Từ vựng hệ thống</h2>
      </div>

      <div className="exam-toolbar">
        <input
          className="exam-search"
          type="text"
          placeholder="Tìm tên bộ từ vựng"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="exam-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          {VOCAB_STATUS_FILTERS.map((item) => (
            <option value={item.value} key={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          className="exam-add-button"
          type="button"
          onClick={() => {
            setSelectedSetId(null);
            setMode("manual");
          }}
        >
          Tạo bộ mới
        </button>
      </div>

      {message && <p className="page-feedback info">{message}</p>}

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
              paginatedSets.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.card_count}</td>
                  <td>{String(item.created_at).slice(0, 10)}</td>
                  <td>{item.ownerName} ({item.ownerType === "USER" ? "User" : "Admin"})</td>
                  <td>
                    <select
                      className="exam-filter inline-status-filter"
                      value={getVocabDisplayStatus(item)}
                      onChange={(event) => {
                        handleInlineStatusChange(item, event.target.value).catch((requestError) => {
                          setMessage(
                            requestError instanceof Error
                              ? requestError.message
                              : "Không thể cập nhật trạng thái bộ từ vựng.",
                          );
                        });
                      }}
                    >
                      <option value="PRIVATE">Private</option>
                      <option value="PUBLIC">Public</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="table-inline-button"
                      type="button"
                      onClick={() => loadSetDetail(item)}
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

      {sets.length > 0 ? (
        <PaginationControls
          currentPage={currentSetPage}
          totalPages={totalSetPages}
          onPageChange={setCurrentSetPage}
        />
      ) : null}

      {mode ? (
        <div className="user-modal-overlay" onClick={() => setMode(null)}>
          <div className="create-panel vocab-panel user-modal vocab-modal-panel" onClick={(event) => event.stopPropagation()}>
          {mode !== "detail" ? (
            <>
              <div className="create-tabs">
                <button
                  className={`create-tab ${mode === "manual" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setMode("manual")}
                >
                  Nhập thủ công
                </button>
                <button
                  className={`create-tab ${mode === "import" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setMode("import")}
                >
                  Import Excel/CSV
                </button>
              </div>
              <div className="table-action-group">
                <button className="table-inline-button" type="button" onClick={() => setMode(null)}>
                  Đóng
                </button>
              </div>
            </>
          ) : null}

          {mode === "manual" ? (
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

            <p className="detail-label">Thêm flashcard</p>
            <input
              className="import-input"
              placeholder="Từ vựng"
              value={cardDraft.word}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, word: event.target.value }))
              }
            />
            <input
              className="import-input"
              placeholder="Định nghĩa"
              value={cardDraft.definition}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, definition: event.target.value }))
              }
            />
            <input
              className="import-input"
              placeholder="Loại từ (noun, verb...)"
              value={cardDraft.word_type}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, word_type: event.target.value }))
              }
            />
            <input
              className="import-input"
              placeholder="Phiên âm"
              value={cardDraft.pronunciation}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, pronunciation: event.target.value }))
              }
            />
            <textarea
              className="import-input import-textarea"
              placeholder="Ví dụ"
              value={cardDraft.example}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, example: event.target.value }))
              }
            />
            <input
              className="import-input"
              placeholder="URL ảnh"
              value={cardDraft.image_url}
              onChange={(event) =>
                setCardDraft((current) => ({ ...current, image_url: event.target.value }))
              }
            />

            <div className="import-actions">
              <button className="import-button import-button-secondary" type="button" onClick={addCard}>
                Thêm thẻ
              </button>
              <button className="import-button import-button-primary" type="button" onClick={saveDraftSet}>
                Lưu bộ Private
              </button>
            </div>

            {cards.length > 0 ? (
              <div className="preview-box">
                <p className="detail-label">Danh sách thẻ nháp</p>
                <div className="action-grid">
                  {cards.map((card) => (
                    <div className="action-chip" key={card.id}>
                      <span>
                        <strong>{card.word}</strong>: {card.definition}
                      </span>
                      <button className="table-inline-button danger" type="button" onClick={() => removeCard(card.id)}>
                        Xóa thẻ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

              <p className="mock-url">Đã nhập: {cards.length} flashcard</p>
            </div>
          ) : mode === "import" ? (
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
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <div className="preview-box">
                <p className="detail-label">Preview danh sách thẻ</p>
                <div className="preview-row">
                  <span>Word</span>
                  <span>Definition</span>
                  <span>Image_URL / Audio_URL (HTTP/HTTPS)</span>
                </div>
              </div>
              <button className="import-button import-button-primary" type="button" onClick={handleImportSubmit} disabled={importing}>
                {importing ? "Đang import..." : "Lưu vào Private"}
              </button>
            </div>
          ) : (
            <div className="import-form-card">
              <div className="question-list-head">
                <h3>{detailDraft.title || "Chi tiết bộ từ vựng"}</h3>
                <div className="table-action-group">
                  <button className="table-inline-button" type="button" onClick={() => setMode(null)}>
                    Đóng
                  </button>
                  {!detailReadOnly ? (
                    <>
                      <button
                        className="table-inline-button"
                        type="button"
                        onClick={() => setSelectedDetailCardId(null)}
                      >
                        Danh sách từ
                      </button>
                      <button className="table-inline-button" type="button" onClick={addDetailCard}>
                        + Thêm thẻ
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {detailLoading ? <p className="empty-state">Đang tải chi tiết bộ từ vựng...</p> : null}

              {!detailLoading && selectedSetId ? (
                <>
                  {selectedDetailCard ? (
                    <div className="answer-block">
                      <p className="detail-label">Chi tiết từ vựng</p>
                      <input
                        className="import-input"
                        placeholder="Word"
                        value={selectedDetailCard.word}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "word", event.target.value)}
                      />
                      <input
                        className="import-input"
                        placeholder="Definition"
                        value={selectedDetailCard.definition}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "definition", event.target.value)}
                      />
                      <input
                        className="import-input"
                        placeholder="Word type"
                        value={selectedDetailCard.word_type}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "word_type", event.target.value)}
                      />
                      <input
                        className="import-input"
                        placeholder="Pronunciation"
                        value={selectedDetailCard.pronunciation}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "pronunciation", event.target.value)}
                      />
                      <textarea
                        className="import-input import-textarea"
                        placeholder="Example"
                        value={selectedDetailCard.example}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "example", event.target.value)}
                      />
                      <input
                        className="import-input"
                        placeholder="Image URL"
                        value={selectedDetailCard.image_url}
                        disabled={detailReadOnly}
                        onChange={(event) => updateDetailCard(selectedDetailCard.id, "image_url", event.target.value)}
                      />

                      <div className="table-action-group card-detail-actions">
                        {!detailReadOnly ? (
                          <>
                            <button className="table-inline-button" type="button" onClick={() => setSelectedDetailCardId(null)}>
                              Quay lại danh sách từ
                            </button>
                            <button className="table-inline-button danger" type="button" onClick={() => removeDetailCard(selectedDetailCard.id)}>
                              Xóa thẻ
                            </button>
                            <button
                              className="import-button import-button-primary"
                              type="button"
                              onClick={saveDetailSet}
                              disabled={savingDetail}
                            >
                              {savingDetail ? "Đang lưu..." : "Lưu chỉnh sửa bộ từ vựng"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        className="import-input"
                        placeholder="Tiêu đề bộ từ vựng"
                        value={detailDraft.title}
                        disabled={detailReadOnly}
                        onChange={(event) =>
                          setDetailDraft((current) => ({ ...current, title: event.target.value }))
                        }
                      />
                      <input
                        className="import-input"
                        placeholder="Mô tả"
                        value={detailDraft.description}
                        disabled={detailReadOnly}
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
                            {filteredDetailCards.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="empty-state">
                                  Không có từ phù hợp tìm kiếm.
                                </td>
                              </tr>
                            ) : (
                              filteredDetailCards.map((card, index) => (
                                <tr key={card.id} className="word-row" onClick={() => setSelectedDetailCardId(card.id)}>
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
                                        setSelectedDetailCardId(card.id);
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

                      {!detailReadOnly ? (
                        <button
                          className="import-button import-button-primary"
                          type="button"
                          onClick={saveDetailSet}
                          disabled={savingDetail}
                        >
                          {savingDetail ? "Đang lưu..." : "Lưu chỉnh sửa bộ từ vựng"}
                        </button>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}

              {!detailLoading && !selectedSetId ? (
                <p className="empty-state">Hãy chọn một bộ từ vựng trong bảng để xem và chỉnh sửa.</p>
              ) : null}

            </div>
          )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
