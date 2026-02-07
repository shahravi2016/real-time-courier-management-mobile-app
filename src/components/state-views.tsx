import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../styles/theme';

interface LoadingStateProps {
    message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.message}>{message}</Text>
        </View>
    );
}

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong' }: ErrorStateProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.errorMessage}>{message}</Text>
        </View>
    );
}

interface EmptyStateProps {
    icon?: string;
    title: string;
    message?: string;
}

export function EmptyState({ icon = '📦', title, message }: EmptyStateProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.emptyIcon}>{icon}</Text>
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    icon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    message: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: fontSize.md,
        color: colors.error,
        textAlign: 'center',
    },
});
