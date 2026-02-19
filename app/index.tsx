import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { StatCard, LoadingState } from '../src/components';
import { colors, spacing, fontSize, globalStyles } from '../src/styles/theme';
import { useAuth } from '../src/components/auth-context';
import { Ionicons } from '@expo/vector-icons';

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
}

export default function DashboardScreen() {
    const router = useRouter();
    const { user, logout, isLoading: authLoading } = useAuth();
    const stats = useQuery(api.couriers.getStats);

    if (authLoading || !stats) {
        return (
            <SafeAreaView style={globalStyles.safeArea}>
                <Stack.Screen options={{ headerShown: false }} />
                <LoadingState message="Loading dashboard..." />
            </SafeAreaView>
        );
    }

    const isAdmin = user?.role === 'admin';

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{getGreeting()}</Text>
                        <Text style={globalStyles.title}>{user?.name || 'Dashboard'}</Text>
                        <Text style={styles.roleBadge}>{user?.role?.toUpperCase()}</Text>
                    </View>
                    <Pressable onPress={logout} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
                    </Pressable>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statsRow}>
                        <StatCard
                            icon="cube-outline"
                            label="Total Couriers"
                            value={stats.total}
                            color={colors.primary}
                        />
                        <View style={{ width: spacing.sm }} />
                        <StatCard
                            icon="time-outline"
                            label="Pending"
                            value={stats.pending}
                            color={colors.pending}
                        />
                    </View>

                    <View style={styles.statsRow}>
                        <StatCard
                            icon="bag-check-outline"
                            label="Picked Up"
                            value={stats.pickedUp}
                            color={colors.pickedUp}
                        />
                        <View style={{ width: spacing.sm }} />
                        <StatCard
                            icon="car-outline"
                            label="In Transit"
                            value={stats.inTransit}
                            color={colors.inTransit}
                        />
                    </View>

                    <View style={styles.statsRow}>
                        <StatCard
                            icon="bicycle-outline"
                            label="Out for Delivery"
                            value={stats.outForDelivery}
                            color={colors.outForDelivery}
                        />
                        <View style={{ width: spacing.sm }} />
                        <StatCard
                            icon="checkmark-circle-outline"
                            label="Delivered"
                            value={stats.delivered}
                            color={colors.delivered}
                        />
                    </View>

                    <View style={styles.statsRow}>
                        <StatCard
                            icon="close-circle-outline"
                            label="Cancelled"
                            value={stats.cancelled}
                            color={colors.cancelled}
                        />
                        <View style={{ width: spacing.sm }} />
                        <StatCard
                            icon="wallet-outline"
                            label="Revenue"
                            value={`$${stats.revenue.toFixed(2)}`}
                            color={colors.success}
                        />
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <RecentActivityList />
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    {isAdmin && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.actionButton,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={() => router.push('/couriers/add')}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: spacing.sm }} />
                            <Text style={globalStyles.buttonText}>Add New Courier</Text>
                        </Pressable>
                    )}

                    <View style={{ height: spacing.sm }} />

                    <Pressable
                        style={({ pressed }) => [
                            globalStyles.buttonSecondary,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={() => router.push('/couriers')}
                    >
                        <Ionicons name="list-outline" size={20} color={colors.text} style={{ marginRight: spacing.sm }} />
                        <Text style={[globalStyles.buttonText, { color: colors.text }]}>
                            View All Couriers
                        </Text>
                    </Pressable>
                </View>

                <View style={{ height: spacing.xxl }} />
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
                    style={({ pressed }) => [
                        globalStyles.card,
                        pressed && { backgroundColor: colors.surfaceElevated },
                    ]}
                    onPress={() => router.push(`/couriers/${courier._id}`)}
                >
                    <View style={globalStyles.spaceBetween}>
                        <View style={{ flex: 1 }}>
                            <Text style={[globalStyles.text, { fontWeight: '600' }]}>{courier.trackingId}</Text>
                            <Text style={globalStyles.textSecondary}>{courier.receiverName}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[globalStyles.text, { fontSize: fontSize.sm, color: colors.primary }]}>
                                {courier.currentStatus.replace(/_/g, ' ').toUpperCase()}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    greeting: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    roleBadge: {
        fontSize: fontSize.xs,
        color: colors.primary,
        fontWeight: '600',
        marginTop: spacing.xs,
        letterSpacing: 0.5,
    },
    logoutButton: {
        padding: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
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
    actionButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
});
