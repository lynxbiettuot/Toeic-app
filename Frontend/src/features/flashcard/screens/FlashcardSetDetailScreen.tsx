import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AUTH_ACTION_COLOR } from '../../auth/constants/theme';
import {
  createFlashcard,
  deleteFlashcard,
  getFlashcardsBySet,
  updateFlashcard
} from '../services';
import { FlashcardFooterNav } from '../components/FlashcardFooterNav';
import type { Flashcard, FlashcardSet } from '../types';

type FlashcardSetDetailScreenProps = {
  userId: number;
  flashcardSet: FlashcardSet;
  onBack: () => void;
  onGoHome: () => void;
};

type FlashcardFormState = {
  word: string;
  wordType: string;
  pronunciation: string;
  definition: string;
  example: string;
  imageUrl: string;
};

const EMPTY_FORM: FlashcardFormState = {
  word: '',
  wordType: '',
  pronunciation: '',
  definition: '',
  example: '',
  imageUrl: ''
};

export function FlashcardSetDetailScreen({
  userId,
  flashcardSet,
  onBack,
  onGoHome
}: FlashcardSetDetailScreenProps) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [formState, setFormState] = useState<FlashcardFormState>(EMPTY_FORM);
  const [modalError, setModalError] = useState<string | null>(null);
  const [imageLoadErrorIds, setImageLoadErrorIds] = useState<Record<number, boolean>>({});
  const [modalImagePreviewError, setModalImagePreviewError] = useState(false);

  const modalTitle = useMemo(() => (editingCard ? 'Sửa flashcard' : 'Tạo flashcard'), [editingCard]);
  const previewImageUrl = useMemo(() => formState.imageUrl.trim(), [formState.imageUrl]);
  const hasPreviewImageUrl = /^https?:\/\//i.test(previewImageUrl);

  const loadCards = async () => {
    setLoading(true);

    try {
      const data = await getFlashcardsBySet(flashcardSet.id, userId);
      setCards(data.cards);
      setImageLoadErrorIds({});
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải danh sách flashcard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [flashcardSet.id]);

  const openCreateModal = () => {
    setEditingCard(null);
    setFormState(EMPTY_FORM);
    setModalImagePreviewError(false);
    setModalError(null);
    setModalVisible(true);
  };

  const openEditModal = (card: Flashcard) => {
    setEditingCard(card);
    setFormState({
      word: card.word,
      wordType: card.word_type ?? '',
      pronunciation: card.pronunciation ?? '',
      definition: card.definition,
      example: card.example ?? '',
      imageUrl: card.image_url ?? ''
    });
    setModalImagePreviewError(false);
    setModalError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (!submitting) {
      setModalVisible(false);
      setEditingCard(null);
      setFormState(EMPTY_FORM);
      setModalImagePreviewError(false);
      setModalError(null);
    }
  };

  const saveCard = async () => {
    if (!formState.word.trim() || !formState.definition.trim()) {
      setModalError('Từ vựng và định nghĩa là bắt buộc.');
      return;
    }

    setModalError(null);
    setSubmitting(true);

    try {
      const payload = {
        word: formState.word.trim(),
        wordType: formState.wordType.trim(),
        pronunciation: formState.pronunciation.trim(),
        definition: formState.definition.trim(),
        example: formState.example.trim(),
        imageUrl: formState.imageUrl.trim()
      };

      if (editingCard) {
        await updateFlashcard(editingCard.id, userId, payload);
      } else {
        await createFlashcard(flashcardSet.id, userId, payload);
      }

      closeModal();
      await loadCards();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu flashcard.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteCard = (card: Flashcard) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa flashcard này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFlashcard(card.id, userId);
            await loadCards();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể xóa flashcard.');
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </Pressable>
          <Text numberOfLines={1} style={styles.topBarTitle}>{flashcardSet.title}</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>Danh sách từ vựng</Text>

          <Pressable style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addButtonLabel}>Thêm từ mới</Text>
          </Pressable>

          {message && <Text style={styles.errorText}>{message}</Text>}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={AUTH_ACTION_COLOR} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.listContent}>
              {cards.map((card) => (
                <View key={card.id} style={styles.cardItem}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.wordText}>{card.word}</Text>
                    <View style={styles.actionsRow}>
                      <Pressable style={styles.smallIconBtn} onPress={() => openEditModal(card)}>
                        <MaterialIcons name="edit" size={19} color="#222" />
                      </Pressable>
                      <Pressable style={styles.smallIconBtn} onPress={() => confirmDeleteCard(card)}>
                        <MaterialIcons name="delete" size={19} color="#b42318" />
                      </Pressable>
                    </View>
                  </View>

                  <Text style={styles.cardLine}>Từ loại: {card.word_type || '-'}</Text>
                  <Text style={styles.cardLine}>Phiên âm: {card.pronunciation || '-'}</Text>
                  <Text style={styles.cardLine}>Định nghĩa: {card.definition}</Text>
                  <Text style={styles.cardLine}>Ví dụ: {card.example || '-'}</Text>
                  {card.image_url && !imageLoadErrorIds[card.id] ? (
                    <View style={styles.imageWrap}>
                      <Text style={styles.cardLine}>Hình ảnh:</Text>
                      <Image
                        source={{ uri: card.image_url }}
                        style={styles.cardImage}
                        resizeMode="contain"
                        onError={() => {
                          setImageLoadErrorIds((prev) => ({ ...prev, [card.id]: true }));
                        }}
                      />
                    </View>
                  ) : (
                    <Text style={styles.cardLine}>Hình ảnh: -</Text>
                  )}
                </View>
              ))}

              {cards.length === 0 && <Text style={styles.emptyText}>Bộ từ này chưa có flashcard.</Text>}
            </ScrollView>
          )}
        </View>

        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>

              <Text style={styles.inputLabel}>Từ vựng</Text>
              <TextInput
                value={formState.word}
                style={styles.input}
                onChangeText={(value) => {
                  if (modalError) {
                    setModalError(null);
                  }
                  setFormState((prev) => ({ ...prev, word: value }));
                }}
                placeholder="Accommodation"
              />

              <Text style={styles.inputLabel}>Từ loại</Text>
              <TextInput
                value={formState.wordType}
                style={styles.input}
                onChangeText={(value) => {
                  if (modalError) {
                    setModalError(null);
                  }
                  setFormState((prev) => ({ ...prev, wordType: value }));
                }}
                placeholder="Noun"
              />

              <Text style={styles.inputLabel}>Phiên âm</Text>
              <TextInput
                value={formState.pronunciation}
                style={styles.input}
                onChangeText={(value) => {
                  if (modalError) {
                    setModalError(null);
                  }
                  setFormState((prev) => ({ ...prev, pronunciation: value }));
                }}
                placeholder="/əˌkɑːməˈdeɪʃn/"
              />

              <Text style={styles.inputLabel}>Định nghĩa</Text>
              <TextInput
                value={formState.definition}
                style={styles.input}
                onChangeText={(value) => {
                  if (modalError) {
                    setModalError(null);
                  }
                  setFormState((prev) => ({ ...prev, definition: value }));
                }}
                placeholder="Nơi ở hoặc chỗ lưu trú"
              />

              <Text style={styles.inputLabel}>Hình ảnh (URL)</Text>
              <TextInput
                value={formState.imageUrl}
                style={styles.input}
                onChangeText={(value) => {
                  if (modalError) {
                    setModalError(null);
                  }
                  if (modalImagePreviewError) {
                    setModalImagePreviewError(false);
                  }
                  setFormState((prev) => ({ ...prev, imageUrl: value }));
                }}
                placeholder="https://example.com/image.jpg"
                autoCapitalize="none"
              />

              {hasPreviewImageUrl ? (
                !modalImagePreviewError ? (
                  <Image
                    source={{ uri: previewImageUrl }}
                    style={styles.modalPreviewImage}
                    resizeMode="contain"
                    onError={() => setModalImagePreviewError(true)}
                  />
                ) : (
                  <Text style={styles.previewErrorText}>Không tải được ảnh từ URL này.</Text>
                )
              ) : null}

              <Text style={styles.inputLabel}>Ví dụ</Text>
              <TextInput
                value={formState.example}
                style={[styles.input, styles.multilineInput]}
                onChangeText={(value) => {
                  if (modalError) {
                    setModalError(null);
                  }
                  setFormState((prev) => ({ ...prev, example: value }));
                }}
                multiline
                placeholder="The hotel provides comfortable accommodation."
              />

              {modalError && <Text style={styles.modalErrorText}>{modalError}</Text>}

              <View style={styles.modalActionRow}>
                <Pressable style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={saveCard} disabled={submitting}>
                  <Text style={styles.saveBtnText}>{submitting ? 'Đang lưu...' : 'Lưu'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <FlashcardFooterNav onGoHome={onGoHome} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f7' },
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    height: 56,
    backgroundColor: AUTH_ACTION_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    color: '#111',
    fontWeight: '700'
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  heading: { fontSize: 19, fontWeight: '700', color: '#1f1f1f', marginBottom: 12 },
  addButton: {
    backgroundColor: AUTH_ACTION_COLOR,
    borderRadius: 10,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12
  },
  addButtonLabel: { color: '#fff', fontWeight: '700' },
  errorText: { color: '#b42318', marginBottom: 10, fontSize: 13 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 28, gap: 10 },
  cardItem: {
    borderWidth: 1,
    borderColor: '#d7d7d7',
    borderRadius: 12,
    padding: 12,
    gap: 6
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  wordText: { fontSize: 17, fontWeight: '700', color: '#1f1f1f', flex: 1, paddingRight: 8 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  smallIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardLine: { fontSize: 13, color: '#4f4f4f' },
  imageWrap: { gap: 6 },
  cardImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#fff'
  },
  emptyText: { textAlign: 'center', marginTop: 22, color: '#666' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#1f1f1f' },
  inputLabel: { fontSize: 13, color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
    backgroundColor: '#fff'
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10
  },
  modalErrorText: { color: '#b42318', marginBottom: 10, fontSize: 13 },
  modalPreviewImage: {
    width: '100%',
    height: 90,
    marginBottom: 10
  },
  previewErrorText: { fontSize: 12, color: '#b42318' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: {
    height: 38,
    minWidth: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c8c8c8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  cancelBtnText: { color: '#444', fontWeight: '600' },
  saveBtn: {
    height: 38,
    minWidth: 70,
    borderRadius: 8,
    backgroundColor: AUTH_ACTION_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  saveBtnText: { color: '#fff', fontWeight: '700' }
});
