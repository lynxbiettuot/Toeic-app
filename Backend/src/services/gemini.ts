import { GoogleGenAI } from "@google/genai";

type GeminiImagePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

type ReadingExplanationInput = {
  questionNumber: number;
  partNumber: number;
  questionText: string | null;
  passageText: string | null;
  transcript: string | null;
  imageUrls: string[];
  options: Array<{
    option_label: string;
    content: string;
  }>;
  correctAnswerLabel: string;
  correctAnswerText: string | null;
  selectedAnswerLabel: string | null;
  selectedAnswerText: string | null;
};

const apiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
const gemini = apiKey ? new GoogleGenAI({ apiKey }) : null;
const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_IMAGE_COUNT = 3;

const normalizeMimeType = (mimeType: string | null) => {
  const normalized = mimeType?.trim();
  return normalized && normalized.length > 0 ? normalized : "image/png";
};

const normalizeResponseText = (value: string) =>
  value.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

const fetchImageAsInlinePart = async (imageUrl: string): Promise<GeminiImagePart | null> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return {
      inlineData: {
        mimeType: normalizeMimeType(response.headers.get("content-type")),
        data: base64,
      },
    };
  } catch {
    return null;
  }
};

const buildPrompt = (input: ReadingExplanationInput) => {
  const optionsText = input.options
    .map((option) => `${option.option_label}. ${option.content}`)
    .join("\n");

  return [
    "Bạn là trợ lý giải TOEIC.",
    "Hãy viết giải thích NGẮN GỌN, dễ hiểu cho câu hỏi đọc sau khi học viên đã làm xong bài.",
    "Chỉ dựa trên dữ liệu đã cung cấp, không bịa thêm thông tin.",
    `Câu hỏi số: ${input.questionNumber}`,
    `Part: ${input.partNumber}`,
    `Đáp án đúng: ${input.correctAnswerLabel}${input.correctAnswerText ? ` - ${input.correctAnswerText}` : ""}`,
    input.selectedAnswerLabel
      ? `Đáp án người dùng chọn: ${input.selectedAnswerLabel}${input.selectedAnswerText ? ` - ${input.selectedAnswerText}` : ""}`
      : "Đáp án người dùng chọn: không có",
    "",
    "Nội dung câu hỏi:",
    input.questionText ?? "(trống)",
    "",
    input.passageText ? `Passage/đoạn văn:\n${input.passageText}\n` : "",
    input.transcript ? `Transcript:\n${input.transcript}\n` : "",
    "Các lựa chọn:",
    optionsText,
    "",
    "Yêu cầu đầu ra:",
    "- Chỉ trả về 1 đoạn văn ngắn, không markdown, không tiêu đề.",
    "- Nêu vì sao đáp án đúng là đúng.",
    "- Nếu người dùng chọn sai, thêm 1 câu rất ngắn nói vì sao đáp án đã chọn sai.",
    "- Độ dài khoảng 2-4 câu.",
  ]
    .filter(Boolean)
    .join("\n");
};

export const isGeminiConfigured = Boolean(apiKey);

export const generateReadingExplanation = async (input: ReadingExplanationInput) => {
  if (!gemini) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const imageParts = await Promise.all(
    input.imageUrls.slice(0, MAX_IMAGE_COUNT).map((imageUrl) => fetchImageAsInlinePart(imageUrl)),
  );

  const contents = [
    ...imageParts.filter((part): part is GeminiImagePart => Boolean(part)),
    {
      text: buildPrompt(input),
    },
  ];

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents,
  });

  const text = response.text?.trim();
  if (!text) {
    return null;
  }

  return normalizeResponseText(text);
};
