import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";

export function ExamSessionPartsScreen({ navigation, route }: any) {
  const { examId, sessionId, partStats: initialPartStats = [] } = route.params;
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState<any[]>(initialPartStats);

  useEffect(() => {
    if (!examId || !sessionId) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/exams/${examId}/sessions/${sessionId}/parts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.statusCode === 200 && Array.isArray(data.data?.parts)) {
          setParts(data.data.parts);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [examId, sessionId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kết quả từng part</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={AUTH_ACTION_COLOR} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {parts.map((part) => (
            <TouchableOpacity
              key={part.part_number}
              style={styles.partCard}
              onPress={() =>
                navigation.navigate("ExamSessionPartQuestionsScreen", {
                  examId,
                  sessionId,
                  partNumber: part.part_number,
                  partTitle: part.title,
                })
              }
            >
              <View style={styles.partRow}>
                <Text style={styles.partTitle}>{part.title}</Text>
                <Ionicons name="chevron-forward" size={20} color="#444" />
              </View>
              <Text style={styles.partMeta}>
                Đúng {part.correct_count} / {part.total_questions} - Sai {part.wrong_count}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("ExamResultScreen")}>
        <Text style={styles.backButtonText}>Trở về</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7f7",
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  list: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  partCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d7d7d7",
  },
  partRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  partTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  partMeta: {
    fontSize: 14,
    color: "#555",
  },
  backButton: {
    margin: 16,
    marginTop: 0,
    backgroundColor: "#e6e6e6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "#222",
    fontSize: 16,
    fontWeight: "700",
  },
});
