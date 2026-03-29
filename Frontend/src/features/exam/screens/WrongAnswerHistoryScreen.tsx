import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";
import { authFetch } from "../../../shared/api/authFetch";
import { BottomNavbar, NavScreen } from "../../../shared/components/BottomNavbar";

type WrongExamGroup = {
  exam_id: number;
  exam_title: string;
  exam_year: number | null;
  session_id: number;
  total_score: number | null;
  wrong_count: number;
  wrong_questions: {
    question_id: number;
    question_number: number;
    part_number: number;
    content: string | null;
    selected_option: string | null;
  }[];
};

export function WrongAnswerHistoryScreen({
  navigation,
  onBack,
  route,
  onNavigate,
  onLogout,
}: {
  navigation?: any;
  onBack?: () => void;
  route?: any;
  onNavigate: (screen: NavScreen) => void;
  onLogout: () => void;
}) {
  const userId = route?.params?.userId ?? 1;
  const [groups, setGroups] = useState<WrongExamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE_URL}/exams/wrong-answers`)
      .then((res) => res.json())
      .then((data) => {
        if (data.statusCode === 200 && Array.isArray(data.data)) {
          setGroups(data.data);

          // Tự động chọn năm mới nhất
          const years: number[] = data.data
            .map((g: WrongExamGroup) => g.exam_year)
            .filter((y: any): y is number => typeof y === "number");
          const unique = Array.from(new Set(years));
          if (unique.length > 0) {
            setSelectedYear(Math.max(...unique));
          }
        }
      })
      .catch((err) => console.error("Lỗi tải lịch sử sai sót:", err))
      .finally(() => setLoading(false));
  }, []);

  const availableYears = Array.from(
    new Set(
      groups
        .map((g) => g.exam_year)
        .filter((y): y is number => typeof y === "number"),
    ),
  ).sort((a, b) => b - a);

  const filteredGroups = selectedYear
    ? groups.filter((g) => g.exam_year === selectedYear)
    : groups;

  const handleViewExamWrong = (group: WrongExamGroup) => {
    if (!navigation) return;
    navigation.navigate("WrongAnswerListScreen", {
      examId: group.exam_id,
      examTitle: group.exam_title,
      sessionId: group.session_id,
      wrongQuestions: group.wrong_questions,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack() ?? onBack?.()}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lịch sử sai sót</Text>
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
          style={{ marginTop: 40 }}
        />
      ) : filteredGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#27ae60" />
          <Text style={styles.emptyTitle}>Không có câu sai!</Text>
          <Text style={styles.emptySubtitle}>
            {groups.length === 0
              ? "Bạn chưa có lịch sử sai sót. Hãy làm thử một đề thi để bắt đầu."
              : "Không có đề nào có câu sai trong năm này."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.exam_id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.examCard}
              onPress={() => handleViewExamWrong(item)}
            >
              <View style={styles.examCardTop}>
                <Text style={styles.examTitle} numberOfLines={2}>
                  {item.exam_title}
                </Text>
                <View style={styles.wrongBadge}>
                  <Ionicons name="close-circle" size={13} color="#fff" />
                  <Text style={styles.wrongBadgeText}>{item.wrong_count} sai</Text>
                </View>
              </View>

              <View style={styles.actionHint}>
                <Ionicons name="refresh-outline" size={13} color="#888" />
                <Text style={styles.actionHintText}>
                  Nhấn để xem câu sai và làm lại
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      <BottomNavbar 
        activeScreen="home" 
        onNavigate={onNavigate} 
        onLogout={onLogout} 
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  safeArea: { flex: 1, backgroundColor: AUTH_ACTION_COLOR },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: AUTH_ACTION_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },

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
    backgroundColor: "#e74c3c",
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
    borderWidth: 1.5,
    borderColor: "#f5c6cb",
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  examCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 10,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    flex: 1,
  },
  wrongBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e74c3c",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  wrongBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  actionHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionHintText: {
    fontSize: 11,
    color: "#888",
    fontStyle: "italic",
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});
