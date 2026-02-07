import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { StatCard, LoadingState } from '../src/components';
import { colors, spacing, fontSize, globalStyles } from '../src/styles/theme';

export default function DashboardScreen() {
    const router = useRouter();
    const stats = useQuery(api.couriers.getStats);

    if (!stats) {
        return (
            <SafeAreaView style={globalStyles.safeArea}>
                <LoadingState message="Loading dashboard..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={globalStyles.title}>Dashboard</Text>
                    <Text style={styles.subtitle}>Courier Management</Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statsRow}>
                        <StatCard
                            icon="📦"
                            label="Total"
                            value={stats.total}
                            color={colors.primary}
                        />
                        <View style={{ width: spacing.sm }} />
                        <StatCard
                            icon="✅"
                            label="Delivered"
                            value={stats.delivered}
                            color={colors.delivered}
                        />
                    </View>
                    <View style={styles.statsRow}>
                        <StatCard
                            icon="⏳"
                            label="Pending"
                            value={stats.pending}
                            color={colors.pending}
                        />
                        <View style={{ width: spacing.sm }} />
                        <StatCard
                            icon="🚚"
                            label="In Transit"
                            value={stats.inTransit}
                            color={colors.inTransit}
                        />
                    </View>
                    <View style={styles.statsRow}>
                        <StatCard
                            icon="📤"
                            label="Out"
                            value={stats.outForDelivery}
                            color={colors.outForDelivery}
                        />
                        <View style={{ width: spacing.sm }} />
                        <StatCard
                            icon="❌"
                            label="Cancelled"
                            value={stats.cancelled}
                            color={colors.cancelled}
                        />
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    <Pressable
                        style={({ pressed }) => [
                            globalStyles.button,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={() => router.push('/couriers/add')}
                    >
                        <Text style={globalStyles.buttonText}>+ Add New Courier</Text>
                    </Pressable>

                    <View style={{ height: spacing.sm }} />

                    <Pressable
                        style={({ pressed }) => [
                            globalStyles.buttonSecondary,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={() => router.push('/couriers')}
                    >
                        <Text style={[globalStyles.buttonText, { color: colors.text }]}>
                            View All Couriers
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    header: {
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
    },
    subtitle: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    statsGrid: {
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    statsRow: {
        flexDirection: 'row',
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
});
