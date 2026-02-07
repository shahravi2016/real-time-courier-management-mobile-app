import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../styles/theme';

interface StatCardProps {
    icon: string;
    label: string;
    value: number;
    color?: string;
}

export function StatCard({ icon, label, value, color = colors.primary }: StatCardProps) {
    return (
        <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Text style={styles.icon}>{icon}</Text>
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
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    icon: {
        fontSize: 20,
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
