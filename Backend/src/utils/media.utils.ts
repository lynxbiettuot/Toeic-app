/**
 * Xử lý các chuỗi URL phân tách bằng dấu gạch đứng (|)
 */
export const splitPipeSeparatedValues = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
};

/**
 * Gộp các chuỗi URL thành một chuỗi duy nhất phân tách bằng dấu gạch đứng
 */
export const mergePipeSeparatedValues = (...values: Array<string | null | undefined>): string | null => {
  const merged = Array.from(new Set(values.flatMap((value) => splitPipeSeparatedValues(value))));
  return merged.length > 0 ? merged.join(" | ") : null;
};

/**
 * Kiểm tra xem một chuỗi có phải là URL hợp lệ (HTTP/HTTPS) không
 */
export const isHttpUrl = (value: string | null | undefined): boolean => {
  if (!value) {
    return true;
  }

  return /^https?:\/\//i.test(value.trim());
};

/**
 * Thu thập tất cả URL ảnh từ câu hỏi và nhóm câu hỏi
 */
export const collectQuestionImageUrls = (
  question: { image_url?: string | null; group?: { image_url?: string | null } | null },
) => {
  const collected = [
    ...splitPipeSeparatedValues(question.image_url),
    ...splitPipeSeparatedValues(question.group?.image_url),
  ];

  return Array.from(new Set(collected));
};

/**
 * Lấy thông tin media (ảnh, audio, transcript, passage) của một câu hỏi
 */
export const getQuestionMedia = (
  question: { 
    image_url?: string | null; 
    audio_url?: string | null; 
    transcript?: string | null;
    group_id?: number | null;
    group?: { 
      image_url?: string | null; 
      audio_url?: string | null; 
      transcript?: string | null;
      passage_text?: string | null;
    } | null 
  },
  groupImageUrlMap?: Map<number, string[]>,
) => {
  const groupedUrls = question.group_id ? groupImageUrlMap?.get(question.group_id) ?? [] : [];
  const directUrls = collectQuestionImageUrls(question);
  const imageUrls = Array.from(new Set([...groupedUrls, ...directUrls]));

  return {
    image_urls: imageUrls,
    image_url: imageUrls.join(" | ") || null,
    audio_url: question.audio_url ?? question.group?.audio_url ?? null,
    transcript: question.transcript ?? question.group?.transcript ?? null,
    passage_text: question.group?.passage_text ?? null,
  };
};
