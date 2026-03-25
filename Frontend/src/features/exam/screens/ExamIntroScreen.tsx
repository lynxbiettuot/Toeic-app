import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";

export function ExamIntroScreen({ navigation, route }: any) {
  const { examId } = route.params;
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: 1 }) // Mock user id
      });
      const data = await res.json();
      
      if (data.statusCode === 201) {
        navigation.replace('ExamTestScreen', {
          examId,
          sessionId: data.data.sessionId,
          duration: exam.duration_minutes
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin đề thi</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{exam.title}</Text>
        
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

        <TouchableOpacity 
          style={[styles.button, styles.downloadBtn]}
          onPress={() => Alert.alert("Tải tài nguyên", "Tính năng tải file audio chuẩn bị... (Sẽ làm thật ở version sau)")}
        >
          <Ionicons name="cloud-download-outline" size={20} color="#333" />
          <Text style={styles.downloadText}>Tải tài nguyên (Audio)</Text>
        </TouchableOpacity>

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
      </View>
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
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
    color: "#111"
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    gap: 16
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  infoText: {
    fontSize: 16,
    color: "#333"
  },
  spacer: {
    flex: 1,
  },
  button: {
    backgroundColor: AUTH_ACTION_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  downloadBtn: {
    backgroundColor: "#e0e4e7"
  },
  downloadText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600"
  }
});
