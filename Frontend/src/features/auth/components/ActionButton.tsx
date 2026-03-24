import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import {
  AUTH_ACTION_COLOR,
  AUTH_ACTION_HOVER_COLOR,
  AUTH_DANGER_COLOR,
  AUTH_DANGER_HOVER_COLOR,
  AUTH_DISABLED_COLOR
} from '../constants/theme';

type ActionButtonProps = {
  label: string;
  enabled: boolean;
  onPress: () => void;
  loading?: boolean;
  compact?: boolean;
  variant?: 'primary' | 'danger';
};

type PressableState = {
  pressed: boolean;
  hovered?: boolean;
};

export function ActionButton({
  label,
  enabled,
  onPress,
  loading = false,
  compact = false,
  variant = 'primary'
}: ActionButtonProps) {
  const resolveBackgroundColor = (hovered: boolean, pressed: boolean) => {
    if (!enabled) {
      return AUTH_DISABLED_COLOR;
    }

    if (variant === 'danger') {
      if (pressed || hovered) {
        return AUTH_DANGER_HOVER_COLOR;
      }

      return AUTH_DANGER_COLOR;
    }

    if (pressed || hovered) {
      return AUTH_ACTION_HOVER_COLOR;
    }

    return AUTH_ACTION_COLOR;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled || loading}
      style={(state) => {
        const { pressed, hovered = false } = state as PressableState;

        return [
          styles.button,
          compact && styles.compactButton,
          {
            backgroundColor: resolveBackgroundColor(hovered, pressed),
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.98 : hovered ? 1.01 : 1 }]
          }
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator color="#1f1f1f" size="small" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)'
  },
  compactButton: {
    width: 120,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 0
  },
  label: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '800'
  }
});
