import { StyleSheet } from 'react-native';

// Minimalist color palette
export const colors = {
    background: '#0A0A0B',
    surface: '#141416',
    surfaceElevated: '#1C1C1F',
    border: '#2A2A2E',

    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',

    primary: '#3B82F6',
    primaryLight: '#60A5FA',

    // Status colors
    pending: '#F59E0B',
    pickedUp: '#8B5CF6',
    inTransit: '#3B82F6',
    outForDelivery: '#06B6D4',
    delivered: '#10B981',
    cancelled: '#EF4444',

    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const fontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
};

export const globalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    screenPadding: {
        paddingHorizontal: spacing.md,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    text: {
        fontSize: fontSize.md,
        color: colors.text,
    },
    textSecondary: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.sm + 4,
        paddingHorizontal: spacing.lg,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: colors.text,
        fontSize: fontSize.md,
        fontWeight: '600',
    },
    buttonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.sm + 4,
        paddingHorizontal: spacing.lg,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingVertical: spacing.sm + 4,
        paddingHorizontal: spacing.md,
        fontSize: fontSize.md,
        color: colors.text,
    },
});
