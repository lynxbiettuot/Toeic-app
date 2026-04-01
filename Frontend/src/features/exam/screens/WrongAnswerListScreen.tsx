import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";
import { authFetch } from "../../../shared/api/authFetch";

type WrongQuestion = {
  question_id: number;
  question_number: number;
  part_number: number;
  content: string | null;
  selected_option: string | null;
};

export function WrongAnswerListScreen({ navigation, route }: any) {
  const { examId, examTitle, sessionId, wrongQuestions: initialWrongQuestions = [], userId } = route.params;
  const [retaking, setRetaking] = useState(false);
  const [localWrongQuestions, setLocalWrongQuestions] = useState<WrongQuestion[]>(initialWrongQuestions);
  const [localSessionId, setLocalSessionId] = useState<number | undefined>(sessionId);
  const [loading, setLoading] = useState(false);

  // Tải dữ liệu mới nhất từ server
  const fetchLatestData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/exams/wrong-answers`);
      const data = await res.json();
      if (data.statusCode === 200 && Array.isArray(data.data)) {
        // Tìm đúng bộ đề hiện tại trong danh sách lịch sử sai sót
        const currentGroup = data.data.find((g: any) => g.exam_id === examId);
        if (currentGroup) {
          setLocalWrongQuestions(currentGroup.wrong_questions || []);
          if (currentGroup.session_id) {
            setLocalSessionId(currentGroup.session_id);
          }
        } else {
          // Nếu không tìm thấy (có thể đã làm đúng hết), set về rỗng
          setLocalWrongQuestions([]);
        }
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật danh sách câu sai:", err);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  // Làm mới mỗi khi màn hình này được hiển thị (Mount)
  useEffect(() => {
    fetchLatestData();
  }, [fetchLatestData]);

  const handleRetakeWrong = async () => {
    if (localWrongQuestions.length === 0) return;
    
    Alert.alert(
      "Làm lại câu sai",
      `Bạn muốn làm lại ${localWrongQuestions.length} câu sai của đề này?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Bắt đầu",
          onPress: async () => {
            setRetaking(true);
            try {
              const res = await authFetch(
                `${API_BASE_URL}/exams/${examId}/sessions`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({}),
                }
              );
              const data = await res.json();
              if (data.statusCode === 201) {
                navigation.navigate("ExamTestScreen", {
                  examId,
                  sessionId: data.data.sessionId,
                  duration: 0,
                  questionFilter: localWrongQuestions.map((q: any) => q.question_id),
                  isPractice: true,
                });
              } else {
                Alert.alert("Lỗi", "Không thể tạo phiên thi mới.");
              }
            } catch (e) {
              Alert.alert("Lỗi", "Lỗi kết nối mạng.");
            } finally {
              setRetaking(false);
            }
          },
        },
      ]
    );
  };

  const handleViewQuestion = (q: WrongQuestion) => {
    navigation.navigate("ExamQuestionDetailScreen", {
      examId,
      sessionId: localSessionId,
      questionId: q.question_id,
      partNumber: q.part_number,
    });
  };

  // Group wrong questions by part
  const partMap = new Map<number, WrongQuestion[]>();
  for (const q of localWrongQuestions) {
    const existing = partMap.get(q.part_number) ?? [];
    existing.push(q);
    partMap.set(q.part_number, existing);
  }
  const parts = Array.from(partMap.entries()).sort(([a], [b]) => a - b);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Câu sai
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Exam name */}
      <View style={styles.examBar}>
        <Text style={styles.examBarText} numberOfLines={1}>
          {examTitle}
        </Text>
        <View style={styles.wrongCountBadge}>
          <Text style={styles.wrongCountText}>{localWrongQuestions.length} câu sai</Text>
        </View>
      </View>

      <FlatList
        data={parts}
        keyExtractor={([partNumber]) => String(partNumber)}
        contentContainerStyle={styles.list}
        renderItem={({ item: [partNumber, questions] }) => (
          <View style={styles.partSection}>
            {/* Part header */}
            <View style={styles.partHeader}>
              <Text style={styles.partTitle}>Part {partNumber}</Text>
              <Text style={styles.partCount}>{questions.length} câu sai</Text>
            </View>

            {/* Questions in this part */}
            {questions.map((q) => (
              <TouchableOpacity
                key={q.question_id}
                style={styles.questionCard}
                onPress={() => handleViewQuestion(q)}
              >
                <View style={styles.questionRow}>
                  <View style={styles.questionLeft}>
                    <View style={styles.questionNumBadge}>
                      <Text style={styles.questionNumText}>{q.question_number}</Text>
                    </View>
                    <View style={styles.questionInfo}>
                      <Text style={styles.questionLabel}>Câu {q.question_number}</Text>
                      {q.content ? (
                        <Text style={styles.questionContent} numberOfLines={2}>
                          {q.content}
                        </Text>
                      ) : (
                        <Text style={styles.questionContentAudio}>
                          (Câu hỏi audio)
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.questionRight}>
                    {q.selected_option && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedLabel}>Chọn: {q.selected_option}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color="#aaa" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      {/* Nút làm lại câu sai */}
      <TouchableOpacity
        style={[styles.retakeBtn, retaking && styles.retakeBtnDisabled]}
        onPress={handleRetakeWrong}
        disabled={retaking}
      >
        {retaking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.retakeBtnText}>
              Làm lại {localWrongQuestions.length} câu sai
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7f7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },

  examBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 10,
  },
  examBarText: {
    fontSize: 14,
    color: "#444",
    fontWeight: "500",
    flex: 1,
  },
  wrongCountBadge: {
    backgroundColor: "#fdecea",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  wrongCountText: {
    color: "#e74c3c",
    fontSize: 12,
    fontWeight: "700",
  },

  list: { padding: 16, gap: 16, paddingBottom: 32 },

  partSection: { gap: 10 },
  partHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  partTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: AUTH_ACTION_COLOR,
  },
  partCount: {
    fontSize: 13,
    color: "#e74c3c",
    fontWeight: "600",
  },

  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f0c2c2",
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  questionLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  questionNumBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fdecea",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  questionNumText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#e74c3c",
  },
  questionInfo: { flex: 1, gap: 4 },
  questionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  questionContent: {
    fontSize: 13,
    color: "#555",
    lineHeight: 19,
  },
  questionContentAudio: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
  },
  questionRight: {
    alignItems: "center",
    gap: 6,
  },
  selectedBadge: {
    backgroundColor: "#fdecea",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedLabel: {
    fontSize: 11,
    color: "#e74c3c",
    fontWeight: "700",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    margin: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#e74c3c",
  },
  retakeBtnDisabled: {
    opacity: 0.6,
  },
  retakeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
