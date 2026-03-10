import React, { useState, useMemo } from 'react';
import { View, FlatList, TextInput, StyleSheet, Pressable, Text, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '../../convex/_generated/api';
import { CourierCard, LoadingState, EmptyState } from '../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/components/auth-context';
import { Id } from '../../convex/_generated/dataModel';

type CourierStatus =
    | 'booked'
    | 'pending'
    | 'picked_up'
    | 'dispatched'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';

const statusFilters: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Unassigned', value: 'unassigned' },
    { label: 'Booked', value: 'booked' },
    { label: 'Picked Up', value: 'picked_up' },
    { label: 'Dispatched', value: 'dispatched' },
    { label: 'In Transit', value: 'in_transit' },
    { label: 'Out', value: 'out_for_delivery' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
];

const customerFilters: { label: string; value: string }[] = [
    { label: 'All Parcels', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
];

export default function CourierListScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<string>(params.filter === 'needs_attention' ? 'unassigned' : 'all');
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

    // Multi-select state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<Id<'couriers'>>>(new Set());

    const { user, isLoading: authLoading } = useAuth();
    const removeMultiple = useMutation(api.couriers.removeMultiple);

    // Force redirect to login if not authenticated
    React.useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login');
        }
    }, [user, authLoading]);

    const isAdmin = user?.role === 'admin';
    const isBranchManager = user?.role === 'branch_manager';

    // Fetch branches for admin filtering
    const branches = useQuery(api.branches.list, isAdmin ? {} : "skip");

    const isUnassignedSelected = selectedFilter === 'unassigned';

    const allCouriers = useQuery(api.couriers.list, 
        isAdmin ? { 
            branchId: (selectedBranch as any) || undefined,
            unassignedOnly: isUnassignedSelected
        } : "skip"
    );
    const branchCouriers = useQuery(api.couriers.list, 
        (isBranchManager && user?.branchId) ? { 
            branchId: user.branchId as any,
            unassignedOnly: isUnassignedSelected
        } : "skip"
    );
    const myCouriers = useQuery(api.couriers.getMyCouriers,
        (user?._id && (user.role === 'agent' || user.role === 'customer')) ? { userId: user._id, role: user.role as any } : "skip" as any
    );

    const couriers = isAdmin ? allCouriers : (isBranchManager ? branchCouriers : myCouriers);

    const toggleSelection = (id: Id<'couriers'>) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredCouriers.length) {
            setSelectedIds(new Set());
        } else {
            const allIds = new Set(filteredCouriers.map(c => c._id));
            setSelectedIds(allIds);
        }
    };

    const filteredCouriers = useMemo(() => {
        if (!couriers) return [];

        let result = couriers;

        // Apply UI-side status filter (except unassigned which is handled server-side)
        if (selectedFilter !== 'all' && selectedFilter !== 'unassigned') {
            if (selectedFilter === 'active') {
                result = result.filter((c) => !['delivered', 'cancelled'].includes(c.currentStatus));
            } else if (selectedFilter === 'completed') {
                result = result.filter((c) => ['delivered', 'cancelled'].includes(c.currentStatus));
            } else {
                result = result.filter((c) => c.currentStatus === selectedFilter);
            }
        }

        // Apply search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (c) =>
                    c.trackingId.toLowerCase().includes(term) ||
                    c.receiverName.toLowerCase().includes(term) ||
                    c.receiverPhone.includes(term)
            );
        }

        return result;
    }, [couriers, searchTerm, selectedFilter]);

    const hasAdvancedSelected = useMemo(() => {
        if (!filteredCouriers) return false;
        const advancedStatuses = ["picked_up", "dispatched", "in_transit", "out_for_delivery", "delivered"];
        return Array.from(selectedIds).some(id => {
            const courier = filteredCouriers.find(c => c._id === id);
            return courier && advancedStatuses.includes(courier.currentStatus);
        });
    }, [selectedIds, filteredCouriers]);

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;

        Alert.alert(
            "Bulk Delete",
            `Are you sure you want to delete ${selectedIds.size} selected items? Advanced parcels will be blocked automatically.`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete All", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await removeMultiple({ ids: Array.from(selectedIds) });
                            setSelectedIds(new Set());
                            setIsSelectionMode(false);
                            Alert.alert("Success", "Selected items deleted.");
                        } catch (e: any) {
                            Alert.alert("Integrity Error", e.message);
                        }
                    }
                }
            ]
        );
    };

    const sanitizeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

    const handleExport = async () => {
        if (!couriers || couriers.length === 0) {
            Alert.alert('No Data', 'There are no couriers to export.');
            return;
        }

        const headers = "Tracking ID,Sender,Receiver,Phone,Status,Pickup,Delivery,Notes,Created At\n";
        const csv = couriers.map(c =>
            [
                c.trackingId, c.senderName, c.receiverName, c.receiverPhone,
                c.currentStatus, c.pickupAddress, c.deliveryAddress,
                c.notes || '', new Date(c.createdAt).toISOString()
            ].map(sanitizeCsv).join(',')
        ).join('\n');
        const csvContent = headers + csv;

        try {
            if (Platform.OS === 'web') {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "couriers_export.csv";
                link.click();
            } else {
                const docDir = (FileSystem as any).documentDirectory;
                if (!docDir) {
                    Alert.alert('Error', 'Cannot access device storage');
                    return;
                }
                const fileUri = docDir + "couriers_export.csv";
                await (FileSystem as any).writeAsStringAsync(fileUri, csvContent, {
                    encoding: (FileSystem as any).EncodingType.UTF8,
                });

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri, {
                        mimeType: 'text/csv',
                        dialogTitle: 'Export Couriers',
                    });
                } else {
                    Alert.alert('Error', 'Sharing is not available on this device');
                }
            }
        } catch (error: any) {
            console.error('Export failed:', error);
            Alert.alert('Export Failed', error?.message || 'Something went wrong');
        }
    };

    if (!couriers) {
        return (
            <SafeAreaView style={globalStyles.safeArea} edges={['bottom']}>
                <Stack.Screen options={{ title: 'Couriers' }} />
                <LoadingState message="Loading couriers..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Pressable
                    onPress={() => {
                        if (isSelectionMode) {
                            setIsSelectionMode(false);
                            setSelectedIds(new Set());
                        } else {
                            router.canGoBack() ? router.back() : router.replace('/');
                        }
                    }}
                    style={({ pressed }) => [
                        styles.backButtonContainer,
                        pressed && { opacity: 0.6 }
                    ]}
                    hitSlop={15}
                >
                    <Ionicons name={isSelectionMode ? "close" : "arrow-back"} size={24} color={colors.text} />
                </Pressable>
                
                <Text style={globalStyles.title}>
                    {isSelectionMode ? `${selectedIds.size} Selected` : 'Couriers'}
                </Text>

                <View style={globalStyles.row}>
                    {(isAdmin || isBranchManager) && !isSelectionMode && (
                        <>
                            <Pressable onPress={() => setIsSelectionMode(true)} style={{ marginRight: spacing.lg }}>
                                <Text style={styles.headerButton}>Select</Text>
                            </Pressable>
                            <Pressable onPress={handleExport} style={{ marginRight: spacing.lg }}>
                                <Ionicons name="download-outline" size={20} color={colors.primary} />
                            </Pressable>
                            <Pressable onPress={() => router.push('/couriers/add')}>
                                <Ionicons name="add-circle" size={24} color={colors.primary} />
                            </Pressable>
                        </>
                    )}
                    {isSelectionMode && (
                        <View style={globalStyles.row}>
                            <Pressable onPress={handleSelectAll} style={{ marginRight: spacing.lg }}>
                                <Text style={styles.headerButton}>
                                    {selectedIds.size === filteredCouriers.length ? 'None' : 'All'}
                                </Text>
                            </Pressable>
                            <Pressable 
                                onPress={handleBulkDelete} 
                                disabled={selectedIds.size === 0 || hasAdvancedSelected}
                            >
                                <Ionicons 
                                    name="trash" 
                                    size={24} 
                                    color={selectedIds.size === 0 ? colors.textMuted : (hasAdvancedSelected ? colors.warning : colors.error)} 
                                />
                            </Pressable>
                        </View>
                    )}
                </View>
                {(!isAdmin && !isBranchManager && !isSelectionMode) && <View style={{ width: 44 }} />}
            </View>

            <View style={styles.container}>
                {/* Search Bar */}
                <TextInput
                    style={styles.searchInput}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholder="Search by ID, name, or phone..."
                    placeholderTextColor={colors.textMuted}
                />

                {/* Admin-only Branch Filter */}
                {isAdmin && branches && (
                    <View style={styles.branchFilterWrapper}>
                        <Text style={styles.filterLabel}>Filter by Branch:</Text>
                        <FlatList
                            horizontal
                            data={[{ _id: 'all', name: 'All Branches' }, ...branches]}
                            keyExtractor={(item) => item._id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterContent}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => setSelectedBranch(item._id === 'all' ? null : item._id)}
                                    style={[
                                        styles.branchChip,
                                        (item._id === 'all' ? selectedBranch === null : selectedBranch === item._id) && styles.branchChipActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.branchChipText,
                                            (item._id === 'all' ? selectedBranch === null : selectedBranch === item._id) && styles.branchChipTextActive,
                                        ]}
                                    >
                                        {item.name}
                                    </Text>
                                </Pressable>
                            )}
                        />
                    </View>
                )}

                {/* Status Filter */}
                <View style={styles.filterWrapper}>
                    <FlatList
                        horizontal
                        data={(isAdmin || isBranchManager) ? statusFilters : customerFilters}
                        keyExtractor={(item) => item.value}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterContent}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => setSelectedFilter(item.value)}
                                style={[
                                    styles.filterChip,
                                    selectedFilter === item.value && styles.filterChipActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.filterText,
                                        selectedFilter === item.value && styles.filterTextActive,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </Pressable>
                        )}
                    />
                </View>

                {/* Courier List */}
                {filteredCouriers.length === 0 ? (
                    <EmptyState
                        icon="📭"
                        title="No couriers found"
                        message={searchTerm ? 'Try a different search term' : 'Add your first courier to get started'}
                    />
                ) : (
                    <FlatList
                        data={filteredCouriers}
                        keyExtractor={(item) => item._id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <CourierCard
                                courier={item}
                                onPress={() => {
                                    if (isSelectionMode) {
                                        toggleSelection(item._id);
                                    } else {
                                        router.push(`/couriers/${item._id}`);
                                    }
                                }}
                                onLongPress={() => {
                                    if (!isSelectionMode) {
                                        setIsSelectionMode(true);
                                        toggleSelection(item._id);
                                    }
                                }}
                                isSelected={selectedIds.has(item._id)}
                                isSelectionMode={isSelectionMode}
                            />
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        marginBottom: spacing.sm,
    },
    backButtonContainer: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerButton: {
        color: colors.primary,
        fontSize: fontSize.md,
        fontWeight: '600',
    },
    searchInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        fontSize: fontSize.md,
        color: colors.text,
        marginTop: spacing.sm,
    },
    branchFilterWrapper: {
        marginTop: spacing.md,
    },
    filterLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    branchChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.sm,
    },
    branchChipActive: {
        backgroundColor: colors.primary + '20',
        borderColor: colors.primary,
    },
    branchChipText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    branchChipTextActive: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    filterWrapper: {
        height: 44,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    filterContent: {
        paddingRight: spacing.xl,
    },
    filterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.sm,
        height: 36,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: colors.text,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: spacing.xl,
    },
});
