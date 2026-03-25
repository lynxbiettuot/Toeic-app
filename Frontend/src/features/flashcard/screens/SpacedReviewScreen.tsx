import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AUTH_ACTION_COLOR } from '../../auth/constants/theme';
import { getDueReviewCards, getTodayReviewStats, rateReviewCard } from '../services/flashcardService';
import { FlashcardFooterNav } from '../components/FlashcardFooterNav';
import type { ReviewFlashcard, ReviewRating } from '../types/flashcard';

type SpacedReviewScreenProps = {
  userId: number;
  onBackHome: () => void;
};

const RATING_BUTTONS: Array<{ rating: ReviewRating; label: string; color: string }> = [
  { rating: 'FORGOT', label: 'Quên', color: '#f04438' },
  { rating: 'HARD', label: 'Khó', color: '#f79009' },
  { rating: 'GOOD', label: 'Được', color: '#12b76a' },
  { rating: 'EASY', label: 'Dễ', color: '#1570ef' }
];

export function SpacedReviewScreen({ userId, onBackHome }: SpacedReviewScreenProps) {
  const [cards, setCards] = useState<ReviewFlashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewedToday, setReviewedToday] = useState(0);

  const activeCard = useMemo(() => cards[0] ?? null, [cards]);

  const shuffleCards = (input: ReviewFlashcard[]) => {
    const cloned = [...input];

    for (let index = cloned.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const current = cloned[index];
      cloned[index] = cloned[randomIndex];
      cloned[randomIndex] = current;
    }

    return cloned;
  };

  const loadDueCards = async () => {
    setLoading(true);

    try {
      const [dueData, statsData] = await Promise.all([
        getDueReviewCards(userId),
        getTodayReviewStats(userId)
      ]);
      setCards(shuffleCards(dueData.cards));
      setReviewedToday(statsData.reviewedCount);
      setShowBack(false);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải danh sách ôn tập.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDueCards();
  }, []);

  const handleRating = async (rating: ReviewRating) => {
    if (!activeCard) {
      return;
    }

    setSubmitting(true);

    try {
      await rateReviewCard(activeCard.id, userId, rating);
      setCards((prev) => prev.slice(1));
      setReviewedToday((prev) => prev + 1);
      setShowBack(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu đánh giá.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={AUTH_ACTION_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  if (!activeCard) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <View style={styles.iconButton} />
          <Text style={styles.topBarTitle}>Ôn từ vựng</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.completeWrap}>
          <Text style={styles.completeTitle}>Bạn đã hoàn thành toàn bộ từ vựng cần ôn tập ngày hôm nay!</Text>
          <Text style={styles.completeSubTitle}>Bạn đã ôn {reviewedToday} thẻ trong hôm nay.</Text>
          <Pressable style={styles.backHomeBtn} onPress={onBackHome}>
            <Text style={styles.backHomeBtnText}>Về trang chủ</Text>
          </Pressable>
        </View>

        <FlashcardFooterNav onGoHome={onBackHome} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={onBackHome} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </Pressable>
        <Text style={styles.topBarTitle}>Ôn từ vựng</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.container}>
        <Text style={styles.progressText}>Còn lại {cards.length} thẻ đến hạn</Text>
        <Text style={styles.progressText}>Đã ôn hôm nay: {reviewedToday} thẻ</Text>

        <Pressable style={styles.shuffleBtn} onPress={() => setCards((prev) => shuffleCards(prev))}>
          <Ionicons name="shuffle" size={16} color="#fff" />
          <Text style={styles.shuffleBtnText}>Xáo trộn thẻ</Text>
        </Pressable>

        {message && <Text style={styles.errorText}>{message}</Text>}

        <View style={styles.cardBox}>
          <Text style={styles.setTitle}>{activeCard.setTitle}</Text>
          <Text style={styles.wordText}>{activeCard.word}</Text>
          <Text style={styles.pronunciation}>{activeCard.pronunciation || '-'}</Text>

          {showBack && (
            <View style={styles.answerWrap}>
              <Text style={styles.answerLine}>Định nghĩa: {activeCard.definition}</Text>
              <Text style={styles.answerLine}>Ví dụ: {activeCard.example || '-'}</Text>
            </View>
          )}
        </View>

        {!showBack ? (
          <Pressable style={styles.flipBtn} onPress={() => setShowBack(true)}>
            <Ionicons name="sync" size={18} color="#fff" />
            <Text style={styles.flipBtnText}>Lật thẻ</Text>
          </Pressable>
        ) : (
          <View style={styles.ratingGrid}>
            {RATING_BUTTONS.map((item) => (
              <Pressable
                key={item.rating}
                style={[styles.ratingBtn, { backgroundColor: item.color }]}
                onPress={() => handleRating(item.rating)}
                disabled={submitting}
              >
                <Text style={styles.ratingBtnText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <FlashcardFooterNav onGoHome={onBackHome} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f7' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    height: 56,
    backgroundColor: AUTH_ACTION_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12
  },
  topBarTitle: { fontSize: 17, color: '#111', fontWeight: '700' },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  progressText: { fontSize: 13, color: '#555', marginBottom: 10 },
  shuffleBtn: {
    alignSelf: 'flex-start',
    height: 34,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: AUTH_ACTION_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10
  },
  shuffleBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  errorText: { color: '#b42318', marginBottom: 10, fontSize: 13 },
  cardBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    minHeight: 260
  },
  setTitle: { fontSize: 12, color: '#6b6b6b', marginBottom: 10 },
  wordText: { fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 8 },
  pronunciation: { fontSize: 16, color: '#3f3f3f' },
  answerWrap: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ececec',
    paddingTop: 12,
    gap: 8
  },
  answerLine: { fontSize: 14, color: '#2f2f2f', lineHeight: 20 },
  flipBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 10,
    backgroundColor: AUTH_ACTION_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  flipBtnText: { color: '#fff', fontWeight: '700' },
  ratingGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between'
  },
  ratingBtn: {
    width: '48%',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ratingBtnText: { color: '#fff', fontWeight: '700' },
  completeWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  completeTitle: {
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '700',
    color: '#1f1f1f',
    marginBottom: 20
  },
  completeSubTitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#4f4f4f',
    marginBottom: 16
  },
  backHomeBtn: {
    height: 44,
    minWidth: 160,
    borderRadius: 10,
    backgroundColor: AUTH_ACTION_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  backHomeBtnText: { color: '#fff', fontWeight: '700' }
});
