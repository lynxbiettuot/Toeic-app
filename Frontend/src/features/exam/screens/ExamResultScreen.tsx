import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { API_BASE_URL } from "../../../config/api";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";

export function ExamResultScreen({ navigation, route }: any) {
  const { result, examId, sessionId } = route.params;
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId || !sessionId) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/exams/${examId}/sessions/${sessionId}/summary`)
      .then((res) => res.json())
      .then((data) => {
        if (data.statusCode === 200) {
          setSummary(data.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [examId, sessionId]);

  const totalQuestions = summary?.total_questions ?? 0;
  const correctCount = summary?.correct_count ?? 0;
  const wrongCount = summary?.wrong_count ?? Math.max(totalQuestions - correctCount, 0);
  const answeredCount = summary?.answered_count ?? 0;
  const partStats = summary?.part_stats ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kết quả bài thi</Text>

      <View style={styles.scoreBoard}>
        <View style={styles.scoreRow}>
          <Text style={styles.label}>Điểm Nghe (Listening):</Text>
          <Text style={styles.score}>{result.listening_score}</Text>
        </View>
        <View style={styles.scoreRow}>
          <Text style={styles.label}>Điểm Đọc (Reading):</Text>
          <Text style={styles.score}>{result.reading_score}</Text>
        </View>
        <View style={[styles.scoreRow, styles.totalRow]}>
          <Text style={styles.labelTotal}>Tổng điểm:</Text>
          <Text style={styles.scoreTotal}>{result.total_score}</Text>
        </View>
      </View>

      <View style={styles.statBoard}>
        {loading ? (
          <ActivityIndicator size="small" color={AUTH_ACTION_COLOR} />
        ) : (
          <>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Số câu đúng</Text>
              <Text style={styles.statValue}>{correctCount}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Số câu sai</Text>
              <Text style={styles.statValue}>{wrongCount}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Đã làm</Text>
              <Text style={styles.statValue}>
                {answeredCount} / {totalQuestions}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() =>
            navigation.navigate("ExamSessionPartsScreen", {
              examId,
              sessionId,
              partStats,
            })
          }
        >
          <Text style={styles.secondaryButtonText}>Chi tiết</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("ExamListScreen")}
        >
          <Text style={styles.buttonText}>Về danh sách đề thi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7f7",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 24,
  },
  scoreBoard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e1e1e1",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  label: {
    fontSize: 16,
    color: "#666",
  },
  score: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  labelTotal: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
  },
  scoreTotal: {
    fontSize: 28,
    fontWeight: "bold",
    color: AUTH_ACTION_COLOR,
  },
  statBoard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e1e1e1",
    marginBottom: 24,
    gap: 12,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 16,
    color: "#666",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  button: {
    backgroundColor: AUTH_ACTION_COLOR,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "#e6e6e6",
  },
  secondaryButtonText: {
    color: "#222",
    fontSize: 16,
    fontWeight: "bold",
  },
});
