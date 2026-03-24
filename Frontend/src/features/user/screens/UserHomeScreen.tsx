import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons
} from '@expo/vector-icons';
import { AUTH_ACTION_COLOR } from '../../auth/constants/theme';

type UserHomeScreenProps = {
  displayName?: string;
};

type QuickAction = {
  label: string;
  icon: React.ReactNode;
};

const topActions: QuickAction[] = [
  { label: 'Listening', icon: <Feather name="headphones" size={22} color="#111111" /> },
  { label: 'Reading', icon: <Ionicons name="book" size={22} color="#111111" /> },
  { label: 'Writing', icon: <MaterialCommunityIcons name="pencil" size={22} color="#111111" /> },
  { label: 'Speaking', icon: <MaterialCommunityIcons name="account-voice" size={22} color="#111111" /> },
  { label: 'Flashcard', icon: <MaterialCommunityIcons name="card-text-outline" size={22} color="#111111" /> },
  { label: 'Ôn từ vựng', icon: <Feather name="clock" size={22} color="#111111" /> },
  { label: 'Thi thử', icon: <Ionicons name="play" size={22} color="#111111" /> },
  { label: 'Lịch sử & Sai sót', icon: <MaterialCommunityIcons name="history" size={22} color="#111111" /> }
];

export function UserHomeScreen({ displayName = 'Linh' }: UserHomeScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Ionicons name="menu" size={28} color="#111111" />
          <View style={styles.avatar} />
        </View>

        <View style={styles.headerLine} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.greeting}>Hello, {displayName}</Text>

          <View style={styles.grid}>
            {topActions.map((action) => (
              <View key={action.label} style={styles.gridItem}>
                <View style={styles.iconTile}>{action.icon}</View>
                <Text style={styles.gridLabel}>{action.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.chatButton}>
          <MaterialIcons name="chat" size={26} color="#ffffff" />
        </View>

        <View style={styles.bottomNav}>
          <Ionicons name="home" size={28} color="#111111" />
          <Ionicons name="reader-outline" size={26} color="#111111" />
          <Feather name="clock" size={26} color="#111111" />
          <FontAwesome5 name="gem" size={22} color="#111111" />
          <Ionicons name="settings-outline" size={28} color="#111111" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7f7'
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  topBar: {
    height: 58,
    backgroundColor: AUTH_ACTION_COLOR,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#d9d9d9'
  },
  headerLine: {
    height: 1,
    backgroundColor: '#1d1d1d'
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 120
  },
  greeting: {
    alignSelf: 'flex-end',
    fontSize: 13,
    color: '#2f2f2f',
    marginBottom: 38
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 28
  },
  gridItem: {
    width: '22%',
    alignItems: 'center'
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#e1e1e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  gridLabel: {
    fontSize: 11,
    textAlign: 'center',
    color: '#111111',
    lineHeight: 14
  },
  chatButton: {
    position: 'absolute',
    right: 16,
    bottom: 86,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomNav: {
    height: 54,
    backgroundColor: AUTH_ACTION_COLOR,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around'
  }
});
