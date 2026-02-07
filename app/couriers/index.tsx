import React, { useState, useMemo } from 'react';
import { View, FlatList, TextInput, StyleSheet, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
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

    if (!couriers) {
        return (
            <SafeAreaView style={globalStyles.safeArea} edges={['bottom']}>
                <Stack.Screen options={{ title: 'Couriers' }} />
                <LoadingState message="Loading couriers..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={globalStyles.safeArea} edges={['bottom']}>
            <Stack.Screen
                options={{
                    title: 'Couriers',
                    headerRight: () => (
                        <Pressable onPress={() => router.push('/couriers/add')}>
                            <Text style={styles.addButton}>+ Add</Text>
                        </Pressable>
                    ),
                }}
            />

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
    addButton: {
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
