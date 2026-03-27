import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AUTH_ACTION_COLOR } from '../../auth/constants/theme';
import { getPublicFlashcardSetDetail, importFlashcardSet } from '../services';
import type { PublicFlashcardCard, PublicFlashcardSet } from '../types';

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

      <View style={styles.content}>
        <View style={styles.headerBox}>
          <Text style={styles.title}>{set.title}</Text>
          <Text style={styles.author}>👤 {set.authorName}</Text>
          <Text style={styles.meta}>
            📚 {set.cardCount} thẻ • 🔥 {set.savedCount} lần lưu
          </Text>
          {set.description ? <Text style={styles.description}>{set.description}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Danh sách từ vựng</Text>

        <FlatList
          data={cards}
          keyExtractor={(item) => `${item.id}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.cardItem}>
              <Text style={styles.wordText}>{item.word}</Text>
              <Text style={styles.cardLine}>Phiên âm: {item.pronunciation || '-'}</Text>
              <Text style={styles.cardLine}>Định nghĩa: {item.definition}</Text>
              <Text style={styles.cardLine}>Ví dụ: {item.example || '-'}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Bộ từ này chưa có flashcard.</Text>}
        />

        {message && message.includes('✅') ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={24} color="#12b76a" />
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        {message && !message.includes('✅') ? <Text style={styles.errorMsg}>{message}</Text> : null}
      </View>

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
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
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
  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#1f1f1f', marginBottom: 12 },
  listContent: { paddingBottom: 12, gap: 10 },
  cardItem: {
    borderWidth: 1,
    borderColor: '#d7d7d7',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: '#fff'
  },
  wordText: { fontSize: 17, fontWeight: '700', color: '#1f1f1f' },
  cardLine: { fontSize: 13, color: '#4f4f4f' },
  emptyText: { textAlign: 'center', marginTop: 22, color: '#666' },
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
