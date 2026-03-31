import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AUTH_ACTION_COLOR } from '../../auth/constants/theme';
import { getPublicFlashcardSets } from '../services';
import type { PublicFlashcardSet } from '../types';

type DiscoveryScreenProps = {
  userId: number;
  embedded?: boolean;
  onBack?: () => void;
  onViewDetail: (set: PublicFlashcardSet) => void;
};

export function DiscoveryScreen({ userId, embedded = false, onBack, onViewDetail }: DiscoveryScreenProps) {
  const [sets, setSets] = useState<PublicFlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadSets = async (pageNum: number, searchQuery: string) => {
    if (pageNum === 1) setLoading(true);

    try {
      const data = await getPublicFlashcardSets(pageNum, 10, searchQuery, userId);
      const filteredSets = data.sets
        .filter((setItem) => setItem.authorId !== userId)
        .sort((a, b) => b.savedCount - a.savedCount);

      setSets((prev) => (pageNum === 1 ? filteredSets : [...prev, ...filteredSets]));
      setHasMore(data.pagination.hasMore);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lỗi tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSets(1, '');
  }, []);

  const handleApplySearch = () => {
    setSearchQuery(searchInput.trim());
    setPage(1);
    loadSets(1, searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
    loadSets(1, '');
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadSets(nextPage, searchQuery);
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
          Tác giả: {item.authorName} • {item.cardCount} thẻ
        </Text>
        <Text style={styles.setMeta}>Lượt lưu: {item.savedCount}</Text>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
    </Pressable>
  );

  if (!embedded && loading && page === 1) {
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

  const content = (
    <>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm bộ từ vựng..."
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={handleApplySearch}
          placeholderTextColor="#ccc"
        />

        <Pressable style={styles.searchBtn} onPress={handleApplySearch}>
          <Ionicons name="search" size={16} color="#fff" />
          <Text style={styles.searchBtnText}>Tìm</Text>
        </Pressable>

        {searchInput ? (
          <Pressable style={styles.clearBtn} onPress={handleClearSearch}>
            <Ionicons name="close" size={18} color="#999" />
          </Pressable>
        ) : null}
      </View>

      {message && <Text style={styles.errorText}>{message}</Text>}

      {loading && page === 1 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={AUTH_ACTION_COLOR} />
        </View>
      ) : (
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
      )}
    </>
  );

  if (embedded) {
    return <View style={styles.embeddedContainer}>{content}</View>;
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
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f7' },
  embeddedContainer: { flex: 1, backgroundColor: '#f5f7f7' },
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
  searchInput: { flex: 1, fontSize: 14, color: '#111' },
  searchBtn: {
    marginLeft: 8,
    height: 28,
    borderRadius: 7,
    paddingHorizontal: 10,
    backgroundColor: AUTH_ACTION_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  searchBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  clearBtn: { marginLeft: 8 },
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
