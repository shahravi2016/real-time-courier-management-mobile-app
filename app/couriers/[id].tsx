import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { StatusBadge, FormInput, LoadingState, ErrorState } from '../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';

type CourierStatus =
    | 'pending'
    | 'picked_up'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';

const statusOptions: { label: string; value: CourierStatus }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Picked Up', value: 'picked_up' },
    { label: 'In Transit', value: 'in_transit' },
    { label: 'Out for Delivery', value: 'out_for_delivery' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
];

export default function CourierDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const courier = useQuery(api.couriers.getById, { id: id as Id<'couriers'> });
    const updateCourier = useMutation(api.couriers.update);
    const updateStatus = useMutation(api.couriers.updateStatus);
    const removeCourier = useMutation(api.couriers.remove);

    const [isEditing, setIsEditing] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editForm, setEditForm] = useState({
        senderName: '',
        receiverName: '',
        receiverPhone: '',
        pickupAddress: '',
        deliveryAddress: '',
        notes: '',
    });

    const startEditing = () => {
        if (courier) {
            setEditForm({
                senderName: courier.senderName,
                receiverName: courier.receiverName,
                receiverPhone: courier.receiverPhone,
                pickupAddress: courier.pickupAddress,
                deliveryAddress: courier.deliveryAddress,
                notes: courier.notes || '',
            });
            setIsEditing(true);
        }
    };

    const handleSaveEdit = async () => {
        if (!courier) return;

        setIsSubmitting(true);
        try {
            await updateCourier({
                id: courier._id,
                senderName: editForm.senderName.trim(),
                receiverName: editForm.receiverName.trim(),
                receiverPhone: editForm.receiverPhone.trim(),
                pickupAddress: editForm.pickupAddress.trim(),
                deliveryAddress: editForm.deliveryAddress.trim(),
                notes: editForm.notes.trim() || undefined,
            });
            setIsEditing(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to update courier');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (status: CourierStatus) => {
        if (!courier) return;

        setShowStatusModal(false);
        setIsSubmitting(true);
        try {
            await updateStatus({ id: courier._id, status });
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Courier',
            'Are you sure you want to delete this courier? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!courier) return;
                        try {
                            await removeCourier({ id: courier._id });
                            router.back();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete courier');
                        }
                    },
                },
            ]
        );
    };

    if (courier === undefined) {
        return (
            <SafeAreaView style={globalStyles.safeArea}>
                <Stack.Screen options={{ title: 'Details' }} />
                <LoadingState message="Loading courier..." />
            </SafeAreaView>
        );
    }

    if (courier === null) {
        return (
            <SafeAreaView style={globalStyles.safeArea}>
                <Stack.Screen options={{ title: 'Details' }} />
                <ErrorState message="Courier not found" />
            </SafeAreaView>
        );
    }

    if (isSubmitting) {
        return (
            <SafeAreaView style={globalStyles.safeArea}>
                <Stack.Screen options={{ title: 'Details' }} />
                <LoadingState message="Updating..." />
            </SafeAreaView>
        );
    }

    const formattedCreated = new Date(courier.createdAt).toLocaleString();
    const formattedUpdated = new Date(courier.updatedAt).toLocaleString();

    return (
        <SafeAreaView style={globalStyles.safeArea} edges={['bottom']}>
            <Stack.Screen options={{ title: courier.trackingId }} />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Status Section */}
                <View style={styles.statusSection}>
                    <StatusBadge status={courier.currentStatus} />
                    <Pressable style={styles.statusButton} onPress={() => setShowStatusModal(true)}>
                        <Text style={styles.statusButtonText}>Change Status</Text>
                    </Pressable>
                </View>

                {isEditing ? (
                    /* Edit Mode */
                    <View style={styles.editSection}>
                        <FormInput
                            label="Sender Name"
                            value={editForm.senderName}
                            onChangeText={(v) => setEditForm((p) => ({ ...p, senderName: v }))}
                        />
                        <FormInput
                            label="Receiver Name"
                            value={editForm.receiverName}
                            onChangeText={(v) => setEditForm((p) => ({ ...p, receiverName: v }))}
                        />
                        <FormInput
                            label="Receiver Phone"
                            value={editForm.receiverPhone}
                            onChangeText={(v) => setEditForm((p) => ({ ...p, receiverPhone: v }))}
                            keyboardType="phone-pad"
                        />
                        <FormInput
                            label="Pickup Address"
                            value={editForm.pickupAddress}
                            onChangeText={(v) => setEditForm((p) => ({ ...p, pickupAddress: v }))}
                            multiline
                        />
                        <FormInput
                            label="Delivery Address"
                            value={editForm.deliveryAddress}
                            onChangeText={(v) => setEditForm((p) => ({ ...p, deliveryAddress: v }))}
                            multiline
                        />
                        <FormInput
                            label="Notes"
                            value={editForm.notes}
                            onChangeText={(v) => setEditForm((p) => ({ ...p, notes: v }))}
                            multiline
                        />

                        <View style={styles.editButtons}>
                            <Pressable
                                style={[globalStyles.buttonSecondary, { flex: 1 }]}
                                onPress={() => setIsEditing(false)}
                            >
                                <Text style={globalStyles.buttonText}>Cancel</Text>
                            </Pressable>
                            <View style={{ width: spacing.sm }} />
                            <Pressable
                                style={[globalStyles.button, { flex: 1 }]}
                                onPress={handleSaveEdit}
                            >
                                <Text style={globalStyles.buttonText}>Save</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    /* View Mode */
                    <>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Sender</Text>
                            <View style={globalStyles.card}>
                                <Text style={styles.value}>{courier.senderName}</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Receiver</Text>
                            <View style={globalStyles.card}>
                                <Text style={styles.value}>{courier.receiverName}</Text>
                                <Text style={styles.subValue}>{courier.receiverPhone}</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Pickup Address</Text>
                            <View style={globalStyles.card}>
                                <Text style={styles.value}>{courier.pickupAddress}</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Delivery Address</Text>
                            <View style={globalStyles.card}>
                                <Text style={styles.value}>{courier.deliveryAddress}</Text>
                            </View>
                        </View>

                        {courier.notes && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Notes</Text>
                                <View style={globalStyles.card}>
                                    <Text style={styles.value}>{courier.notes}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Timestamps</Text>
                            <View style={globalStyles.card}>
                                <Text style={styles.subValue}>Created: {formattedCreated}</Text>
                                <Text style={styles.subValue}>Updated: {formattedUpdated}</Text>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actions}>
                            <Pressable
                                style={[globalStyles.buttonSecondary, { flex: 1 }]}
                                onPress={startEditing}
                            >
                                <Text style={globalStyles.buttonText}>✏️ Edit</Text>
                            </Pressable>
                            <View style={{ width: spacing.sm }} />
                            <Pressable
                                style={[globalStyles.buttonSecondary, styles.deleteButton, { flex: 1 }]}
                                onPress={handleDelete}
                            >
                                <Text style={[globalStyles.buttonText, { color: colors.error }]}>🗑️ Delete</Text>
                            </Pressable>
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Status Change Modal */}
            <Modal
                visible={showStatusModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowStatusModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Status</Text>
                        {statusOptions.map((option) => (
                            <Pressable
                                key={option.value}
                                style={[
                                    styles.statusOption,
                                    courier.currentStatus === option.value && styles.statusOptionActive,
                                ]}
                                onPress={() => handleStatusChange(option.value)}
                            >
                                <Text
                                    style={[
                                        styles.statusOptionText,
                                        courier.currentStatus === option.value && styles.statusOptionTextActive,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </Pressable>
                        ))}
                        <Pressable
                            style={[globalStyles.buttonSecondary, styles.modalCancel]}
                            onPress={() => setShowStatusModal(false)}
                        >
                            <Text style={globalStyles.buttonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    statusSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    statusButton: {
        paddingVertical: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statusButtonText: {
        color: colors.primary,
        fontSize: fontSize.sm,
        fontWeight: '500',
    },
    section: {
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    value: {
        fontSize: fontSize.md,
        color: colors.text,
    },
    subValue: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    actions: {
        flexDirection: 'row',
        marginTop: spacing.md,
        marginBottom: spacing.xl,
    },
    deleteButton: {
        borderColor: colors.error,
    },
    editSection: {
        marginTop: spacing.md,
    },
    editButtons: {
        flexDirection: 'row',
        marginTop: spacing.md,
        marginBottom: spacing.xl,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: spacing.lg,
    },
    modalTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    statusOption: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 10,
        marginBottom: spacing.xs,
        backgroundColor: colors.surfaceElevated,
    },
    statusOptionActive: {
        backgroundColor: colors.primary,
    },
    statusOptionText: {
        fontSize: fontSize.md,
        color: colors.text,
        textAlign: 'center',
    },
    statusOptionTextActive: {
        fontWeight: '600',
    },
    modalCancel: {
        marginTop: spacing.md,
    },
});
