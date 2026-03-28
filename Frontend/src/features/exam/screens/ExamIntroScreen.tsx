import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";

const MOCK_USER_ID = 1;

export function ExamIntroScreen({ navigation, route }: any) {
  const { examId, completed: initCompleted, sessionId: initSessionId } = route.params;
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/exams/${examId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.statusCode === 200) {
          setExam(data.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [examId]);

  const handleStartExam = async () => {
    setStarting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/exams/${examId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: MOCK_USER_ID }),
      });
      const data = await res.json();

      if (data.statusCode === 201) {
        navigation.replace("ExamTestScreen", {
          examId,
          sessionId: data.data.sessionId,
          duration: exam.duration_minutes,
        });
      } else {
        Alert.alert("Lỗi", "Không thể bắt đầu phiên thi.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Lỗi kết nối mạng.");
    } finally {
      setStarting(false);
    }
  };

  const handleRetakeExam = () => {
    Alert.alert(
      "Làm lại",
      "Bạn muốn làm lại đề này? Một phiên thi mới sẽ được tạo.",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Làm lại", onPress: handleStartExam },
      ]
    );
  };

  const handleViewResult = () => {
    if (!initSessionId) return;
    navigation.navigate("ExamResultScreen", {
      examId,
      sessionId: initSessionId,
      fromHistory: true,
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={AUTH_ACTION_COLOR} />
      </View>
    );
  }

  if (!exam) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Không tìm thấy đề thi.</Text>
      </View>
    );
  }

  const isCompleted = !!initCompleted && !!initSessionId;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin đề thi</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Completed badge */}
        {isCompleted && (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
            <Text style={styles.completedBannerText}>Bạn đã hoàn thành đề thi này</Text>
          </View>
        )}

        <Text style={styles.title}>{exam.title}</Text>

        {/* Info box */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Số câu: {exam.total_questions}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Thời gian: {exam.duration_minutes} phút</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Năm xuất bản: {exam.year || "-"}</Text>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Action buttons */}
        {isCompleted ? (
          <>
            {/* View result */}
            <TouchableOpacity
              style={[styles.button, styles.resultBtn]}
              onPress={handleViewResult}
            >
              <Ionicons name="bar-chart-outline" size={20} color={AUTH_ACTION_COLOR} />
              <Text style={styles.resultBtnText}>Xem chi tiết kết quả</Text>
            </TouchableOpacity>

            {/* Retake */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleRetakeExam}
              disabled={starting}
            >
              {starting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Làm lại</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* Start exam (first time) */
          <TouchableOpacity
            style={styles.button}
            onPress={handleStartExam}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Bắt đầu làm bài</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7f7" },
  center: { justifyContent: "center", alignItems: "center" },
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
  content: {
    padding: 24,
    flexGrow: 1,
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eafaf1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#a9dfbf",
  },
  completedBannerText: {
    color: "#27ae60",
    fontWeight: "600",
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
    color: "#111",
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#333",
  },
  spacer: {
    height: 32,
  },
  button: {
    backgroundColor: AUTH_ACTION_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  resultBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: AUTH_ACTION_COLOR,
  },
  resultBtnText: {
    color: AUTH_ACTION_COLOR,
    fontSize: 16,
    fontWeight: "700",
  },
});
