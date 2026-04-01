/**
 * Hàm phân tích số nguyên từ tham số query/body của request
 */
export const parseIntParam = (value: unknown): number | null => {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(normalized ?? ""), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Phân tích trường số nguyên với giá trị mặc định fallback
 */
export const parseIntegerField = (value: unknown, fallback?: number): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Chuẩn hóa giá trị từ ô Excel (Xử lý các trường hợp đặc biệt như richText, hyperlink, result)
 */
export const normalizeCellValue = (value: any): string | number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === "(trống)") {
      return null;
    }

    return trimmed;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return normalizeCellValue(value.text);
    }

    if (
      "text" in value &&
      value.text &&
      typeof value.text === "object" &&
      "richText" in value.text &&
      Array.isArray(value.text.richText)
    ) {
      const nestedRichTextValue = (value.text.richText as any[])
        .map((item: { text?: string }) => item.text ?? "")
        .join("");

      return normalizeCellValue(nestedRichTextValue);
    }

    if ("result" in value && (typeof value.result === "string" || typeof value.result === "number")) {
      return normalizeCellValue(value.result);
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      const richTextValue = (value.richText as any[])
        .map((item: { text?: string }) => item.text ?? "")
        .join("");

      return normalizeCellValue(richTextValue);
    }

    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return normalizeCellValue(value.hyperlink);
    }
  }

  return String(value).trim() || null;
};
