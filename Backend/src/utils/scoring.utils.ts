/**
 * Xác định xem câu hỏi có thuộc phần Reading (Part 5-7) hay không dựa trên số câu hỏi và part.
 */
export const isReadingQuestion = (question: { question_number: number; part_number: number }) =>
  (question.question_number >= 101 && question.question_number <= 200) || question.part_number >= 5;

/**
 * Tính điểm phần Reading dựa trên số câu đúng.
 */
export const calculateReadingScore = (correctCount: number) =>
  correctCount <= 1 ? 5 : correctCount * 5 - 5;

/**
 * Tính điểm phần Listening dựa trên số câu đúng. Thang điểm này được lấy từ logic trong controller gốc.
 */
export const calculateListeningScore = (correctCount: number) => {
  if (correctCount === 0) {
    return 5;
  }

  if (correctCount <= 75) {
    return correctCount * 5 + 10;
  }

  if (correctCount <= 96) {
    return correctCount * 5 + 15;
  }

  return 495;
};

/**
 * Tính tổng điểm TOEIC dựa trên số câu đúng của 2 phần.
 */
export const calculateToeicScore = (readingCorrectCount: number, listeningCorrectCount: number) => {
  return {
    reading_score: calculateReadingScore(readingCorrectCount),
    listening_score: calculateListeningScore(listeningCorrectCount),
    total_score: calculateReadingScore(readingCorrectCount) + calculateListeningScore(listeningCorrectCount),
  };
};
