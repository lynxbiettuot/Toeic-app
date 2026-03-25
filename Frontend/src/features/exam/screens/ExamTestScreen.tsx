import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import { API_BASE_URL } from "../../../config/api";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";

export function ExamTestScreen({ navigation, route }: any) {
  const { examId, sessionId, duration } = route.params;
  const [questions, setQuestions] = useState<any[]>([]);
  const [pages, setPages] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const timerRef = useRef<any>(null);

  // User answers { [question_id]: selected_option }
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  // Current active page (a page contains 1 or more questions belonging to the same group)
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  
  // Review Modal state
  const [showReview, setShowReview] = useState(false);

  // Audio State
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const currentAudioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/exams/${examId}/questions`)
      .then((res) => res.json())
      .then((data) => {
        if (data.statusCode === 200 && data.data?.questions) {
          setQuestions(data.data.questions);

          // Build pages correctly
          const groupedPages: any[][] = [];
          let currentGroup: any[] = [];
          
          data.data.questions.forEach((q: any) => {
            if (currentGroup.length === 0) {
              currentGroup.push(q);
            } else {
              const lastQ = currentGroup[0];
              // Group together if they share the same group_id
              if (q.group_id && q.group_id === lastQ.group_id) {
                currentGroup.push(q);
              } else {
                groupedPages.push(currentGroup);
                currentGroup = [q];
              }
            }
          });
          if (currentGroup.length > 0) {
            groupedPages.push(currentGroup);
          }

          setPages(groupedPages);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [examId]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleTimeUp = () => {
    Alert.alert("Hết giờ", "Thời gian làm bài đã kết thúc! Hệ thống sẽ nộp bài tự động.", [
      { text: "OK", onPress: submitExam }
    ]);
  };

  const currentPage = pages[currentPageIndex] || [];
  const firstQ = currentPage[0];
  const nextAudioUrl = firstQ?.group?.audio_url || firstQ?.audio_url || null;

  useEffect(() => {
    let isMounted = true;

    const loadNewAudio = async () => {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      setIsPlaying(false);
      setPositionMillis(0);
      setDurationMillis(0);

      if (nextAudioUrl) {
        try {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: nextAudioUrl },
            { shouldPlay: false, progressUpdateIntervalMillis: 500 },
            (status: any) => {
              if (status.isLoaded) {
                setPositionMillis(status.positionMillis || 0);
                setDurationMillis(status.durationMillis || 0);
                setIsPlaying(status.isPlaying);
              }
            }
          );
          if (isMounted) {
            setSound(newSound);
          } else {
            newSound.unloadAsync();
          }
        } catch (error) {
          console.error("Error loading audio", error);
        }
      }
    };

    if (nextAudioUrl !== currentAudioUrlRef.current) {
      currentAudioUrlRef.current = nextAudioUrl;
      loadNewAudio();
    }

    return () => {
      isMounted = false;
    };
  }, [nextAudioUrl]); // Only re-run if URL changes

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePlayPause = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleSeek = async (value: number) => {
    if (sound) {
      await sound.setPositionAsync(value);
      setPositionMillis(value); // Optimistic UI update
    }
  };

  const handleSelectAnswer = (questionId: number, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const submitExam = async () => {
    setSubmitting(true);
    setShowReview(false);
    if (sound) {
      await sound.stopAsync();
    }
    
    // Format answers
    const payload = Object.keys(answers).map(qId => ({
      question_id: parseInt(qId),
      selected_option: answers[parseInt(qId)]
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/exams/${examId}/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: payload })
      });
      const data = await res.json();
      
      if (data.statusCode === 200) {
        navigation.replace('ExamResultScreen', { result: data.data });
      } else {
        Alert.alert("Lỗi", "Không thể nộp bài.");
        setSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Lỗi kết nối mạng.");
      setSubmitting(false);
    }
  };

  const handleAttemptSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = questions.length;
    const unanswered = totalQuestions - answeredCount;

    if (unanswered > 0) {
      Alert.alert(
        "Nộp bài",
        `Bạn còn ${unanswered} câu chưa làm. Có chắc chắn nộp không?`,
        [
          { text: "Hủy", style: "cancel" },
          { text: "Đồng ý", onPress: submitExam }
        ]
      );
    } else {
      Alert.alert(
        "Nộp bài",
        "Bạn đã hoàn thành tất cả. Bạn có chắc chắn nộp không?",
        [
          { text: "Hủy", style: "cancel" },
          { text: "Đồng ý", onPress: submitExam }
        ]
      );
    }
  };

  const handleJumpToQuestion = (targetQ: any) => {
    const pageIndex = pages.findIndex(page => page.some((q: any) => q.id === targetQ.id));
    if (pageIndex !== -1) {
       setCurrentPageIndex(pageIndex);
       setShowReview(false);
    }
  };

  if (loading || pages.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={AUTH_ACTION_COLOR} />
      </View>
    );
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatAudioTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  let minQ = currentPage[0]?.question_number || (currentPageIndex + 1);
  let maxQ = currentPage[currentPage.length - 1]?.question_number || minQ;
  let displayQNum = minQ === maxQ ? `Câu ${minQ}` : `Câu ${minQ} - ${maxQ}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
           Alert.alert("Thoát", "Lưu ý bài thi chưa được lưu. Bạn có muốn thoát?", [
             { text: "Huỷ", style: "cancel" }, 
             { text: "Thoát", onPress: () => {
               if (sound) sound.unloadAsync();
               navigation.goBack();
             }}
           ]);
        }}>
          <Ionicons name="close" size={28} color="#111" />
        </TouchableOpacity>
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        <TouchableOpacity onPress={() => setShowReview(true)}>
          <Ionicons name="grid-outline" size={24} color={AUTH_ACTION_COLOR} />
        </TouchableOpacity>
      </View>

      {/* Audio Player */}
      {nextAudioUrl && (
        <View style={styles.audioPlayerContainer}>
           <TouchableOpacity onPress={handlePlayPause}>
             <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={36} color={AUTH_ACTION_COLOR} />
           </TouchableOpacity>
           <Slider
             style={styles.audioSlider}
             minimumValue={0}
             maximumValue={durationMillis > 0 ? durationMillis : 100}
             value={durationMillis > 0 ? positionMillis : 0}
             onSlidingComplete={handleSeek}
             minimumTrackTintColor={AUTH_ACTION_COLOR}
             maximumTrackTintColor="#d3d3d3"
             thumbTintColor={AUTH_ACTION_COLOR}
           />
           <Text style={styles.audioTime}>{formatAudioTime(positionMillis)} / {formatAudioTime(durationMillis)}</Text>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.navigatorBar}>
          <TouchableOpacity 
             style={styles.navButton} 
             disabled={currentPageIndex === 0}
             onPress={() => setCurrentPageIndex(p => p - 1)}
          >
             <Ionicons name="chevron-back" size={24} color={currentPageIndex === 0 ? "#aaa" : "#333"} />
             <Text style={{ color: currentPageIndex === 0 ? "#aaa" : "#333" }}>Trang trước</Text>
          </TouchableOpacity>
          <Text style={styles.questionNumText}>{displayQNum}/{questions.length}</Text>
          <TouchableOpacity 
             style={styles.navButton}
             disabled={currentPageIndex === pages.length - 1}
             onPress={() => setCurrentPageIndex(p => p + 1)}
          >
             <Text style={{ color: currentPageIndex === pages.length - 1 ? "#aaa" : "#333" }}>Trang sau</Text>
             <Ionicons name="chevron-forward" size={24} color={currentPageIndex === pages.length - 1 ? "#aaa" : "#333"} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.questionArea} contentContainerStyle={{ padding: 16 }}>
          {/* Shared Context for the Page (Image & Passage) */}
          {(firstQ?.group?.image_url || firstQ?.image_url) && (
            <Image 
              source={{ uri: firstQ?.image_url || firstQ?.group?.image_url }} 
              style={styles.questionImage} 
              resizeMode="contain" 
            />
          )}

          {firstQ?.group?.passage_text && (
            <View style={styles.passageBox}>
              <Text style={styles.passageText}>{firstQ.group.passage_text}</Text>
            </View>
          )}

          {/* Render All Questions in this Page/Group */}
          {currentPage.map((q: any) => (
            <View key={q.id} style={styles.questionBlock}>
              {q.content ? (
                 <Text style={styles.questionContent}>{q.question_number}. {q.content}</Text>
              ) : (
                 <Text style={styles.questionContentAudioFallback}>{q.question_number}. (Lắng nghe audio để chọn đáp án)</Text>
              )}

              <View style={styles.optionsList}>
                 {q.answers && q.answers.length > 0 ? (
                   q.answers.map((ans: any) => {
                     const isSelected = answers[q.id] === ans.option_label;
                     return (
                       <TouchableOpacity 
                          key={ans.id} 
                          style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                          onPress={() => handleSelectAnswer(q.id, ans.option_label)}
                       >
                         <View style={[styles.optionCircle, isSelected && styles.optionCircleSelected]}>
                            <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{ans.option_label}</Text>
                         </View>
                         <Text style={styles.optionText}>{ans.content}</Text>
                       </TouchableOpacity>
                     );
                   })
                 ) : (
                    ['A', 'B', 'C', 'D'].map(opt => {
                       if (q.part_number === 2 && opt === 'D') return null;
                       
                       const isSelected = answers[q.id] === opt;
                       return (
                         <TouchableOpacity 
                            key={opt} 
                            style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                            onPress={() => handleSelectAnswer(q.id, opt)}
                         >
                           <View style={[styles.optionCircle, isSelected && styles.optionCircleSelected]}>
                              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{opt}</Text>
                           </View>
                         </TouchableOpacity>
                       );
                    })
                 )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Answer Review Modal */}
      <Modal visible={showReview} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowReview(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Danh sách câu hỏi</Text>
             <TouchableOpacity onPress={() => setShowReview(false)}>
                <Ionicons name="close" size={28} />
             </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.gridContainer}>
             {questions.map((q: any) => {
                const isAnswered = !!answers[q.id];
                const isActivePage = pages[currentPageIndex]?.some((pgQ: any) => pgQ.id === q.id);
                return (
                  <TouchableOpacity
                     key={q.id}
                     style={[
                       styles.gridCell, 
                       isAnswered && styles.gridCellAnswered,
                       isActivePage && styles.gridCellActive
                     ]}
                     onPress={() => handleJumpToQuestion(q)}
                  >
                     <Text style={[
                       styles.gridCellText, 
                       isAnswered && styles.gridCellTextAnswered,
                       isActivePage && styles.gridCellTextActive
                     ]}>{q.question_number}</Text>
                  </TouchableOpacity>
                )
             })}
          </ScrollView>

          <View style={styles.modalFooter}>
             <Text style={{marginBottom: 12, textAlign: 'center', color: '#666'}}>
                Đã làm: {Object.keys(answers).length} / {questions.length}
             </Text>
             <TouchableOpacity style={styles.submitButtonFull} onPress={handleAttemptSubmit}>
                 <Text style={styles.submitButtonText}>Nộp bài ngay</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
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
  timerText: { fontSize: 20, fontWeight: "bold", color: "#e74c3c" },
  
  audioPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  audioSlider: {
    flex: 1,
    marginHorizontal: 12,
    height: 40
  },
  audioTime: { fontSize: 13, color: "#666", minWidth: 80, textAlign: "right", fontFamily: "monospace" },

  mainContent: { flex: 1 },
  navigatorBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f0f0f0"
  },
  navButton: { flexDirection: "row", alignItems: "center" },
  questionNumText: { fontSize: 16, fontWeight: "600" },
  questionArea: { flex: 1 },

  passageBox: {
    backgroundColor: "#fdfdfd",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    marginBottom: 16
  },
  passageText: { fontSize: 15, lineHeight: 22 },
  
  questionBlock: {
    marginBottom: 32
  },
  questionContent: { fontSize: 16, fontWeight: "600", marginBottom: 16, color: "#111" },
  questionContentAudioFallback: { fontSize: 16, fontWeight: "600", marginBottom: 16, color: "#888", fontStyle: "italic" },
  questionImage: { width: "100%", height: 200, marginBottom: 16, borderRadius: 8, backgroundColor: "#f0f0f0" },

  optionsList: { gap: 12 },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff"
  },
  optionItemSelected: {
    borderColor: AUTH_ACTION_COLOR,
    backgroundColor: "#eaf2ff"
  },
  optionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#aaa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  optionCircleSelected: {
    borderColor: AUTH_ACTION_COLOR,
    backgroundColor: AUTH_ACTION_COLOR
  },
  optionLabel: { fontWeight: "bold", color: "#666" },
  optionLabelSelected: { color: "#fff" },
  optionText: { fontSize: 15, flex: 1, flexWrap: "wrap", color: "#333" },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: "#f5f5f5" },
  modalHeader: {
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#ddd"
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
    justifyContent: "center"
  },
  gridCell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center"
  },
  gridCellAnswered: {
    backgroundColor: AUTH_ACTION_COLOR
  },
  gridCellActive: {
    borderWidth: 2,
    borderColor: "#000"
  },
  gridCellText: { fontSize: 16, fontWeight: "600", color: "#666" },
  gridCellTextAnswered: { color: "#fff" },
  gridCellTextActive: { color: "#000" },

  modalFooter: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd"
  },
  submitButtonFull: {
    backgroundColor: AUTH_ACTION_COLOR,
    padding: 14,
    borderRadius: 8,
    alignItems: "center"
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" }
});
