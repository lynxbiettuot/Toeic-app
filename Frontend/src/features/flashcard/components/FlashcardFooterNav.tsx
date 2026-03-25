import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { AUTH_ACTION_COLOR } from '../../auth/constants/theme';

type FlashcardFooterNavProps = {
  onGoHome: () => void;
};

export function FlashcardFooterNav({ onGoHome }: FlashcardFooterNavProps) {
  return (
    <View style={styles.bottomNav}>
      <Pressable style={styles.navButton} onPress={onGoHome}>
        <Ionicons name="home" size={28} color="#111111" />
      </Pressable>
      <View style={styles.navButton}>
        <Ionicons name="reader-outline" size={26} color="#111111" />
      </View>
      <View style={styles.navButton}>
        <Feather name="clock" size={26} color="#111111" />
      </View>
      <View style={styles.navButton}>
        <FontAwesome5 name="gem" size={22} color="#111111" />
      </View>
      <View style={styles.navButton}>
        <Ionicons name="settings-outline" size={28} color="#111111" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    height: 54,
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
