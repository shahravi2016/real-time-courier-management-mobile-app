import { StyleSheet, Platform } from 'react-native';

// Enterprise Palette - Clean, Professional, High Contrast
export const colors = {
    // Backgrounds
    background: '#000000', // True Black
    surface: '#121212',     // Dark Gray for depth
    surfaceHighlight: '#1E1E1E',
    surfaceElevated: '#1A1A1A',

    // Borders
    border: '#2A2A2A',
    borderLight: '#3A3A3A',

    // Text
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#666666',
    textInverse: '#000000',

    // Brand / Primary
    primary: '#2563EB',
    primaryDark: '#1E40AF',
    primaryLight: '#60A5FA',

    // Semantic / Status
    success: '#10B981',
    successBg: 'rgba(16, 185, 129, 0.1)',

    warning: '#F59E0B',
    warningBg: 'rgba(245, 158, 11, 0.1)',

    error: '#EF4444',
    errorBg: 'rgba(239, 68, 68, 0.1)',

    info: '#06B6D4',
    infoBg: 'rgba(6, 182, 212, 0.1)',

    // Specific Statuses
    pending: '#F59E0B',
    pickedUp: '#8B5CF6',
    inTransit: '#3B82F6',
    outForDelivery: '#06B6D4',
    delivered: '#10B981',
    cancelled: '#EF4444',

    // UI Elements
    card: '#121212',
    modalOverlay: 'rgba(0, 0, 0, 0.85)',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
};

export const fontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    circle: 9999,
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

    // Typography
    title: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.5,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        fontWeight: '400',
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
        marginTop: spacing.xl,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Cards
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },

    // Inputs
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm + 4,
        paddingHorizontal: spacing.md,
        fontSize: fontSize.md,
        color: colors.text,
    },

    // Buttons
    button: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: fontSize.md,
        fontWeight: '600',
    },
    buttonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.borderLight,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    buttonSecondaryText: {
        color: colors.text,
        fontSize: fontSize.md,
        fontWeight: '500',
    },
    buttonDestructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: colors.error,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    buttonDestructiveText: {
        color: colors.error,
        fontWeight: '600',
    },

    // Layout
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Status Badges
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
    },
    badgeText: {
        fontSize: fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
    },

    // Text
    text: {
        fontSize: fontSize.md,
        color: colors.text,
    },
    textSecondary: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
});

