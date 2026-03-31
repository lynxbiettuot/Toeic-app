import React from 'react';
import { splitPipeSeparatedUrls } from '../../utils/helpers';

export function UrlDetailRow({ label, value, mediaType = "link" }) {
  const urls = splitPipeSeparatedUrls(value);

  return (
    <div className="detail-row">
      <p className="detail-label">{label}</p>
      <div className="detail-value">
        {urls.length === 0 ? (
          "Không có"
        ) : (
          <div className="url-list">
            {urls.map((url) => (
              <div className="url-preview-item" key={url}>
                <a className="url-link" href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>

                {mediaType === "image" ? (
                  <img className="media-preview-image" src={url} alt="Preview ảnh" />
                ) : null}

                {mediaType === "audio" ? (
                  <audio className="media-preview-audio" controls preload="none" src={url}>
                    Trình duyệt không hỗ trợ audio.
                  </audio>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
