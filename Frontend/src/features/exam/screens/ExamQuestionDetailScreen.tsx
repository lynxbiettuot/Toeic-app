import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { API_BASE_URL } from "../../../config/api";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";
import { authFetch } from "../../../shared/api/authFetch";

export function ExamQuestionDetailScreen({ navigation, route }: any) {
  const { examId, sessionId, questionId, partNumber } = route.params;
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const currentAudioUrlRef = useRef<string | null>(null);

  const splitPipeSeparatedImages = (value: string | null | undefined) =>
    (value ?? "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);

  useEffect(() => {
    if (!examId || !sessionId || !questionId) {
      console.warn("Thiếu tham số: ", { examId, sessionId, questionId });
      setLoading(false);
      return;
    }

    authFetch(`${API_BASE_URL}/exams/${examId}/sessions/${sessionId}/questions/${questionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.statusCode === 200) {
          setDetail(data.data);
        }
      })
      .catch((err) => console.error("Lỗi khi tải chi tiết câu hỏi:", err))
      .finally(() => setLoading(false));
  }, [examId, sessionId, questionId]);

  const audioUrl = detail?.question?.media?.audio_url || detail?.question?.audio_url || null;

  useEffect(() => {
    let isMounted = true;

    const loadAudio = async () => {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      setIsPlaying(false);
      setPositionMillis(0);
      setDurationMillis(0);

      if (!audioUrl) {
        return;
      }

      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false, progressUpdateIntervalMillis: 500 },
          (status: any) => {
            if (status.isLoaded) {
              setPositionMillis(status.positionMillis || 0);
              setDurationMillis(status.durationMillis || 0);
              setIsPlaying(status.isPlaying);
            }
          },
        );

        if (isMounted) {
          setSound(newSound);
        } else {
          await newSound.unloadAsync();
        }
      } catch (error) {
        console.error("Error loading question audio", error);
      }
    };

    if (audioUrl !== currentAudioUrlRef.current) {
      currentAudioUrlRef.current = audioUrl;
      loadAudio();
    }

    return () => {
      isMounted = false;
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePlayPause = async () => {
    if (!sound) {
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleSeek = async (value: number) => {
    if (!sound) {
      return;
    }

    await sound.setPositionAsync(value);
    setPositionMillis(value);
  };

  const formatAudioTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={AUTH_ACTION_COLOR} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color="#999" />
        <Text style={{ marginTop: 12, color: "#666", fontSize: 16 }}>
          Không tìm thấy dữ liệu câu hỏi.
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 24, padding: 12, backgroundColor: AUTH_ACTION_COLOR, borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const question = detail.question;
  const media = detail.question.media || {};
  const questionImages = Array.isArray(question.image_urls)
    ? question.image_urls.slice(0, 3)
    : splitPipeSeparatedImages(question.image_url || media.image_url);
  
  const transcript = question.transcript || media.transcript;
  const passageText = media.passage_text;
  
  const aiExplanation =
    detail.ai_explanation
    || question.ai_explanation
    || question.explanation
    || null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Câu {question.question_number}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metaCard}>
          <Text style={styles.metaText}>Part {partNumber ?? question.part_number}</Text>
          <Text style={styles.metaText}>
            {question.is_correct === true
              ? "Đã làm đúng"
              : question.is_correct === false
                ? "Đã làm sai"
                : "Chưa làm"}
          </Text>
        </View>

        {question.content ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Tên câu</Text>
            <Text style={styles.questionText}>{question.content}</Text>
          </View>
        ) : null}

        {questionImages.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Ảnh</Text>
            <View style={styles.imageStack}>
              {questionImages.map((imageUrl: string, index: number) => (
                <Image
                  key={`${imageUrl}-${index}`}
                  source={{ uri: imageUrl }}
                  style={styles.image}
                  resizeMode="contain"
                />
              ))}
            </View>
          </View>
        ) : null}

        {passageText ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Đoạn văn (Passage)</Text>
            <Text style={styles.transcriptText}>{passageText}</Text>
          </View>
        ) : null}

        {audioUrl ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Audio</Text>
            <View style={styles.audioRow}>
              <TouchableOpacity onPress={handlePlayPause}>
                <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={36} color={AUTH_ACTION_COLOR} />
              </TouchableOpacity>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={durationMillis > 0 ? durationMillis : 100}
                value={durationMillis > 0 ? positionMillis : 0}
                onSlidingComplete={handleSeek}
                minimumTrackTintColor={AUTH_ACTION_COLOR}
                maximumTrackTintColor="#d3d3d3"
                thumbTintColor={AUTH_ACTION_COLOR}
              />
              <Text style={styles.audioTime}>
                {formatAudioTime(positionMillis)} / {formatAudioTime(durationMillis)}
              </Text>
            </View>
          </View>
        ) : null}

        {transcript ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Transcript</Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Đáp án</Text>
          <View style={{ gap: 12 }}>
            {question.answers?.map((ans: any) => {
              const isCorrect = ans.option_label === question.correct_answer;
              const isSelected = ans.option_label === question.selected_option;

              return (
                <View
                  key={ans.id}
                  style={[
                    styles.answerRow,
                    isCorrect && styles.answerCorrect,
                    isSelected && !isCorrect && styles.answerWrong,
                    isSelected && isCorrect && styles.answerSelectedCorrect,
                  ]}
                >
                  <Text style={styles.answerLabel}>
                    {ans.option_label}. {isSelected ? "(Bạn chọn)" : ""}
                  </Text>
                  <Text style={styles.answerText}>{ans.content}</Text>
                  {isCorrect ? <Ionicons name="checkmark-circle" size={18} color="#1e8e3e" /> : null}
                  {isSelected && !isCorrect ? <Ionicons name="close-circle" size={18} color="#d93025" /> : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Giải thích</Text>
          <View style={styles.blankBox}>
            {aiExplanation ? (
              <Text style={styles.explanationText}>{aiExplanation}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Đáp án đúng</Text>
          <Text style={styles.highlightText}>{question.correct_answer}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Đáp án đã chọn</Text>
          <Text style={styles.highlightText}>
            {question.selected_option || "Chưa làm"}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7f7",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
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
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  metaCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d7d7d7",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d7d7d7",
    gap: 10,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  questionText: {
    fontSize: 16,
    lineHeight: 23,
    color: "#222",
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  imageStack: {
    gap: 12,
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  audioTime: {
    fontSize: 13,
    color: "#666",
    minWidth: 80,
    textAlign: "right",
    fontFamily: "monospace",
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
  },
  answerRow: {
    borderWidth: 1,
    borderColor: "#dcdcdc",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    backgroundColor: "#fafafa",
  },
  answerCorrect: {
    borderColor: "#1e8e3e",
    backgroundColor: "#eaf7ee",
  },
  answerWrong: {
    borderColor: "#d93025",
    backgroundColor: "#fdeeee",
  },
  answerSelectedCorrect: {
    borderColor: "#1e8e3e",
    backgroundColor: "#dff4e4",
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  answerText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  blankBox: {
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
  },
  highlightText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },
});
