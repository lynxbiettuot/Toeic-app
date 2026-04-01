import React from 'react';
import { DetailRow } from '../../../components/common/DetailRow';
import { UrlDetailRow } from '../../../components/common/UrlDetailRow';

export function QuestionViewer({ 
  questionDetail, 
  loadingQuestion 
}) {
  if (loadingQuestion) {
    return <p className="empty-state">Đang tải chi tiết câu hỏi...</p>;
  }

  if (!questionDetail) {
    return <p className="empty-state">Hãy chọn một câu để xem chi tiết.</p>;
  }

  return (
    <div className="question-detail-content">
      <DetailRow label="Câu số" value={questionDetail.question_number} />
      <DetailRow label="Part" value={questionDetail.part_number} />
      <DetailRow label="Nội dung" value={questionDetail.content || "Không có"} />
      <UrlDetailRow label="URL ảnh" value={questionDetail.image_url} mediaType="image" />
      <UrlDetailRow label="URL audio" value={questionDetail.audio_url} mediaType="audio" />
      <DetailRow
        label="Transcript"
        value={questionDetail.transcript || questionDetail.group?.transcript || "Không có"}
      />
      <DetailRow
        label="Đoạn văn nhóm"
        value={questionDetail.group?.passage_text || "Không có"}
      />
      <DetailRow label="Đáp án đúng" value={questionDetail.correct_answer} />

      <div className="answer-block">
        <p className="detail-label">Các đáp án</p>
        <div className="answer-list">
          {(questionDetail.answers ?? []).map((answer) => (
            <div
              key={answer.option_label}
              className={`answer-item ${
                answer.option_label === questionDetail.correct_answer ? "is-correct" : ""
              }`}
            >
              <strong>{answer.option_label}.</strong> {answer.content || (Number.parseInt(questionDetail.part_number, 10) <= 2 ? "(Nghe)" : "Không có nội dung")}
              {answer.option_label === questionDetail.correct_answer && " (Đáp án đúng)"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
