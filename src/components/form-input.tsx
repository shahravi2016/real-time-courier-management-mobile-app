import React from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, fontSize, globalStyles, borderRadius } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';

interface FormInputProps {
    label: string;
    value: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    multiline?: boolean;
    keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
    error?: string;
    maxLength?: number;
    icon?: keyof typeof Ionicons.prototype.name | any;
    onPress?: () => void;
    editable?: boolean;
}

export function FormInput({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    keyboardType = 'default',
    error,
    maxLength,
    icon,
    onPress,
    editable = true,
}: FormInputProps) {
    const InputComponent = onPress ? Pressable : View;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <InputComponent onPress={onPress} style={styles.inputWrapper}>
                <TextInput
                    style={[
                        globalStyles.input,
                        styles.input,
                        multiline && styles.multiline,
                        error && styles.inputError,
                        icon && { paddingRight: 45 },
                        !editable && { color: colors.text },
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    multiline={multiline}
                    numberOfLines={multiline ? 3 : 1}
                    keyboardType={keyboardType}
                    maxLength={maxLength}
                    editable={editable && !onPress}
                    pointerEvents={onPress ? 'none' : 'auto'}
                />
                {icon && (
                    <View style={styles.iconContainer}>
                        <Ionicons name={icon} size={20} color={colors.primary} />
                    </View>
                )}
            </InputComponent>
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
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        width: '100%',
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
    iconContainer: {
        position: 'absolute',
        right: 12,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        width: 30,
    }
});
