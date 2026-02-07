import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, globalStyles } from '../styles/theme';

interface FormInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    multiline?: boolean;
    keyboardType?: 'default' | 'phone-pad' | 'email-address';
    error?: string;
}

export function FormInput({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    keyboardType = 'default',
    error,
}: FormInputProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[
                    globalStyles.input,
                    multiline && styles.multiline,
                    error && styles.inputError,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                multiline={multiline}
                numberOfLines={multiline ? 3 : 1}
                keyboardType={keyboardType}
            />
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    multiline: {
        minHeight: 80,
        textAlignVertical: 'top',
        paddingTop: spacing.sm,
    },
    inputError: {
        borderColor: colors.error,
    },
    error: {
        fontSize: fontSize.xs,
        color: colors.error,
        marginTop: spacing.xs,
    },
});
