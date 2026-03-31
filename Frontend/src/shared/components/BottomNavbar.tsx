import React from 'react';
import { Pressable, StyleSheet, View, Alert } from 'react-native';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AUTH_ACTION_COLOR } from '../../features/auth/constants/theme';

export type NavScreen = 'home' | 'exam-list' | 'spaced-review' | 'flashcard-library' | 'premium';

type BottomNavbarProps = {
  activeScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  onLogout: () => void;
};

export function BottomNavbar({ activeScreen, onNavigate, onLogout }: BottomNavbarProps) {
  const insets = useSafeAreaInsets();
  const handleLogoutPress = () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất không?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Đăng xuất", onPress: onLogout, style: "destructive" }
      ]
    );
  };

  return (
    <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
      <Pressable
        style={styles.navButton}
        onPress={() => onNavigate('home')}
      >
        <Ionicons
          name={activeScreen === 'home' ? "home" : "home-outline"}
          size={28}
          color="#111111"
        />
      </Pressable>

      <Pressable
        style={styles.navButton}
        onPress={() => onNavigate('exam-list')}
      >
        <Ionicons
          name={activeScreen === 'exam-list' ? "reader" : "reader-outline"}
          size={26}
          color="#111111"
        />
      </Pressable>

      <Pressable
        style={styles.navButton}
        onPress={() => onNavigate('spaced-review')}
      >
        <Feather
          name="clock"
          size={26}
          color={activeScreen === 'spaced-review' ? "#111111" : "#111111"}
          style={activeScreen === 'spaced-review' ? { fontWeight: '700' } : {}}
        />
      </Pressable>

      <Pressable
        style={styles.navButton}
        onPress={() => onNavigate('premium')}
      >
        <FontAwesome5
          name="gem"
          size={22}
          color="#111111"
        />
      </Pressable>

      <Pressable
        style={styles.navButton}
        onPress={handleLogoutPress}
      >
        <Ionicons
          name="log-out-outline"
          size={28}
          color="#111111"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    height: 84,
    backgroundColor: AUTH_ACTION_COLOR,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  navButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
