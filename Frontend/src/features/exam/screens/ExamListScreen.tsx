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
};

export function ExamListScreen({ navigation, onBack }: { navigation?: any, onBack: () => void }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    // Lưu ý: đổi đường dẫn này thành đường dẫn bạn đang dùng, ví dụ: `/admin/exams` hoặc `/user/exams`
    fetch(`${API_BASE_URL}/admin/exams`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data)) {
          setExams(data.data);

          // Trích xuất các năm hợp lệ (kiểu number) và loại bỏ trùng lặp
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
  }, []);

  // Lấy danh sách các năm để hiển thị trên thanh chọn (Sắp xếp giảm dần)
  const availableYears = Array.from(
    new Set(
      exams
        .map((e) => e.year)
        .filter((y): y is number => typeof y === "number"),
    ),
  ).sort((a, b) => b - a);

  // Lọc đề thi theo năm đã chọn
  const filteredExams = selectedYear
    ? exams.filter((e) => e.year === selectedYear)
    : exams;

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
              style={styles.examCard}
              onPress={() => {
                if (navigation) {
                  navigation.navigate('ExamIntroScreen', { examId: item.id });
                }
              }}
            >
              <Text style={styles.examTitle}>{item.title}</Text>
              <Text style={styles.examInfo}>
                {item.total_questions} câu • {item.duration_minutes || 120} phút
              </Text>
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
    backgroundColor: AUTH_ACTION_COLOR, // Đổi màu active thành màu chuẩn của app
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
  examTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  examInfo: { fontSize: 13, color: "#666" },
});
