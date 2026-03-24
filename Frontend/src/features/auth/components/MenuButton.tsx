import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AUTH_ACTION_COLOR } from '../constants/theme';

type MenuButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export function MenuButton({ label, active, onPress }: MenuButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.button, active && styles.activeButton]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e6e1',
    alignItems: 'center'
  },
  activeButton: {
    borderColor: AUTH_ACTION_COLOR
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#50625b'
  }
});
