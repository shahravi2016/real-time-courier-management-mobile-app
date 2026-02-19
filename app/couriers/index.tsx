import React, { useState, useMemo } from 'react';
import { View, FlatList, TextInput, StyleSheet, Pressable, Text, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '../../convex/_generated/api';
import { CourierCard, LoadingState, EmptyState } from '../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';

type CourierStatus =
    | 'pending'
    | 'picked_up'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';

const statusFilters: { label: string; value: CourierStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Picked Up', value: 'picked_up' },
    { label: 'In Transit', value: 'in_transit' },
    { label: 'Out', value: 'out_for_delivery' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
];

export default function CourierListScreen() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<CourierStatus | 'all'>('all');

    const couriers = useQuery(api.couriers.list);

    const filteredCouriers = useMemo(() => {
        if (!couriers) return [];

        let result = couriers;

        // Apply status filter
        if (selectedFilter !== 'all') {
            result = result.filter((c) => c.currentStatus === selectedFilter);
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
                <View style={globalStyles.row}>
                    <Pressable onPress={() => router.back()} style={{ marginRight: spacing.sm }}>
                        <Text style={styles.backButton}>←</Text>
                    </Pressable>
                    <Text style={globalStyles.title}>Couriers</Text>
                </View>
                <View style={globalStyles.row}>
                    <Pressable onPress={handleExport} style={{ marginRight: spacing.lg }}>
                        <Text style={styles.headerButton}>Export</Text>
                    </Pressable>
                    <Pressable onPress={() => router.push('/couriers/add')}>
                        <Text style={styles.headerButton}>+ Add</Text>
                    </Pressable>
                </View>
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

                {/* Status Filter */}
                <FlatList
                    horizontal
                    data={statusFilters}
                    keyExtractor={(item) => item.value}
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterList}
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
                                onPress={() => router.push(`/couriers/${item._id}`)}
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
    backButton: {
        fontSize: fontSize.xl,
        color: colors.text,
        marginRight: spacing.sm,
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
    filterList: {
        marginVertical: spacing.md,
        maxHeight: 40,
    },
    filterChip: {
        paddingVertical: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.sm,
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
