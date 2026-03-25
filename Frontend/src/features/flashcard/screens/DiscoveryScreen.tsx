import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AUTH_ACTION_COLOR } from '../../auth/constants/theme';
import { getPublicFlashcardSets } from '../services/flashcardService';
import type { PublicFlashcardSet } from '../types/flashcard';

type DiscoveryScreenProps = {
  onBack: () => void;
  onViewDetail: (set: PublicFlashcardSet) => void;
};

export function DiscoveryScreen({ onBack, onViewDetail }: DiscoveryScreenProps) {
  const [sets, setSets] = useState<PublicFlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadSets = async (pageNum: number, searchQuery: string) => {
    if (pageNum === 1) setLoading(true);

    try {
      const data = await getPublicFlashcardSets(pageNum, 10, searchQuery);
      setSets(pageNum === 1 ? data.sets : [...sets, ...data.sets]);
      setHasMore(data.pagination.hasMore);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lỗi tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSets(1, search);
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    setPage(1);
    loadSets(1, text);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadSets(nextPage, search);
    }
  };

  const renderItem = ({ item }: { item: PublicFlashcardSet }) => (
    <Pressable
      style={styles.setCard}
      onPress={() => onViewDetail(item)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.setTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.setMeta}>
          👤 {item.authorName} • 📚 {item.cardCount} thẻ
        </Text>
        <Text style={styles.setMeta}>🔥 {item.savedCount} lần lưu</Text>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color={AUTH_ACTION_COLOR} />
    </Pressable>
  );

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </Pressable>
          <Text style={styles.topBarTitle}>Khám phá</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={AUTH_ACTION_COLOR} />
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
        <Text style={styles.topBarTitle}>Khám phá</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm bộ từ vựng..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor="#ccc"
        />
        {search ? (
          <Pressable onPress={() => handleSearch('')}>
            <Ionicons name="close" size={18} color="#999" />
          </Pressable>
        ) : null}
      </View>

      {message && <Text style={styles.errorText}>{message}</Text>}

      <FlatList
        data={sets}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Không tìm thấy bộ nào</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading && page > 1 ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="small" color={AUTH_ACTION_COLOR} />
            </View>
          ) : null
        }
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111' },
  listContent: { paddingHorizontal: 12, paddingBottom: 16 },
  setCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    gap: 10
  },
  cardContent: { flex: 1 },
  setTitle: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 6 },
  setMeta: { fontSize: 12, color: '#666', marginBottom: 4 },
  description: { fontSize: 12, color: '#999', marginTop: 4 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#b42318', marginHorizontal: 12, marginBottom: 10, fontSize: 13 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#999' },
  loaderWrap: { paddingVertical: 16, alignItems: 'center' }
});
