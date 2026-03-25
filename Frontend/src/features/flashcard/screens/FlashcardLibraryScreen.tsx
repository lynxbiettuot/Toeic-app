import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AUTH_ACTION_COLOR } from '../../auth/constants/theme';
import {
  createFlashcardSet,
  deleteFlashcardSet,
  getFlashcardSets,
  updateFlashcardSet
} from '../services/flashcardService';
import { FlashcardFooterNav } from '../components/FlashcardFooterNav';
import type { FlashcardSet, VisibilityMode } from '../types/flashcard';

type FlashcardLibraryScreenProps = {
  userId: number;
  onBack: () => void;
  onOpenSet: (setItem: FlashcardSet) => void;
  onGoHome: () => void;
  onOpenDiscovery: () => void;
};

type SetFormState = {
  title: string;
  description: string;
  visibility: VisibilityMode;
};

const EMPTY_FORM: SetFormState = {
  title: '',
  description: '',
  visibility: 'PRIVATE'
};

export function FlashcardLibraryScreen({
  userId,
  onBack,
  onOpenSet,
  onGoHome,
  onOpenDiscovery
}: FlashcardLibraryScreenProps) {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingSet, setEditingSet] = useState<FlashcardSet | null>(null);
  const [formState, setFormState] = useState<SetFormState>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');

  const modalTitle = useMemo(() => (editingSet ? 'Sửa bộ từ vựng' : 'Tạo list từ'), [editingSet]);

  const loadSets = async () => {
    setLoading(true);

    try {
      const data = await getFlashcardSets(userId);
      setSets(data);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải kho từ vựng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSets();
  }, []);

  const openCreateModal = () => {
    setEditingSet(null);
    setFormState(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditModal = (setItem: FlashcardSet) => {
    setEditingSet(setItem);
    setFormState({
      title: setItem.title,
      description: setItem.description ?? '',
      visibility: setItem.visibility
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    if (!submitting) {
      setModalVisible(false);
      setEditingSet(null);
      setFormState(EMPTY_FORM);
    }
  };

  const saveSet = async () => {
    if (!formState.title.trim()) {
      setMessage('Tiêu đề bộ từ vựng không được để trống.');
      return;
    }

    setSubmitting(true);

    try {
      if (editingSet) {
        await updateFlashcardSet(editingSet.id, userId, {
          title: formState.title.trim(),
          description: formState.description.trim(),
          visibility: formState.visibility
        });
      } else {
        await createFlashcardSet(userId, {
          title: formState.title.trim(),
          description: formState.description.trim(),
          visibility: formState.visibility
        });
      }

      closeModal();
      await loadSets();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu bộ từ vựng.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteSet = (setItem: FlashcardSet) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa ${setItem.title}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFlashcardSet(setItem.id, userId);
              await loadSets();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Không thể xóa bộ từ vựng.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </Pressable>
          <Text style={styles.topBarTitle}>Flashcard</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.content}>
          <View style={styles.tabContainer}>
            <Pressable
              style={[styles.tab, activeTab === 'my' && styles.tabActive]}
              onPress={() => setActiveTab('my')}
            >
              <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
                📚 Của tôi
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
              onPress={() => {
                setActiveTab('discover');
                onOpenDiscovery();
              }}
            >
              <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
                🌍 Khám phá
              </Text>
            </Pressable>
          </View>

          {activeTab === 'my' ? (
            <>
              <Text style={styles.heading}>Kho từ vựng</Text>

              <Pressable style={styles.addButton} onPress={openCreateModal}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.addButtonLabel}>Thêm bộ từ vựng</Text>
              </Pressable>

              {message && <Text style={styles.errorText}>{message}</Text>}

              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={AUTH_ACTION_COLOR} />
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.listContent}>
                  {sets.map((setItem) => (
                    <Pressable key={setItem.id} style={styles.setCard} onPress={() => onOpenSet(setItem)}>
                      <View style={styles.setMain}>
                        <Text style={styles.setTitle}>{setItem.title}</Text>
                        <Text style={styles.setDescription}>{setItem.description || 'Không có mô tả.'}</Text>
                        <Text style={styles.setMeta}>
                          {setItem.visibility === 'PUBLIC' ? 'Public' : 'Private'} • {setItem.card_count} thẻ
                        </Text>
                      </View>

                      <View style={styles.actionsCol}>
                        <Pressable style={styles.smallIconBtn} onPress={() => openEditModal(setItem)}>
                          <MaterialIcons name="edit" size={20} color="#222" />
                        </Pressable>
                        <Pressable style={styles.smallIconBtn} onPress={() => confirmDeleteSet(setItem)}>
                          <MaterialIcons name="delete" size={20} color="#b42318" />
                        </Pressable>
                      </View>
                    </Pressable>
                  ))}

                  {sets.length === 0 && <Text style={styles.emptyText}>Bạn chưa có bộ từ vựng nào.</Text>}
                </ScrollView>
              )}
            </>
          ) : null}
        </View>

        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>

              <Text style={styles.inputLabel}>Tiêu đề</Text>
              <TextInput
                value={formState.title}
                style={styles.input}
                onChangeText={(value) => setFormState((prev) => ({ ...prev, title: value }))}
                placeholder="Ví dụ: Từ vựng ETS 2026 - Test 1"
              />

              <Text style={styles.inputLabel}>Mô tả</Text>
              <TextInput
                value={formState.description}
                style={[styles.input, styles.multilineInput]}
                onChangeText={(value) => setFormState((prev) => ({ ...prev, description: value }))}
                multiline
                placeholder="List gồm những từ vựng quan trọng..."
              />

              <Text style={styles.inputLabel}>Chế độ</Text>
              <View style={styles.modeRow}>
                <Pressable
                  style={[styles.modeButton, formState.visibility === 'PRIVATE' && styles.modeButtonActive]}
                  onPress={() => setFormState((prev) => ({ ...prev, visibility: 'PRIVATE' }))}
                >
                  <Text style={styles.modeText}>Private</Text>
                </Pressable>
                <Pressable
                  style={[styles.modeButton, formState.visibility === 'PUBLIC' && styles.modeButtonActive]}
                  onPress={() => setFormState((prev) => ({ ...prev, visibility: 'PUBLIC' }))}
                >
                  <Text style={styles.modeText}>Public</Text>
                </Pressable>
              </View>

              <View style={styles.modalActionRow}>
                <Pressable style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={saveSet} disabled={submitting}>
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
  topBarTitle: { fontSize: 17, color: '#111', fontWeight: '600' },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  heading: { fontSize: 20, fontWeight: '700', color: '#1f1f1f', marginBottom: 12 },
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
  setCard: {
    borderWidth: 1,
    borderColor: '#d7d7d7',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  setMain: { flex: 1, paddingRight: 8 },
  setTitle: { fontSize: 16, fontWeight: '700', color: '#1f1f1f' },
  setDescription: { marginTop: 6, fontSize: 13, color: '#555' },
  setMeta: { marginTop: 8, fontSize: 12, color: '#6b6b6b' },
  actionsCol: { gap: 10 },
  smallIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f2f2f2'
  },
  emptyText: { textAlign: 'center', marginTop: 22, color: '#666' },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0'
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomColor: AUTH_ACTION_COLOR
  },
  tabText: { fontSize: 14, color: '#999', fontWeight: '500' },
  tabTextActive: { color: AUTH_ACTION_COLOR, fontWeight: '700' },
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
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modeButtonActive: { backgroundColor: '#d9f6f3', borderColor: AUTH_ACTION_COLOR },
  modeText: { color: '#1f1f1f', fontWeight: '600' },
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
