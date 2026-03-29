import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";
import { API_BASE_URL } from "../../../config/api";

type Exam = {
  id: number;
  title: string;
  total_questions: number;
  duration_minutes: number;
  year?: number;
  completed?: boolean;
  best_score?: number | null;
  latest_session_id?: number | null;
};

export function ExamListScreen({
  navigation,
  onBack,
  route,
}: {
  navigation?: any;
  onBack: () => void;
  route?: any;
}) {
  const userId = route?.params?.userId ?? 1;
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const fetchExams = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/exams?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data)) {
          setExams(data.data);

          const validYears: number[] = data.data
            .map((e: Exam) => e.year)
            .filter((y): y is number => typeof y === "number");

          const uniqueYears = Array.from(new Set(validYears));

          if (uniqueYears.length > 0) {
            setSelectedYear(Math.max(...uniqueYears));
          }
        }
      })
      .catch((err) => console.error("Lỗi tải đề thi:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Reload khi màn hình được focus trở lại (sau khi làm bài xong)
  useEffect(() => {
    if (!navigation || typeof navigation.addListener !== "function") return;
    const unsubscribe = navigation.addListener("focus", fetchExams);
    return unsubscribe;
  }, [navigation]);

  const availableYears = Array.from(
    new Set(
      exams
        .map((e) => e.year)
        .filter((y): y is number => typeof y === "number"),
    ),
  ).sort((a, b) => b - a);

  const filteredExams = selectedYear
    ? exams.filter((e) => e.year === selectedYear)
    : exams;

  const handleExamPress = (item: Exam) => {
    if (!navigation) return;
    if (item.completed && item.latest_session_id) {
      navigation.navigate("ExamIntroScreen", {
        examId: item.id,
        completed: true,
        sessionId: item.latest_session_id,
      });
    } else {
      navigation.navigate("ExamIntroScreen", {
        examId: item.id,
        completed: false,
        sessionId: null,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn đề thi thử</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Thanh chọn năm */}
      {availableYears.length > 0 && (
        <View style={styles.yearBar}>
          {availableYears.map((year) => (
            <TouchableOpacity
              key={year}
              style={[
                styles.yearButton,
                selectedYear === year && styles.yearButtonActive,
              ]}
              onPress={() => setSelectedYear(year)}
            >
              <Text
                style={[
                  styles.yearText,
                  selectedYear === year && styles.yearTextActive,
                ]}
              >
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={AUTH_ACTION_COLOR}
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={filteredExams}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.examCard, item.completed && styles.examCardDone]}
              onPress={() => handleExamPress(item)}
            >
              <View style={styles.examCardTop}>
                <Text style={styles.examTitle}>{item.title}</Text>
                {item.completed && (
                  <View style={styles.doneBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    <Text style={styles.doneBadgeText}>Đã làm</Text>
                  </View>
                )}
              </View>

              <Text style={styles.examInfo}>
                {item.total_questions} câu • {item.duration_minutes || 120} phút
              </Text>

              {item.completed && item.best_score !== null && item.best_score !== undefined && (
                <View style={styles.scoreRow}>
                  <Ionicons name="trophy-outline" size={14} color={AUTH_ACTION_COLOR} />
                  <Text style={styles.scoreText}>Điểm cao nhất: {item.best_score}</Text>
                </View>
              )}

              {item.completed && (
                <View style={styles.actionHint}>
                  <Ionicons name="eye-outline" size={13} color="#888" />
                  <Text style={styles.actionHintText}>Nhấn để xem kết quả hoặc làm lại</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
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
  headerTitle: { fontSize: 18, fontWeight: "700" },
  yearBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  yearButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: "#f0f0f0",
  },
  yearButtonActive: {
    backgroundColor: AUTH_ACTION_COLOR,
  },
  yearText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  yearTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  list: { padding: 16 },
  examCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  examCardDone: {
    borderColor: AUTH_ACTION_COLOR,
    borderWidth: 1.5,
    backgroundColor: "#f0f8ff",
  },
  examCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    flex: 1,
    marginRight: 8,
  },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#27ae60",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  doneBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  examInfo: { fontSize: 13, color: "#666", marginBottom: 6 },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  scoreText: {
    fontSize: 13,
    color: AUTH_ACTION_COLOR,
    fontWeight: "600",
  },
  actionHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  actionHintText: {
    fontSize: 11,
    color: "#888",
    fontStyle: "italic",
  },
  wrongHistoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f5c6cb",
  },
  wrongHistoryBtnText: {
    flex: 1,
    fontSize: 15,
    color: "#e74c3c",
    fontWeight: "700",
  },
});
