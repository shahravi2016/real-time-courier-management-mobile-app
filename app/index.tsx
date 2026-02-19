import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { StatCard, LoadingState, ErrorState } from '../src/components';
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
    const isAdmin = user?.role === 'admin';
    const isAgent = user?.role === 'agent';
    const isCustomer = user?.role === 'customer';

    const stats = useQuery(api.couriers.getStats);
    const agentStats = useQuery(api.couriers.getAgentStats,
        (user?._id && isAgent) ? { userId: user._id as any } : "skip" as any
    );
    const customerStats = useQuery(api.couriers.getCustomerStats,
        (user?._id && isCustomer) ? { userId: user._id as any } : "skip" as any
    );
    const branches = useQuery(api.branches.list);
    const myCouriers = useQuery(api.couriers.getMyCouriers,
        (user?._id && !isAdmin) ? { userId: user._id as any, role: user.role as any } : "skip" as any
    );
    const createBranch = useMutation(api.branches.create);

    const [showAddBranch, setShowAddBranch] = useState(false);
    const [branchName, setBranchName] = useState('');
    const [branchAddress, setBranchAddress] = useState('');
    const [isCreatingBranch, setIsCreatingBranch] = useState(false);

    const handleAddBranch = async () => {
        const name = branchName.trim();
        const address = branchAddress.trim();

        if (!name || !address) {
            Alert.alert('Validation Error', 'Both branch name and address are required.');
            return;
        }

        if (name.length < 3) {
            Alert.alert('Validation Error', 'Branch name must be at least 3 characters long.');
            return;
        }

        if (address.length < 10) {
            Alert.alert('Validation Error', 'Please provide a more detailed address (min 10 characters).');
            return;
        }

        // Check for duplicate names locally if possible
        const isDuplicate = branches?.some(b => b.name.toLowerCase() === name.toLowerCase());
        if (isDuplicate) {
            Alert.alert('Duplicate Branch', 'A branch with this name already exists.');
            return;
        }

        setIsCreatingBranch(true);
        try {
            await createBranch({ name, address });
            setBranchName('');
            setBranchAddress('');
            setShowAddBranch(false);
            Alert.alert('Success', 'Branch created successfully');
        } catch (e) {
            console.error('Branch creation error:', e);
            Alert.alert('System Error', 'Failed to create branch. Please check your connection.');
        } finally {
            setIsCreatingBranch(false);
        }
    };

    if (authLoading || !stats) {
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
                    <View>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        <Text style={globalStyles.title}>
                            {isAdmin ? 'Admin Console' : isAgent ? 'Agent Console' : 'Customer Console'}
                        </Text>
                    </View>
                    <Pressable onPress={logout} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={24} color={colors.error} />
                    </Pressable>
                </View>

                {/* Main Actions */}
                <View style={styles.mainActions}>
                    <Pressable
                        style={({ pressed }) => [styles.primaryAction, pressed && styles.buttonPressed]}
                        onPress={() => router.push('/couriers')}
                    >
                        <Ionicons name="list" size={24} color="#fff" />
                        <Text style={styles.primaryActionText}>View All Couriers</Text>
                    </Pressable>

                    {isAdmin && (
                        <Pressable
                            style={({ pressed }) => [styles.secondaryAction, pressed && styles.buttonPressed]}
                            onPress={() => router.push('/couriers/add')}
                        >
                            <Ionicons name="add-circle" size={24} color={colors.primary} />
                            <Text style={styles.secondaryActionText}>Add Courier</Text>
                        </Pressable>
                    )}
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {isAdmin ? (
                        <>
                            <View style={styles.statsRow}>
                                <StatCard
                                    label="Total"
                                    value={stats.total}
                                    icon="cube-outline"
                                    color={colors.primary}
                                />
                                <View style={{ width: spacing.sm }} />
                                <StatCard
                                    label="Delivered"
                                    value={stats.delivered}
                                    icon="checkmark-circle-outline"
                                    color={colors.success}
                                />
                            </View>
                            <View style={styles.statsRow}>
                                <StatCard
                                    label="In Transit"
                                    value={stats.inTransit}
                                    icon="airplane-outline"
                                    color="#E67E22"
                                />
                                <View style={{ width: spacing.sm }} />
                                <StatCard
                                    label="Revenue"
                                    value={`$${stats.revenue}`}
                                    icon="wallet-outline"
                                    color="#3498DB"
                                />
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Agent Specific Stats */}
                            {isAgent && (
                                <>
                                    <View style={styles.statsRow}>
                                        <StatCard
                                            label="Total Jobs"
                                            value={agentStats?.totalJobs || 0}
                                            icon="list-outline"
                                            color={colors.primary}
                                        />
                                        <View style={{ width: spacing.sm }} />
                                        <StatCard
                                            label="Completed"
                                            value={agentStats?.completedJobs || 0}
                                            icon="checkmark-done-outline"
                                            color={colors.success}
                                        />
                                    </View>
                                    <View style={styles.statsRow}>
                                        <StatCard
                                            label="Active Jobs"
                                            value={agentStats?.activeJobs || 0}
                                            icon="bicycle-outline"
                                            color="#E67E22"
                                        />
                                        <View style={{ width: spacing.sm }} />
                                        <StatCard
                                            label="Earnings"
                                            value={`$${agentStats?.earnings?.toFixed(2) || '0.00'}`}
                                            icon="cash-outline"
                                            color={colors.primary}
                                        />
                                    </View>

                                    {/* Target Progress Bar */}
                                    <View style={styles.targetSection}>
                                        <View style={styles.targetHeader}>
                                            <Text style={styles.targetLabel}>Monthly Delivery Target</Text>
                                            <Text style={styles.targetValue}>
                                                {agentStats?.completedJobs || 0} / {agentStats?.target || 50}
                                            </Text>
                                        </View>
                                        <View style={styles.progressBarBg}>
                                            <View
                                                style={[
                                                    styles.progressBarFill,
                                                    { width: `${Math.min(((agentStats?.completedJobs || 0) / (agentStats?.target || 50)) * 100, 100)}%` }
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.targetMuted}>Keep going! You're doing great.</Text>
                                    </View>
                                </>
                            )}

                            {/* Customer Stats Card */}
                            {isCustomer && (
                                <View style={styles.statsGrid}>
                                    <View style={styles.statsRow}>
                                        <StatCard
                                            label="Incoming/Outgoing"
                                            value={customerStats?.total || 0}
                                            icon="cube-outline"
                                            color={colors.primary}
                                        />
                                        <View style={{ width: spacing.sm }} />
                                        <StatCard
                                            label="In Transit"
                                            value={customerStats?.inTransit || 0}
                                            icon="airplane-outline"
                                            color="#E67E22"
                                        />
                                    </View>
                                    <View style={styles.statsRow}>
                                        <StatCard
                                            label="Delivered"
                                            value={customerStats?.delivered || 0}
                                            icon="checkmark-circle-outline"
                                            color={colors.success}
                                        />
                                        <View style={{ width: spacing.sm }} />
                                        <StatCard
                                            label="Needs Attention"
                                            value={customerStats?.pending || 0}
                                            icon="alert-circle-outline"
                                            color={colors.error}
                                        />
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Agent/Customer Jobs List */}
                {!isAdmin && (
                    <View style={[styles.section, { marginTop: spacing.sm }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {isCustomer ? 'Recent Parcels' : 'My Assigned Jobs'}
                            </Text>
                            <Pressable onPress={() => router.push('/couriers')}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </Pressable>
                        </View>
                        {myCouriers && myCouriers.length > 0 ? (
                            myCouriers.slice(0, 3).map((job) => (
                                <Pressable
                                    key={job._id}
                                    style={styles.jobCard}
                                    onPress={() => router.push(`/couriers/${job._id}`)}
                                >
                                    <View style={styles.jobIcon}>
                                        <Ionicons name="cube" size={20} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.jobId}>{job.trackingId}</Text>
                                        <Text style={styles.jobDetail}>{job.receiverName} • {job.deliveryAddress}</Text>
                                    </View>
                                    <View style={[styles.statusTag, { backgroundColor: colors.primary + '20' }]}>
                                        <Text style={[styles.statusTagText, { color: colors.primary }]}>
                                            {job.currentStatus.replace('_', ' ')}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))
                        ) : (
                            <View style={styles.emptyJobs}>
                                <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                                <Text style={styles.emptyJobsText}>No jobs assigned to you yet.</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Branch Management (Admin Only) */}
                {isAdmin && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Branch Management</Text>
                            <Pressable
                                style={styles.addBranchButton}
                                onPress={() => setShowAddBranch(!showAddBranch)}
                            >
                                <Ionicons
                                    name={showAddBranch ? "close" : "add"}
                                    size={20}
                                    color={showAddBranch ? colors.error : colors.primary}
                                />
                                <Text style={[styles.addBranchText, showAddBranch && { color: colors.error }]}>
                                    {showAddBranch ? "Cancel" : "Add Branch"}
                                </Text>
                            </Pressable>
                        </View>

                        {showAddBranch && (
                            <View style={[globalStyles.card, styles.addBranchCard]}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Branch Name</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={branchName}
                                        onChangeText={setBranchName}
                                        placeholder="e.g. Downtown Hub"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>

                                <View style={[styles.inputGroup, { marginTop: spacing.md }]}>
                                    <Text style={styles.inputLabel}>Address</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={branchAddress}
                                        onChangeText={setBranchAddress}
                                        placeholder="Enter full address"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>

                                <Pressable
                                    style={[styles.miniButton, (isCreatingBranch || !branchName || !branchAddress) && { opacity: 0.5 }]}
                                    onPress={handleAddBranch}
                                    disabled={isCreatingBranch || !branchName || !branchAddress}
                                >
                                    <Text style={styles.miniButtonText}>
                                        {isCreatingBranch ? "Creating..." : "Confirm & Save Branch"}
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.branchScroll}>
                            {branches?.map(b => (
                                <View key={b._id} style={styles.branchChip}>
                                    <Ionicons name="business-outline" size={12} color={colors.primary} />
                                    <Text style={styles.branchChipText}>{b.name}</Text>
                                </View>
                            ))}
                            {(!branches || branches.length === 0) && (
                                <Text style={styles.noData}>No branches setup yet.</Text>
                            )}
                        </ScrollView>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView >
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
    welcomeText: {
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
    mainActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    primaryAction: {
        flex: 1.5,
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryActionText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: fontSize.md,
    },
    secondaryAction: {
        flex: 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    secondaryActionText: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: fontSize.md,
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
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    addBranchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addBranchText: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.primary,
    },
    addBranchCard: {
        marginBottom: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.surfaceElevated,
    },
    inputGroup: {
        gap: 4,
    },
    inputLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    textInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: spacing.sm,
        color: colors.text,
        fontSize: fontSize.md,
    },
    miniButton: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    miniButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: fontSize.sm,
    },
    branchScroll: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    branchChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    branchChipText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    noData: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    viewAllText: {
        color: colors.primary,
        fontSize: fontSize.sm,
        fontWeight: '600',
    },
    jobCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: 12,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    jobIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
    jobId: {
        fontSize: fontSize.sm,
        fontWeight: 'bold',
        color: colors.text,
    },
    jobDetail: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    statusTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusTagText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    emptyJobs: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    emptyJobsText: {
        color: colors.textMuted,
        fontSize: fontSize.sm,
    },
    targetSection: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.md,
        marginTop: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    targetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    targetLabel: {
        fontSize: fontSize.sm,
        color: colors.text,
        fontWeight: '600',
    },
    targetValue: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: 'bold',
    },
    progressBarBg: {
        height: 10,
        backgroundColor: colors.border,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: spacing.xs,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 5,
    },
    targetMuted: {
        fontSize: 11,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
});
