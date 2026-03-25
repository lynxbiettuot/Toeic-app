import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AUTH_ACTION_COLOR } from '../../auth/constants/theme';
import { getPublicFlashcardSetDetail, importFlashcardSet } from '../services/flashcardService';
import type { PublicFlashcardCard, PublicFlashcardSet } from '../types/flashcard';

type PublicSetDetailScreenProps = {
  setId: number;
  userId: number;
  onBack: () => void;
  onImportSuccess: () => void;
};

export function PublicSetDetailScreen({
  setId,
  userId,
  onBack,
  onImportSuccess
}: PublicSetDetailScreenProps) {
  const [set, setSet] = useState<PublicFlashcardSet | null>(null);
  const [cards, setCards] = useState<PublicFlashcardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const data = await getPublicFlashcardSetDetail(setId);
        setSet(data.set);
        setCards(data.cards);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Lỗi tải chi tiết bộ');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [setId]);

  const handleImport = async () => {
    if (!set) return;

    setImporting(true);
    try {
      const result = await importFlashcardSet(setId, userId);
      setMessage(result.message);
      setTimeout(() => {
        onImportSuccess();
      }, 1500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lỗi import bộ');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </Pressable>
          <Text style={styles.topBarTitle}>Chi tiết</Text>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={AUTH_ACTION_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  if (!set) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </Pressable>
          <Text style={styles.topBarTitle}>Chi tiết</Text>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorMsg}>{message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </Pressable>
        <Text style={styles.topBarTitle}>Chi tiết bộ</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBox}>
          <Text style={styles.title}>{set.title}</Text>
          <Text style={styles.author}>👤 {set.authorName}</Text>
          <Text style={styles.meta}>
            📚 {set.cardCount} thẻ • 🔥 {set.savedCount} lần lưu
          </Text>
          {set.description && (
            <Text style={styles.description}>{set.description}</Text>
          )}
        </View>

        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>Xem trước ({Math.min(3, cards.length)} thẻ)</Text>

          {cards.slice(0, 3).map((card, index) => (
            <View key={card.id} style={styles.cardPreview}>
              <View style={styles.cardNumber}>
                <Text style={styles.cardNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardWord}>{card.word}</Text>
                {card.pronunciation && (
                  <Text style={styles.cardPronunciation}>{card.pronunciation}</Text>
                )}
                <Text style={styles.cardDefinition} numberOfLines={2}>
                  {card.definition}
                </Text>
              </View>
            </View>
          ))}

          <Text style={styles.moreText}>
            ... và {Math.max(0, cards.length - 3)} thẻ khác
          </Text>
        </View>

        {message && message.includes('✅') && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={24} color="#12b76a" />
            <Text style={styles.successText}>{message}</Text>
          </View>
        )}

        {message && !message.includes('✅') && (
          <Text style={styles.errorMsg}>{message}</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.importBtn, importing && styles.importBtnDisabled]}
          onPress={handleImport}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="download" size={18} color="#fff" />
              <Text style={styles.importBtnText}>💾 Lưu vào thư viện</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f7' },
  topBar: {
    height: 56,
    backgroundColor: AUTH_ACTION_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12
  },
  topBarTitle: { fontSize: 17, color: '#111', fontWeight: '700' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8 },
  author: { fontSize: 14, color: '#666', marginBottom: 8 },
  meta: { fontSize: 12, color: '#999', marginBottom: 8 },
  description: { fontSize: 13, color: '#555', lineHeight: 18 },
  previewBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12
  },
  previewTitle: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 10 },
  cardPreview: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  cardNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AUTH_ACTION_COLOR,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardNumberText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  cardInfo: { flex: 1 },
  cardWord: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 4 },
  cardPronunciation: { fontSize: 12, color: '#666', marginBottom: 4 },
  cardDefinition: { fontSize: 12, color: '#555', lineHeight: 16 },
  moreText: { fontSize: 12, color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  successText: { color: '#12b76a', fontSize: 13, fontWeight: '500' },
  errorMsg: { color: '#b42318', fontSize: 13, marginBottom: 12 },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  importBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: AUTH_ACTION_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  importBtnDisabled: { opacity: 0.6 },
  importBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
