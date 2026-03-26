import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";

export function ExamSessionPartQuestionsScreen({ navigation, route }: any) {
  const { examId, sessionId, partNumber, partTitle } = route.params;
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (!examId || !sessionId || !partNumber) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/exams/${examId}/sessions/${sessionId}/parts/${partNumber}/questions`)
      .then((res) => res.json())
      .then((data) => {
        if (data.statusCode === 200 && Array.isArray(data.data?.questions)) {
          setQuestions(data.data.questions);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [examId, sessionId, partNumber]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{partTitle || `Part ${partNumber}`}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={AUTH_ACTION_COLOR} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {questions.map((question) => {
            const statusIcon = question.is_correct === true
              ? "checkmark-circle"
              : question.is_correct === false
                ? "close-circle"
                : "ellipse-outline";

            const statusColor = question.is_correct === true
              ? "#1e8e3e"
              : question.is_correct === false
                ? "#d93025"
                : "#888";

            return (
              <TouchableOpacity
                key={question.id}
                style={styles.questionCard}
                onPress={() =>
                  navigation.navigate("ExamQuestionDetailScreen", {
                    examId,
                    sessionId,
                    questionId: question.id,
                    partNumber,
                  })
                }
              >
                <View style={styles.questionRow}>
                  <Text style={styles.questionTitle}>Câu {question.question_number}</Text>
                  <Ionicons name={statusIcon as any} size={20} color={statusColor} />
                </View>
                <Text style={styles.questionMeta}>
                  {question.is_correct === true
                    ? "Đã làm đúng"
                    : question.is_correct === false
                      ? "Đã làm sai"
                      : "Chưa làm"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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
    gap: 12,
    paddingBottom: 32,
  },
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d7d7d7",
  },
  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  questionMeta: {
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
