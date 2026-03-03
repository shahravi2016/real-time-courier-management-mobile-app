import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, Platform, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { StatCard, LoadingState, ErrorState, Logo, AnalyticsChart } from '../src/components';
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
    const isBranchManager = user?.role === 'branch_manager';
    const isAgent = user?.role === 'agent';
    const isCustomer = user?.role === 'customer';

    // Role-based redirection logic
    React.useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login');
        }
    }, [user, authLoading]);

    const stats = useQuery(api.couriers.getStats, 
        isBranchManager ? { branchId: user?.branchId as any } : {}
    );
    const adminDashboardStats = useQuery(api.couriers.getAdminDashboardStats, 
        isAdmin ? {} : "skip"
    );
    const branchDashboardStats = useQuery(api.couriers.getBranchDashboardStats, 
        (isBranchManager && user?.branchId) ? { branchId: user.branchId as any } : "skip"
    );
    
    const agentStats = useQuery(api.couriers.getAgentStats,
        (user?._id && isAgent) ? { userId: user._id as any } : "skip" as any
    );
    const customerStats = useQuery(api.couriers.getCustomerStats,
        (user?._id && isCustomer) ? { userId: user._id as any } : "skip" as any
    );
    const branches = useQuery(api.branches.list);
    const managers = useQuery(api.users.listManagers);
    const agents = useQuery(api.users.listAgents);
    const myCouriers = useQuery(api.couriers.getMyCouriers,
        (user?._id && (isAgent || isCustomer)) ? { userId: user._id as any, role: user.role as any } : "skip" as any
    );
    const branchCouriers = useQuery(api.couriers.list, 
        (isBranchManager && user?.branchId) ? { branchId: user.branchId as any } : "skip"
    );
    const createBranch = useMutation(api.branches.create);
    const updateBranch = useMutation(api.branches.update);
    const removeBranch = useMutation(api.branches.remove);
    const createManager = useMutation(api.users.createManager);
    const updateManager = useMutation(api.users.updateManager);
    const createAgent = useMutation(api.users.createAgent);
    const updateAgent = useMutation(api.users.updateAgent);
    const assignAgentToBranch = useMutation(api.users.updateBranch);
    const removeUser = useMutation(api.users.removeUser);

    const [showAddBranch, setShowAddBranch] = useState(false);
    const [showAddManager, setShowAddManager] = useState(false);
    const [showAddAgent, setShowAddAgent] = useState(false);
    const [showAssignAgent, setShowAssignAgent] = useState(false);
    const [showManagerDetailModal, setShowManagerDetailModal] = useState(false);
    const [showAgentDetailModal, setShowAgentDetailModal] = useState(false);
    const [showBranchDetailModal, setShowBranchDetailModal] = useState(false);
    const [selectedManager, setSelectedManager] = useState<any>(null);
    const [selectedAgent, setSelectedAgent] = useState<any>(null);
    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    
    const [branchName, setBranchName] = useState('');
    const [branchAddress, setBranchAddress] = useState('');
    const [isCreatingBranch, setIsCreatingBranch] = useState(false);
    const [isUpdatingBranch, setIsUpdatingBranch] = useState(false);
    const [isDeletingBranch, setIsDeletingBranch] = useState(false);
    const [isDeletingManager, setIsDeletingManager] = useState(false);
    const [isDeletingAgent, setIsDeletingAgent] = useState(false);

    // Manager Edit State
    const [isEditingManagerProfile, setIsEditingManagerProfile] = useState(false);
    const [isUpdatingManagerProfile, setIsUpdatingManagerProfile] = useState(false);
    const [editMgrName, setEditMgrName] = useState('');
    const [editMgrEmail, setEditMgrEmail] = useState('');
    const [editMgrPassword, setEditMgrPassword] = useState('');
    const [editMgrBranchId, setEditMgrBranchId] = useState('');

    // Agent Edit State
    const [isEditingAgentProfile, setIsEditingAgentProfile] = useState(false);
    const [isUpdatingAgentProfile, setIsUpdatingAgentProfile] = useState(false);
    const [editAgentName, setEditAgentName] = useState('');
    const [editAgentEmail, setEditAgentEmail] = useState('');
    const [editAgentPassword, setEditAgentPassword] = useState('');
    const [editAgentBranchId, setEditAgentBranchId] = useState('');

    const handleUpdateManagerProfile = async () => {
        if (!selectedManager || !editMgrName || !editMgrEmail || !editMgrPassword || !editMgrBranchId) {
            Alert.alert('Error', 'All fields are required.');
            return;
        }

        setIsUpdatingManagerProfile(true);
        try {
            await updateManager({
                id: selectedManager._id,
                name: editMgrName,
                email: editMgrEmail,
                password: editMgrPassword,
                branchId: editMgrBranchId as any,
            });
            setIsEditingManagerProfile(false);
            setShowManagerDetailModal(false);
            Alert.alert('Success', 'Manager profile updated.');
        } catch (e: any) {
            Alert.alert('Update Failed', e.message || 'Check connection.');
        } finally {
            setIsUpdatingManagerProfile(false);
        }
    };

    const handleDeleteBranch = (id: string, name: string) => {
        Alert.alert(
            'Delete Branch',
            `Are you sure you want to delete ${name}? All data associated with this hub will be affected.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeletingBranch(true);
                        try {
                            await removeBranch({ id: id as any });
                            setShowBranchDetailModal(false);
                            Alert.alert('Success', 'Branch hub removed.');
                        } catch (e) {
                            Alert.alert('Error', 'Failed to remove branch.');
                        } finally {
                            setIsDeletingBranch(false);
                        }
                    }
                }
            ]
        );
    };

    const handleUpdateBranch = async () => {
        if (!selectedBranch || !branchName || !branchAddress) {
            Alert.alert('Error', 'Name and Address are required.');
            return;
        }

        setIsUpdatingBranch(true);
        try {
            await updateBranch({
                id: selectedBranch._id,
                name: branchName,
                address: branchAddress,
            });
            setShowBranchDetailModal(false);
            Alert.alert('Success', 'Branch details updated.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to update branch');
        } finally {
            setIsUpdatingBranch(false);
        }
    };
                
                    // Manager Form State
                    const [mgrName, setMgrName] = useState('');
                    const [mgrEmail, setMgrEmail] = useState('');
                    const [mgrPassword, setMgrPassword] = useState('');
                    const [mgrBranchId, setMgrBranchId] = useState('');
                    const [isCreatingManager, setIsCreatingManager] = useState(false);
                
                    // Agent Form State
                    const [agentName, setAgentName] = useState('');
                    const [agentEmail, setAgentEmail] = useState('');
                    const [agentPassword, setAgentPassword] = useState('');
                    const [agentBranchId, setAgentBranchId] = useState('');
                    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
                
                    const handleAddAgent = async () => {
                        if (!agentName || !agentEmail || !agentPassword) {
                            Alert.alert('Error', 'Name, Email and Password are required.');
                            return;
                        }
                
                        setIsCreatingAgent(true);
                        try {
                            await createAgent({
                                name: agentName,
                                email: agentEmail,
                                password: agentPassword,
                                branchId: agentBranchId ? agentBranchId as any : undefined,
                            });
                            setAgentName('');
                            setAgentEmail('');
                            setAgentPassword('');
                            setAgentBranchId('');
                            setShowAddAgent(false);
                            Alert.alert('Success', 'Delivery agent account created.');
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to create agent');
                        } finally {
                            setIsCreatingAgent(false);
                        }
                    };
            
                    const handleDeleteAgent = (id: string, name: string) => {
                        Alert.alert(
                            'Delete Delivery Agent',
                            `Are you sure you want to delete ${name}? This will remove them from the fleet and revoke access.`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: async () => {
                                        setIsDeletingAgent(true);
                                        try {
                                            await removeUser({ id: id as any });
                                            setShowAgentDetailModal(false);
                                            Alert.alert('Success', 'Agent account removed.');
                                        } catch (e) {
                                            Alert.alert('Error', 'Failed to remove agent.');
                                        } finally {
                                            setIsDeletingAgent(false);
                                        }
                                    }
                                }
                            ]
                        );
                    };
                
                    const handleDeleteManager = (id: string, name: string) => {            Alert.alert(
                'Delete Manager',
                `Are you sure you want to delete ${name}? This will revoke their access to the system.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            setIsDeletingManager(true);
                            try {
                                await removeUser({ id: id as any });
                                setShowManagerDetailModal(false);
                                Alert.alert('Success', 'Manager account removed.');
                            } catch (e) {
                                Alert.alert('Error', 'Failed to remove manager.');
                            } finally {
                                setIsDeletingManager(false);
                            }
                        }
                    }
                ]
            );
        };
    
        // Agent Assignment State
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [isAssigningAgent, setIsAssigningAgent] = useState(false);

    const handleAssignAgent = async () => {
        if (!selectedAgentId || !selectedBranchId) {
            Alert.alert('Error', 'Please select both an agent and a branch.');
            return;
        }

        setIsAssigningAgent(true);
        try {
            await assignAgentToBranch({
                id: selectedAgentId as any,
                branchId: selectedBranchId as any,
            });
            setSelectedAgentId('');
            setSelectedBranchId('');
            setShowAssignAgent(false);
            Alert.alert('Success', 'Agent assigned to branch.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to assign agent');
        } finally {
            setIsAssigningAgent(false);
        }
    };

    const handleAddManager = async () => {
        if (!mgrName || !mgrEmail || !mgrPassword || !mgrBranchId) {
            Alert.alert('Error', 'Please fill all manager details including branch.');
            return;
        }

        setIsCreatingManager(true);
        try {
            await createManager({
                name: mgrName,
                email: mgrEmail,
                password: mgrPassword,
                branchId: mgrBranchId as any,
            });
            setMgrName('');
            setMgrEmail('');
            setMgrPassword('');
            setMgrBranchId('');
            setShowAddManager(false);
            Alert.alert('Success', 'Branch Manager created and assigned.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to create manager');
        } finally {
            setIsCreatingManager(false);
        }
    };

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
                    <View style={styles.headerInfo}>
                        <Logo size={42} />
                        <View>
                            <Text style={styles.welcomeText}>Welcome back, {user?.name}</Text>
                            <Text style={globalStyles.title}>
                                {isAdmin ? 'Admin Console' : isBranchManager ? 'Branch Hub' : isAgent ? 'Agent Console' : 'Customer Console'}
                            </Text>
                            {isBranchManager && (
                                <Text style={styles.branchSubtext}>
                                    Managing: {branches?.find(b => b._id === user?.branchId)?.name || 'Loading branch...'}
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <Pressable onPress={() => router.push('/settings')} style={styles.iconButton}>
                            <Ionicons name="settings-outline" size={24} color={colors.text} />
                        </Pressable>
                        <Pressable onPress={logout} style={[styles.iconButton, { marginLeft: 12 }]}>
                            <Ionicons name="log-out-outline" size={24} color={colors.error} />
                        </Pressable>
                    </View>
                </View>

                {/* Main Actions */}
                <View style={styles.mainActions}>
                    <Pressable
                        style={({ pressed }) => [styles.primaryAction, pressed && styles.buttonPressed]}
                        onPress={() => router.push('/couriers')}
                    >
                        <Ionicons name="list" size={24} color="#fff" />
                        <Text style={styles.primaryActionText}>
                            {(isAdmin || isBranchManager) ? 'View All Couriers' : 'My Parcels'}
                        </Text>
                    </Pressable>

                    {(isAdmin || isCustomer || isBranchManager) && (
                        <Pressable
                            style={({ pressed }) => [styles.secondaryAction, pressed && styles.buttonPressed]}
                            onPress={() => router.push('/couriers/add')}
                        >
                            <Ionicons name="add-circle" size={24} color={colors.primary} />
                            <Text style={styles.secondaryActionText}>
                                {(isAdmin || isBranchManager) ? 'Add Courier' : 'Book a Parcel'}
                            </Text>
                        </Pressable>
                    )}
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {(isAdmin || isBranchManager) ? (
                        <>
                            <View style={styles.statsRow}>
                                <StatCard
                                    label="Booked"
                                    value={stats.booked}
                                    icon="receipt-outline"
                                    color={colors.primary}
                                />
                                <View style={{ width: spacing.sm }} />
                                <StatCard
                                    label="Picked Up"
                                    value={stats.pickedUp}
                                    icon="archive-outline"
                                    color={colors.pickedUp}
                                />
                            </View>
                            <View style={styles.statsRow}>
                                <StatCard
                                    label="Dispatched"
                                    value={stats.dispatched}
                                    icon="airplane-outline"
                                    color="#E67E22"
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
                                    label={isAdmin ? "Total Revenue" : "Branch Revenue"}
                                    value={`₹${stats.revenue}`}
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
                                            value={`₹${agentStats?.earnings?.toFixed(2) || '0.00'}`}
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

                                    {/* Earnings Explanation */}
                                    <View style={[globalStyles.card, { marginTop: spacing.md, backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                                            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14 }}>Earnings Structure</Text>
                                        </View>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
                                            For every successful delivery (Status: Delivered), you earn a <Text style={{ color: colors.text, fontWeight: '600' }}>10% commission</Text> of the total parcel price. Earnings are automatically updated in your wallet after completion.
                                        </Text>
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

                {/* Analytics Dashboard (Admin & Branch Manager) */}
                {isAdmin && adminDashboardStats && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Performance Insights</Text>
                        <AnalyticsChart 
                            title="Branch Wise Load (Parcels)" 
                            type="horizontal-bar"
                            data={adminDashboardStats.branchContribution.map(b => ({ label: b.name, value: b.count }))}
                        />
                        <AnalyticsChart 
                            title="Revenue Contribution by Branch (₹)" 
                            type="pie"
                            suffix="₹"
                            data={adminDashboardStats.branchContribution.map((b, idx) => ({ 
                                label: b.name, 
                                value: b.revenue,
                                color: idx === 0 ? colors.primary : idx === 1 ? colors.success : idx === 2 ? colors.warning : undefined
                            }))}
                        />
                        <AnalyticsChart 
                            title="Daily Orders Trend" 
                            type="bar"
                            data={Object.entries(adminDashboardStats.monthlyOrders)
                                .sort((a, b) => Number(a[0]) - Number(b[0]))
                                .map(([day, count]) => ({ label: day, value: count as number }))}
                        />
                        <AnalyticsChart 
                            title="Revenue Growth Trends (₹)" 
                            type="bar"
                            suffix="₹"
                            data={Object.entries(adminDashboardStats.revenueTrends)
                                .sort((a, b) => Number(a[0]) - Number(b[0]))
                                .map(([day, rev]) => ({ label: day, value: rev as number, color: colors.success }))}
                        />
                    </View>
                )}

                {isBranchManager && branchDashboardStats && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Branch Performance</Text>
                        <AnalyticsChart 
                            title="Parcel Flow Distribution" 
                            type="horizontal-bar"
                            data={[
                                { label: 'Booked', value: branchDashboardStats.statusCounts.booked, color: colors.primary },
                                { label: 'In Transit', value: branchDashboardStats.statusCounts.inTransit, color: '#E67E22' },
                                { label: 'Out for Delivery', value: branchDashboardStats.statusCounts.outForDelivery, color: colors.pickedUp },
                                { label: 'Delivered', value: branchDashboardStats.statusCounts.delivered, color: colors.success },
                            ]}
                        />
                        <AnalyticsChart 
                            title="Local Order Volume" 
                            type="bar"
                            data={Object.entries(branchDashboardStats.monthlyOrders)
                                .sort((a, b) => Number(a[0]) - Number(b[0]))
                                .map(([day, count]) => ({ label: day, value: count as number }))}
                        />
                         <AnalyticsChart 
                            title="Revenue Trends (₹)" 
                            type="bar"
                            suffix="₹"
                            data={Object.entries(branchDashboardStats.revenueTrends)
                                .sort((a, b) => Number(a[0]) - Number(b[0]))
                                .map(([day, rev]) => ({ label: day, value: rev as number, color: colors.success }))}
                        />
                    </View>
                )}

                {/* Agent/Customer Jobs List */}
                {!isAdmin && (
                    <View style={[styles.section, { marginTop: spacing.sm }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {isCustomer ? 'Recent Parcels' : isBranchManager ? 'Branch Operations' : 'My Assigned Jobs'}
                            </Text>
                            <Pressable onPress={() => router.push('/couriers')}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </Pressable>
                        </View>
                        {(isBranchManager ? branchCouriers : myCouriers) && (isBranchManager ? branchCouriers : myCouriers)!.length > 0 ? (
                            (isBranchManager ? branchCouriers : myCouriers)!.slice(0, 3).map((job) => (
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
                                <Text style={styles.emptyJobsText}>
                                    {isBranchManager ? 'No parcels in this branch.' : 'No jobs assigned to you yet.'}
                                </Text>
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
                                <Pressable 
                                    key={b._id} 
                                    style={styles.branchChip}
                                    onPress={() => {
                                        setSelectedBranch(b);
                                        setBranchName(b.name);
                                        setBranchAddress(b.address);
                                        setShowBranchDetailModal(true);
                                    }}
                                >
                                    <Ionicons name="business-outline" size={12} color={colors.primary} />
                                    <Text style={styles.branchChipText}>{b.name}</Text>
                                    <Ionicons name="pencil-outline" size={10} color={colors.textMuted} style={{ marginLeft: 4 }} />
                                </Pressable>
                            ))}
                            {(!branches || branches.length === 0) && (
                                <Text style={styles.noData}>No branches setup yet.</Text>
                            )}
                        </ScrollView>
                    </View>
                )}

                {/* Branch Manager Management (Admin Only) */}
                {isAdmin && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Branch Managers</Text>
                            <Pressable 
                                style={styles.addBranchButton}
                                onPress={() => setShowAddManager(!showAddManager)}
                            >
                                <Ionicons 
                                    name={showAddManager ? "close" : "person-add"} 
                                    size={20} 
                                    color={showAddManager ? colors.error : colors.primary} 
                                />
                                <Text style={[styles.addBranchText, showAddManager && { color: colors.error }]}>
                                    {showAddManager ? "Cancel" : "Add Manager"}
                                </Text>
                            </Pressable>
                        </View>

                        {showAddManager && (
                            <View style={[globalStyles.card, styles.addBranchCard]}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Full Name</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={mgrName}
                                        onChangeText={setMgrName}
                                        placeholder="Manager's Full Name"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { marginTop: spacing.sm }]}>
                                    <Text style={styles.inputLabel}>Email</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={mgrEmail}
                                        onChangeText={setMgrEmail}
                                        placeholder="manager@example.com"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { marginTop: spacing.sm }]}>
                                    <Text style={styles.inputLabel}>Password</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={mgrPassword}
                                        onChangeText={setMgrPassword}
                                        placeholder="Security Password"
                                        secureTextEntry
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { marginTop: spacing.sm }]}>
                                    <Text style={styles.inputLabel}>Assign Branch</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                                        {branches?.map(b => (
                                            <Pressable
                                                key={b._id}
                                                style={[
                                                    styles.branchChip,
                                                    mgrBranchId === b._id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                                onPress={() => setMgrBranchId(b._id)}
                                            >
                                                <Text style={[styles.branchChipText, mgrBranchId === b._id && { color: '#fff' }]}>
                                                    {b.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>

                                <Pressable
                                    style={[styles.miniButton, isCreatingManager && { opacity: 0.5 }]}
                                    onPress={handleAddManager}
                                    disabled={isCreatingManager}
                                >
                                    <Text style={styles.miniButtonText}>
                                        {isCreatingManager ? "Creating Manager..." : "Save Manager Account"}
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        {managers?.map(mgr => (
                            <Pressable 
                                key={mgr._id} 
                                style={styles.managerCard}
                                onPress={() => {
                                    setSelectedManager(mgr);
                                    setEditMgrName(mgr.name);
                                    setEditMgrEmail(mgr.email);
                                    setEditMgrPassword(mgr.password);
                                    setEditMgrBranchId(mgr.branchId);
                                    setIsEditingManagerProfile(false);
                                    setShowManagerDetailModal(true);
                                }}
                            >
                                <View style={styles.managerAvatar}>
                                    <Ionicons name="person" size={18} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.managerName}>{mgr.name}</Text>
                                    <Text style={styles.managerBranch}>
                                        {branches?.find(b => b._id === mgr.branchId)?.name || 'Unknown Branch'}
                                    </Text>
                                </View>
                                <Ionicons name="eye-outline" size={16} color={colors.primary} />
                            </Pressable>
                        ))}
                        {(!managers || managers.length === 0) && (
                            <Text style={styles.noData}>No branch managers registered yet.</Text>
                        )}
                    </View>
                )}

                {/* Agent Assignment (Admin Only) */}
                {isAdmin && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Agent Fleet Management</Text>
                            <Pressable 
                                style={styles.addBranchButton}
                                onPress={() => setShowAddAgent(!showAddAgent)}
                            >
                                <Ionicons 
                                    name={showAddAgent ? "close" : "person-add"} 
                                    size={20} 
                                    color={showAddAgent ? colors.error : colors.primary} 
                                />
                                <Text style={[styles.addBranchText, showAddAgent && { color: colors.error }]}>
                                    {showAddAgent ? "Cancel" : "Add Agent"}
                                </Text>
                            </Pressable>
                        </View>

                        {showAddAgent && (
                            <View style={[globalStyles.card, styles.addBranchCard]}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Full Name</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={agentName}
                                        onChangeText={setAgentName}
                                        placeholder="Agent Full Name"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { marginTop: spacing.sm }]}>
                                    <Text style={styles.inputLabel}>Email</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={agentEmail}
                                        onChangeText={setAgentEmail}
                                        placeholder="agent@example.com"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { marginTop: spacing.sm }]}>
                                    <Text style={styles.inputLabel}>Password</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={agentPassword}
                                        onChangeText={setAgentPassword}
                                        placeholder="Initial Password"
                                        secureTextEntry
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { marginTop: spacing.sm }]}>
                                    <Text style={styles.inputLabel}>Initial Branch (Optional)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                                        {branches?.map(b => (
                                            <Pressable
                                                key={b._id}
                                                style={[
                                                    styles.branchChip,
                                                    agentBranchId === b._id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                                onPress={() => setAgentBranchId(b._id)}
                                            >
                                                <Text style={[styles.branchChipText, agentBranchId === b._id && { color: '#fff' }]}>
                                                    {b.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>

                                <Pressable
                                    style={[styles.miniButton, isCreatingAgent && { opacity: 0.5 }]}
                                    onPress={handleAddAgent}
                                    disabled={isCreatingAgent}
                                >
                                    <Text style={styles.miniButtonText}>
                                        {isCreatingAgent ? "Processing..." : "Create Agent Account"}
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        {agents?.map(agent => (
                            <Pressable 
                                key={agent._id} 
                                style={styles.agentCard}
                                onPress={() => {
                                    setSelectedAgent(agent);
                                    setShowAgentDetailModal(true);
                                }}
                            >
                                <View style={styles.agentAvatar}>
                                    <Ionicons name="bicycle" size={18} color={colors.success} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.agentName}>{agent.name}</Text>
                                    <Text style={styles.agentBranch}>
                                        Hub: {branches?.find(b => b._id === agent.branchId)?.name || 'Unassigned'}
                                    </Text>
                                </View>
                                <View style={[styles.statusTag, { backgroundColor: agent.branchId ? colors.success + '15' : colors.warning + '15' }]}>
                                    <Text style={[styles.statusTagText, { color: agent.branchId ? colors.success : colors.warning, fontSize: 10 }]}>
                                        {agent.branchId ? 'Active' : 'Unassigned'}
                                    </Text>
                                </View>
                                <Ionicons name="eye-outline" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* Agent Assignment (Admin Only) */}
                {isAdmin && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Quick Branch Re-assignment</Text>
                            <Pressable 
                                style={styles.addBranchButton}
                                onPress={() => setShowAssignAgent(!showAssignAgent)}
                            >
                                <Ionicons 
                                    name={showAssignAgent ? "close" : "swap-horizontal"} 
                                    size={20} 
                                    color={showAssignAgent ? colors.error : colors.primary} 
                                />
                                <Text style={[styles.addBranchText, showAssignAgent && { color: colors.error }]}>
                                    {showAssignAgent ? "Cancel" : "Re-assign"}
                                </Text>
                            </Pressable>
                        </View>

                        {showAssignAgent && (
                            <View style={[globalStyles.card, styles.addBranchCard]}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Select Agent</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                                        {agents?.map(agent => (
                                            <Pressable
                                                key={agent._id}
                                                style={[
                                                    styles.branchChip,
                                                    selectedAgentId === agent._id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                                onPress={() => setSelectedAgentId(agent._id)}
                                            >
                                                <Text style={[styles.branchChipText, selectedAgentId === agent._id && { color: '#fff' }]}>
                                                    {agent.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>

                                <View style={[styles.inputGroup, { marginTop: spacing.md }]}>
                                    <Text style={styles.inputLabel}>Select Branch Hub</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                                        {branches?.map(b => (
                                            <Pressable
                                                key={b._id}
                                                style={[
                                                    styles.branchChip,
                                                    selectedBranchId === b._id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                                onPress={() => setSelectedBranchId(b._id)}
                                            >
                                                <Text style={[styles.branchChipText, selectedBranchId === b._id && { color: '#fff' }]}>
                                                    {b.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>

                                <Pressable
                                    style={[styles.miniButton, isAssigningAgent && { opacity: 0.5 }]}
                                    onPress={handleAssignAgent}
                                    disabled={isAssigningAgent}
                                >
                                    <Text style={styles.miniButtonText}>
                                        {isAssigningAgent ? "Updating..." : "Confirm Re-assignment"}
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Manager Credentials / Profile Modal */}
            <Modal
                visible={showManagerDetailModal && !!selectedManager}
                transparent
                animationType="slide"
                onRequestClose={() => setShowManagerDetailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.detailModalContent}>
                        <View style={styles.detailModalHeader}>
                            <Text style={styles.detailModalTitle}>Manager Profile</Text>
                            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                <Pressable onPress={() => setIsEditingManagerProfile(!isEditingManagerProfile)}>
                                    <Ionicons 
                                        name={isEditingManagerProfile ? "close-circle-outline" : "create-outline"} 
                                        size={24} 
                                        color={isEditingManagerProfile ? colors.error : colors.primary} 
                                    />
                                </Pressable>
                                <Pressable onPress={() => setShowManagerDetailModal(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </Pressable>
                            </View>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Full Name</Text>
                                {isEditingManagerProfile ? (
                                    <TextInput 
                                        style={styles.textInput}
                                        value={editMgrName}
                                        onChangeText={setEditMgrName}
                                        placeholder="Name"
                                    />
                                ) : (
                                    <Text style={styles.detailValue}>{selectedManager?.name}</Text>
                                )}
                            </View>
                            
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Email / Login ID</Text>
                                {isEditingManagerProfile ? (
                                    <TextInput 
                                        style={styles.textInput}
                                        value={editMgrEmail}
                                        onChangeText={setEditMgrEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                ) : (
                                    <View style={styles.credentialBox}>
                                        <Text style={styles.credentialText}>{selectedManager?.email}</Text>
                                        <Ionicons name="mail-outline" size={14} color={colors.primary} />
                                    </View>
                                )}
                            </View>
                            
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Password</Text>
                                {isEditingManagerProfile ? (
                                    <TextInput 
                                        style={styles.textInput}
                                        value={editMgrPassword}
                                        onChangeText={setEditMgrPassword}
                                        secureTextEntry={false}
                                    />
                                ) : (
                                    <View style={[styles.credentialBox, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '30' }]}>
                                        <Text style={[styles.credentialText, { color: colors.warning }]}>{selectedManager?.password}</Text>
                                        <Ionicons name="lock-open-outline" size={16} color={colors.warning} />
                                    </View>
                                )}
                            </View>
                            
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Assigned Branch Hub</Text>
                                {isEditingManagerProfile ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {branches?.map(b => (
                                            <Pressable
                                                key={b._id}
                                                style={[
                                                    styles.branchChip,
                                                    editMgrBranchId === b._id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                                onPress={() => setEditMgrBranchId(b._id)}
                                            >
                                                <Text style={[styles.branchChipText, editMgrBranchId === b._id && { color: '#fff' }]}>
                                                    {b.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <View style={styles.branchDetailChip}>
                                        <Ionicons name="business" size={14} color={colors.primary} />
                                        <Text style={styles.branchDetailText}>
                                            {branches?.find(b => b._id === selectedManager?.branchId)?.name || 'N/A'}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {isEditingManagerProfile ? (
                                <Pressable 
                                    style={[styles.primaryAction, { width: '100%' }, isUpdatingManagerProfile && { opacity: 0.5 }]} 
                                    onPress={handleUpdateManagerProfile}
                                    disabled={isUpdatingManagerProfile}
                                >
                                    <Ionicons name="save-outline" size={20} color="#fff" />
                                    <Text style={styles.primaryActionText}>{isUpdatingManagerProfile ? "Updating..." : "Save Profile Changes"}</Text>
                                </Pressable>
                            ) : (
                                <View style={styles.detailActions}>
                                    <Pressable 
                                        style={[styles.deleteButton, isDeletingManager && { opacity: 0.5 }]} 
                                        onPress={() => handleDeleteManager(selectedManager._id, selectedManager.name)}
                                        disabled={isDeletingManager}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#fff" />
                                        <Text style={styles.deleteButtonText}>Delete Manager Account</Text>
                                    </Pressable>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Agent Profile Modal */}
            <Modal
                visible={showAgentDetailModal && !!selectedAgent}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAgentDetailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.detailModalContent}>
                        <View style={styles.detailModalHeader}>
                            <Text style={styles.detailModalTitle}>Agent Profile</Text>
                            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                <Pressable onPress={() => setIsEditingAgentProfile(!isEditingAgentProfile)}>
                                    <Ionicons 
                                        name={isEditingAgentProfile ? "close-circle-outline" : "create-outline"} 
                                        size={24} 
                                        color={isEditingAgentProfile ? colors.error : colors.primary} 
                                    />
                                </Pressable>
                                <Pressable onPress={() => setShowAgentDetailModal(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </Pressable>
                            </View>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Full Name</Text>
                                {isEditingAgentProfile ? (
                                    <TextInput 
                                        style={styles.textInput}
                                        value={editAgentName}
                                        onChangeText={setEditAgentName}
                                        placeholder="Name"
                                    />
                                ) : (
                                    <Text style={styles.detailValue}>{selectedAgent?.name}</Text>
                                )}
                            </View>
                            
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Email / Login ID</Text>
                                {isEditingAgentProfile ? (
                                    <TextInput 
                                        style={styles.textInput}
                                        value={editAgentEmail}
                                        onChangeText={setEditAgentEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                ) : (
                                    <View style={styles.credentialBox}>
                                        <Text style={styles.credentialText}>{selectedAgent?.email}</Text>
                                        <Ionicons name="mail-outline" size={14} color={colors.primary} />
                                    </View>
                                )}
                            </View>
                            
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Password</Text>
                                {isEditingAgentProfile ? (
                                    <TextInput 
                                        style={styles.textInput}
                                        value={editAgentPassword}
                                        onChangeText={setEditAgentPassword}
                                        secureTextEntry={false}
                                    />
                                ) : (
                                    <View style={[styles.credentialBox, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '30' }]}>
                                        <Text style={[styles.credentialText, { color: colors.warning }]}>{selectedAgent?.password}</Text>
                                        <Ionicons name="lock-open-outline" size={16} color={colors.warning} />
                                    </View>
                                )}
                            </View>
                            
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Current Assigned Hub</Text>
                                {isEditingAgentProfile ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <Pressable
                                            style={[
                                                styles.branchChip,
                                                editAgentBranchId === '' && { backgroundColor: colors.primary, borderColor: colors.primary }
                                            ]}
                                            onPress={() => setEditAgentBranchId('')}
                                        >
                                            <Text style={[styles.branchChipText, editAgentBranchId === '' && { color: '#fff' }]}>
                                                Unassigned
                                            </Text>
                                        </Pressable>
                                        {branches?.map(b => (
                                            <Pressable
                                                key={b._id}
                                                style={[
                                                    styles.branchChip,
                                                    editAgentBranchId === b._id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                                onPress={() => setEditAgentBranchId(b._id)}
                                            >
                                                <Text style={[styles.branchChipText, editAgentBranchId === b._id && { color: '#fff' }]}>
                                                    {b.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <View style={styles.branchDetailChip}>
                                        <Ionicons name="business" size={14} color={colors.primary} />
                                        <Text style={styles.branchDetailText}>
                                            {branches?.find(b => b._id === selectedAgent?.branchId)?.name || 'Unassigned'}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {isEditingAgentProfile ? (
                                <Pressable 
                                    style={[styles.primaryAction, { width: '100%' }, isUpdatingAgentProfile && { opacity: 0.5 }]} 
                                    onPress={handleUpdateAgentProfile}
                                    disabled={isUpdatingAgentProfile}
                                >
                                    <Ionicons name="save-outline" size={20} color="#fff" />
                                    <Text style={styles.primaryActionText}>{isUpdatingAgentProfile ? "Updating..." : "Save Agent Details"}</Text>
                                </Pressable>
                            ) : (
                                <View style={styles.detailActions}>
                                    <Pressable 
                                        style={[styles.deleteButton, isDeletingAgent && { opacity: 0.5 }]} 
                                        onPress={() => handleDeleteAgent(selectedAgent._id, selectedAgent.name)}
                                        disabled={isDeletingAgent}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#fff" />
                                        <Text style={styles.deleteButtonText}>Remove Agent from Fleet</Text>
                                    </Pressable>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Branch Profile / Edit Modal */}
            <Modal
                visible={showBranchDetailModal && !!selectedBranch}
                transparent
                animationType="slide"
                onRequestClose={() => setShowBranchDetailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.detailModalContent}>
                        <View style={styles.detailModalHeader}>
                            <Text style={styles.detailModalTitle}>Branch Hub Details</Text>
                            <Pressable onPress={() => setShowBranchDetailModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </Pressable>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Branch Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={branchName}
                                    onChangeText={setBranchName}
                                    placeholder="Hub Name"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={[styles.inputGroup, { marginTop: spacing.md }]}>
                                <Text style={styles.inputLabel}>Branch Address</Text>
                                <TextInput
                                    style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                                    value={branchAddress}
                                    onChangeText={setBranchAddress}
                                    placeholder="Full hub address"
                                    multiline
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
                                <Pressable 
                                    style={[styles.primaryAction, { width: '100%' }, isUpdatingBranch && { opacity: 0.5 }]} 
                                    onPress={handleUpdateBranch}
                                    disabled={isUpdatingBranch}
                                >
                                    <Ionicons name="save-outline" size={20} color="#fff" />
                                    <Text style={styles.primaryActionText}>{isUpdatingBranch ? "Updating..." : "Save Changes"}</Text>
                                </Pressable>

                                <Pressable 
                                    style={[styles.deleteButton, isDeletingBranch && { opacity: 0.5 }]} 
                                    onPress={() => handleDeleteBranch(selectedBranch._id, selectedBranch.name)}
                                    disabled={isDeletingBranch}
                                >
                                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                                    <Text style={styles.deleteButtonText}>Delete Branch Hub</Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 8,
        backgroundColor: colors.surface,
        borderRadius: 8,
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
    branchSubtext: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '500',
        marginTop: 2,
    },
    managerCard: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: 12,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    managerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    managerName: {
        fontSize: fontSize.sm,
        fontWeight: 'bold',
        color: colors.text,
    },
    managerBranch: {
        fontSize: 10,
        color: colors.textMuted,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    agentCard: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: 12,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    agentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.success + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    agentName: {
        fontSize: fontSize.sm,
        fontWeight: 'bold',
        color: colors.text,
    },
    agentBranch: {
        fontSize: 10,
        color: colors.textMuted,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'flex-end',
    },
    detailModalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: spacing.lg,
        width: '100%',
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: colors.border,
    },
    detailModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    detailModalTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        letterSpacing: -0.5,
    },
    detailItem: {
        marginBottom: spacing.xl,
    },
    detailLabel: {
        fontSize: 10,
        color: colors.textMuted,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '700',
    },
    detailValue: {
        fontSize: fontSize.lg,
        color: colors.text,
        fontWeight: 'bold',
    },
    credentialBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    credentialText: {
        fontSize: fontSize.md,
        color: colors.primary,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    branchDetailChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '10',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 24,
        alignSelf: 'flex-start',
        gap: 8,
        borderWidth: 1,
        borderColor: colors.primary + '20',
    },
    branchDetailText: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: fontSize.md,
    },
    detailActions: {
        marginTop: spacing.xl,
        paddingTop: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    deleteButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: colors.error,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        borderRadius: 16,
        gap: 8,
    },
    deleteButtonText: {
        color: colors.error,
        fontWeight: 'bold',
        fontSize: fontSize.md,
    },
});
