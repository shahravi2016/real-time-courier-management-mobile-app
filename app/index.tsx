import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
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
                <Stack.Screen options={{ headerShown: false }} />
                <LoadingState message="Loading dashboard..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={globalStyles.title}>Dashboard</Text>
                    <Text style={styles.subtitle}>Courier Management</Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {/* Summary Row */}
                    <View style={styles.statsRow}>
                        <StatCard
                            icon="📦"
                            label="Total Couriers"
                            value={stats.total}
                            color={colors.primary}
                        />
                        <View style={{ width: spacing.sm }} />
                        <StatCard
                            icon="⏳"
                            label="Pending"
                            value={stats.pending}
                            color={colors.pending}
                        />
                    </View>

                    {/* Progress Row 1 */}
                    <View style={styles.statsRow}>
                        <StatCard
                            icon="🥡"
                            label="Picked Up"
                            value={stats.pickedUp}
                            color={colors.pickedUp}
                        />
                        <View style={{ width: spacing.sm }} />
                        <StatCard
                            icon="🚚"
                            label="In Transit"
                            value={stats.inTransit}
                            color={colors.inTransit}
                        />
                    </View>

                    {/* Progress Row 2 */}
                    <View style={styles.statsRow}>
                        <StatCard
                            icon="📤"
                            label="Out for Delivery"
                            value={stats.outForDelivery}
                            color={colors.outForDelivery}
                        />
                        <View style={{ width: spacing.sm }} />
                        <StatCard
                            icon="✅"
                            label="Delivered"
                            value={stats.delivered}
                            color={colors.delivered}
                        />
                    </View>

                    {/* Final Row */}
                    <View style={styles.statsRow}>
                        <StatCard
                            icon="❌"
                            label="Cancelled"
                            value={stats.cancelled}
                            color={colors.cancelled}
                        />
                        <View style={{ width: spacing.sm }} />
                        <StatCard
                            icon="💰"
                            label="Total Revenue"
                            value={`$${stats.revenue.toFixed(2)}`}
                            color={colors.success}
                        />
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    {/* We need to fetch recent couriers. Since we can't easily do a second query hook here without refactoring,
                         we'll just use a Link to the full list for now or refactor to fetch recent.
                         Actually, let's just add a button to view all and maybe a quick summary if possible.
                         
                         Wait, I can use another useQuery here.
                     */}
                    <RecentActivityList />
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

function RecentActivityList() {
    const router = useRouter();
    const recent = useQuery(api.couriers.getRecent);

    if (!recent) return <LoadingState message="" />;

    if (recent.length === 0) {
        return (
            <View style={globalStyles.card}>
                <Text style={globalStyles.textSecondary}>No recent activity</Text>
            </View>
        );
    }

    return (
        <View style={{ gap: spacing.sm }}>
            {recent.map((courier) => (
                <Pressable
                    key={courier._id}
                    style={globalStyles.card}
                    onPress={() => router.push(`/couriers/${courier._id}`)}
                >
                    <View style={globalStyles.spaceBetween}>
                        <View>
                            <Text style={[globalStyles.text, { fontWeight: '600' }]}>{courier.trackingId}</Text>
                            <Text style={globalStyles.textSecondary}>{courier.receiverName}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[globalStyles.text, { fontSize: fontSize.sm, color: colors.primary }]}>
                                {courier.currentStatus.replace('_', ' ').toUpperCase()}
                            </Text>
                            <Text style={[globalStyles.textSecondary, { fontSize: fontSize.xs }]}>
                                {new Date(courier.updatedAt).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                </Pressable>
            ))}
        </View>
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
