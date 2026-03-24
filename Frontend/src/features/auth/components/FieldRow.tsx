import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type FieldRowProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export function FieldRow({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize
}: FieldRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  label: {
    width: 86,
    fontSize: 11,
    fontWeight: '700',
    color: '#273431'
  },
  input: {
    flex: 1,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#545454',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#1f1f1f'
  }
});
