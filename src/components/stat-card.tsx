import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
    icon: string;
    label: string;
    value: number | string;
    color?: string;
}

export function StatCard({ icon, label, value, color = colors.primary }: StatCardProps) {
    return (
        <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon as any} size={22} color={color} />
            </View>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.md,
        alignItems: 'center',
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    value: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    label: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
