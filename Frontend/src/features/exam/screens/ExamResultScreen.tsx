import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";

export function ExamResultScreen({ navigation, route }: any) {
  const { result } = route.params;

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

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("ExamListScreen")}
      >
        <Text style={styles.buttonText}>Về danh sách đề thi</Text>
      </TouchableOpacity>
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
    marginBottom: 32,
  },
  scoreBoard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e1e1e1",
    marginBottom: 32,
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
});
