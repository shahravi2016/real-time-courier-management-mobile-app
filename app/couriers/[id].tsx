import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Modal, KeyboardAvoidingView, Platform, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { StatusBadge, FormInput, ActivityLog, SignaturePad } from '../../src/components';
import { colors, spacing, fontSize, globalStyles, borderRadius } from '../../src/styles/theme';
import { LoadingState, EmptyState, ErrorState } from '../../src/components';
import { useAuth } from '../../src/components/auth-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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
    const { user } = useAuth();

    const courier = useQuery(api.couriers.getById, { id: id as Id<'couriers'> });
    const agents = useQuery(api.users.listAgents);
    const isAdmin = user?.role === 'admin';
    const isCustomer = user?.role === 'customer';
    const isAssignedToMe = courier?.assignedTo === user?._id;
    const isMyParcel = isCustomer && (
        courier?.receiverPhone === user?.phone ||
        (courier as any).senderPhone === user?.phone ||
        courier?.senderName === user?.name
    );
    const canManageStatus = isAdmin || isAssignedToMe;

    const updateCourier = useMutation(api.couriers.update);
    const updateStatus = useMutation(api.couriers.updateStatus);
    const removeCourier = useMutation(api.couriers.remove);
    const completeDelivery = useMutation(api.couriers.completeDelivery);
    const assignCourier = useMutation(api.couriers.assignCourier);

    const [isEditing, setIsEditing] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPodModal, setShowPodModal] = useState(false);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [podForm, setPodForm] = useState({
        signeeName: '',
        signature: null as string | null,
        photo: null as string | null,
    });
    const [editForm, setEditForm] = useState({
        senderName: '',
        receiverName: '',
        receiverPhone: '',
        pickupAddress: '',
        deliveryAddress: '',
        notes: '',
        weight: '',
        distance: '',
    });

    const [editErrors, setEditErrors] = useState<Record<string, string>>({});

    const startEditing = () => {
        if (courier) {
            setEditForm({
                senderName: courier.senderName,
                receiverName: courier.receiverName,
                receiverPhone: courier.receiverPhone,
                pickupAddress: courier.pickupAddress,
                deliveryAddress: courier.deliveryAddress,
                notes: courier.notes || '',
                weight: courier.weight?.toString() || '',
                distance: courier.distance?.toString() || '',
            });
            setEditErrors({});
            setIsEditing(true);
        }
    };

    const validateEdit = () => {
        const newErrors: Record<string, string> = {};

        if (!editForm.senderName.trim()) newErrors.senderName = 'Sender name is required';
        if (!editForm.receiverName.trim()) newErrors.receiverName = 'Receiver name is required';

        if (!editForm.receiverPhone.trim()) {
            newErrors.receiverPhone = 'Phone number is required';
        } else {
            const digits = editForm.receiverPhone.replace(/\D/g, '');
            if (digits.length !== 10) {
                newErrors.receiverPhone = 'Phone number must be exactly 10 digits';
            }
        }

        if (!editForm.pickupAddress.trim()) newErrors.pickupAddress = 'Pickup address is required';
        if (!editForm.deliveryAddress.trim()) newErrors.deliveryAddress = 'Delivery address is required';

        // Robust numeric validation for editing
        const w = parseFloat(editForm.weight);
        if (isNaN(w) || w <= 0) {
            newErrors.weight = 'Valid weight is required';
        } else if (w > 500) {
            newErrors.weight = 'Weight cannot exceed 500kg';
        }

        const d = parseFloat(editForm.distance);
        if (isNaN(d) || d <= 0) {
            newErrors.distance = 'Valid distance is required';
        } else if (d > 2000) {
            newErrors.distance = 'Distance cannot exceed 2000km';
        }

        setEditErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveEdit = async () => {
        if (!courier) return;
        if (!validateEdit()) return;

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
                weight: editForm.weight ? parseFloat(editForm.weight) : undefined,
                distance: editForm.distance ? parseFloat(editForm.distance) : undefined,
                price: (editForm.weight && editForm.distance)
                    ? (parseFloat(editForm.weight) * 5 + parseFloat(editForm.distance) * 2 + 10)
                    : undefined,
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update courier:', error);
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

            // Mock Notification
            const { notifyStatusChange } = require('../../src/utils/notifications');
            notifyStatusChange(
                courier.trackingId,
                status,
                courier.receiverPhone,
                courier.senderName
            );

        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignAgent = async (agentId: Id<'users'>) => {
        if (!courier) return;
        setShowAgentModal(false);
        setIsSubmitting(true);
        try {
            await assignCourier({ id: courier._id, userId: agentId });
            Alert.alert('Success', 'Courier assigned to agent');
        } catch (error) {
            console.error('Failed to assign agent:', error);
            Alert.alert('Error', 'Failed to assign agent');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!courier) return;
        setShowDeleteModal(false);
        setIsSubmitting(true);
        try {
            await removeCourier({ id: courier._id });
            router.back();
        } catch (error) {
            console.error('Failed to delete courier:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Camera access is required for POD photo');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            allowsEditing: true,
        });

        if (!result.canceled) {
            setPodForm(p => ({ ...p, photo: result.assets[0].uri }));
        }
    };

    const handlePodSubmit = async () => {
        if (!podForm.signeeName.trim()) {
            Alert.alert('Incomplete Form', 'Please enter the receiver\'s name.');
            return;
        }
        if (!podForm.signature) {
            Alert.alert('Required', 'Signature is mandatory for Proof of Delivery.');
            return;
        }

        // Final sanity check
        if (podForm.signeeName.length < 3) {
            Alert.alert('Invalid Name', 'Signee name must be at least 3 characters.');
            return;
        }

        setIsSubmitting(true);
        try {
            await completeDelivery({
                id: courier!._id,
                signeeName: podForm.signeeName,
                signatureId: podForm.signature,
                photoId: podForm.photo || undefined,
            });
            setShowPodModal(false);
            Alert.alert('Success', 'Delivery confirmed with POD');
        } catch (error) {
            console.error('POD failure:', error);
            Alert.alert('Error', 'Failed to submit POD');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (courier === undefined) {
        return (
            <SafeAreaView style={globalStyles.safeArea}>
                <Stack.Screen options={{ headerShown: false }} />
                <LoadingState message="Loading courier..." />
            </SafeAreaView>
        );
    }

    if (!courier) {
        return (
            <SafeAreaView style={globalStyles.safeArea}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButtonContainer}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Details</Text>
                    <View style={{ width: 44 }} />
                </View>
                <EmptyState icon="🔍" title="Not Found" message="Courier does not exist." />
            </SafeAreaView>
        );
    }

    // For Agents: Only assigned agent can view
    // For Customers: Only sender/receiver can view
    if (!isAdmin && !isAssignedToMe && (!isCustomer || !isMyParcel) && user?.role === 'agent') {
        return (
            <SafeAreaView style={globalStyles.safeArea}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButtonContainer}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Access Denied</Text>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.unauthorizedContainer}>
                    <Ionicons name="lock-closed-outline" size={64} color={colors.error} />
                    <Text style={styles.unauthorizedTitle}>Unauthorized Access</Text>
                    <Text style={styles.unauthorizedText}>
                        You are not assigned to this courier. Only assigned agents and admins can view these details.
                    </Text>
                    <Pressable style={styles.backHomeButton} onPress={() => router.replace('/')}>
                        <Text style={styles.backHomeButtonText}>Back to Home</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    if (isSubmitting) {
        return (
            <SafeAreaView style={globalStyles.safeArea}>
                <Stack.Screen options={{ headerShown: false }} />
                <LoadingState message="Wait a moment..." />
            </SafeAreaView>
        );
    }

    const formattedCreated = new Date(courier.createdAt).toLocaleString();
    const formattedUpdated = new Date(courier.updatedAt).toLocaleString();


    return (
        <SafeAreaView style={globalStyles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                        styles.backButtonContainer,
                        pressed && { opacity: 0.6 }
                    ]}
                    hitSlop={15}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Courier Details</Text>
                <View style={styles.headerActions}>
                    {canManageStatus && (
                        <Pressable onPress={() => setShowStatusModal(true)} style={styles.actionIconButton}>
                            <Ionicons name="ellipsis-vertical" size={22} color={colors.primary} />
                        </Pressable>
                    )}
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                    {/* Status Section */}
                    <View style={styles.statusSection}>
                        <StatusBadge status={courier.currentStatus} />
                    </View>

                    {courier.branchId && (
                        <View style={styles.branchHeader}>
                            <Ionicons name="business" size={14} color={colors.textSecondary} />
                            <Text style={styles.branchHeaderText}>Assigned to Branch</Text>
                        </View>
                    )}

                    {isEditing ? (
                        /* Edit Mode */
                        <View style={styles.editSection}>
                            <FormInput
                                label="Sender Name"
                                value={editForm.senderName}
                                onChangeText={(v) => {
                                    setEditForm((p) => ({ ...p, senderName: v }));
                                    if (editErrors.senderName) setEditErrors((p) => ({ ...p, senderName: '' }));
                                }}
                                error={editErrors.senderName}
                            />
                            <FormInput
                                label="Receiver Name"
                                value={editForm.receiverName}
                                onChangeText={(v) => {
                                    setEditForm((p) => ({ ...p, receiverName: v }));
                                    if (editErrors.receiverName) setEditErrors((p) => ({ ...p, receiverName: '' }));
                                }}
                                error={editErrors.receiverName}
                            />
                            <FormInput
                                label="Receiver Phone"
                                value={editForm.receiverPhone}
                                onChangeText={(v) => {
                                    const numeric = v.replace(/[^0-9]/g, '');
                                    if (numeric.length <= 10) {
                                        setEditForm((p) => ({ ...p, receiverPhone: numeric }));
                                        if (editErrors.receiverPhone) setEditErrors((p) => ({ ...p, receiverPhone: '' }));
                                    }
                                }}
                                keyboardType="phone-pad"
                                error={editErrors.receiverPhone}
                                maxLength={10}
                            />
                            <FormInput
                                label="Pickup Address"
                                value={editForm.pickupAddress}
                                onChangeText={(v) => {
                                    setEditForm((p) => ({ ...p, pickupAddress: v }));
                                    if (editErrors.pickupAddress) setEditErrors((p) => ({ ...p, pickupAddress: '' }));
                                }}
                                multiline
                                error={editErrors.pickupAddress}
                            />
                            <FormInput
                                label="Delivery Address"
                                value={editForm.deliveryAddress}
                                onChangeText={(v) => {
                                    setEditForm((p) => ({ ...p, deliveryAddress: v }));
                                    if (editErrors.deliveryAddress) setEditErrors((p) => ({ ...p, deliveryAddress: '' }));
                                }}
                                multiline
                                error={editErrors.deliveryAddress}
                            />
                            <FormInput
                                label="Notes"
                                value={editForm.notes}
                                onChangeText={(v) => setEditForm((p) => ({ ...p, notes: v }))}
                                multiline
                            />

                            <View style={globalStyles.row}>
                                <View style={{ flex: 1 }}>
                                    <FormInput
                                        label="Weight (kg)"
                                        value={editForm.weight}
                                        onChangeText={(v) => setEditForm((p) => ({ ...p, weight: v }))}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ width: spacing.md }} />
                                <View style={{ flex: 1 }}>
                                    <FormInput
                                        label="Distance (km)"
                                        value={editForm.distance}
                                        onChangeText={(v) => setEditForm((p) => ({ ...p, distance: v }))}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

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
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="save-outline" size={20} color="#fff" />
                                        <Text style={globalStyles.buttonText}>Save Changes</Text>
                                    </View>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        /* View Mode */
                        <>
                            {/* Primary Actions */}
                            {!isCustomer && (
                                <View style={styles.actionsContainer}>
                                    {isAdmin && (
                                        <Pressable
                                            style={[styles.actionButton, styles.assignButton]}
                                            onPress={() => setShowAgentModal(true)}
                                        >
                                            <Ionicons name="person-add-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                            <Text style={styles.actionButtonText}>Assign Agent</Text>
                                        </Pressable>
                                    )}

                                    {canManageStatus && courier.currentStatus !== 'delivered' && courier.currentStatus !== 'cancelled' && (
                                        <Pressable
                                            style={styles.actionButton}
                                            onPress={() => {
                                                if (courier.currentStatus === 'out_for_delivery') {
                                                    setShowPodModal(true);
                                                } else {
                                                    setShowStatusModal(true);
                                                }
                                            }}
                                        >
                                            <Ionicons
                                                name={courier.currentStatus === 'out_for_delivery' ? "checkbox-outline" : "sync-outline"}
                                                size={20}
                                                color="#fff"
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text style={styles.actionButtonText}>
                                                {courier.currentStatus === 'out_for_delivery' ? 'Proof of Delivery' : 'Update Status'}
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            )}

                            {/* Secondary Actions (Edit/Delete) - Admin Only */}
                            {isAdmin && (
                                <View style={styles.secondaryActions}>
                                    <Pressable style={styles.secondaryAction} onPress={() => setIsEditing(true)}>
                                        <Ionicons name="create-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                                        <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Edit Details</Text>
                                    </Pressable>
                                    <View style={styles.divider} />
                                    <Pressable style={styles.secondaryAction} onPress={handleDelete}>
                                        <Ionicons name="trash-outline" size={18} color={colors.error} style={{ marginRight: 6 }} />
                                        <Text style={[styles.secondaryActionText, { color: colors.error }]}>Delete Courier</Text>
                                    </Pressable>
                                </View>
                            )}

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
                                <Text style={styles.sectionTitle}>Invoice & Billing</Text>
                                <View style={globalStyles.card}>
                                    {courier.price ? (
                                        <>
                                            <View style={globalStyles.spaceBetween}>
                                                <Text style={styles.subValue}>Weight: {courier.weight} kg</Text>
                                                <Text style={styles.subValue}>Distance: {courier.distance} km</Text>
                                            </View>
                                            <View style={[globalStyles.spaceBetween, { marginTop: spacing.sm }]}>
                                                <Text style={styles.value}>Total: ${courier.price.toFixed(2)}</Text>
                                                <Pressable
                                                    onPress={() => router.push(`/couriers/${id}/invoice`)}
                                                    style={{ padding: spacing.xs }}
                                                >
                                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>View Invoice &rarr;</Text>
                                                </Pressable>
                                            </View>
                                        </>
                                    ) : (
                                        <Text style={styles.subValue}>Add weight and distance to generate invoice</Text>
                                    )}
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Timestamps</Text>
                                <View style={globalStyles.card}>
                                    <Text style={styles.subValue}>Created: {formattedCreated}</Text>
                                    <Text style={styles.subValue}>Updated: {formattedUpdated}</Text>
                                </View>
                            </View>

                            {courier.assignedTo && (
                                <View style={[styles.section, { marginTop: spacing.md }]}>
                                    <Text style={styles.sectionTitle}>Assigned Agent</Text>
                                    <View style={[globalStyles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                                        <View style={{ backgroundColor: colors.primary + '15', padding: 10, borderRadius: 25 }}>
                                            <Ionicons name="bicycle" size={24} color={colors.primary} />
                                        </View>
                                        <View>
                                            <Text style={[styles.value, { fontWeight: '700' }]}>
                                                {agents?.find(a => a._id === courier.assignedTo)?.name || "Delivery Agent"}
                                            </Text>
                                            <Text style={styles.subValue}>Platform ID: {courier.assignedTo}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Activity Log */}
                            <ActivityLog courierId={courier._id} />
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Proof of Delivery Modal */}
            <Modal
                visible={showPodModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPodModal(false)}
            >
                <View style={styles.podOverlay}>
                    <View style={styles.podContent}>
                        <View style={styles.podHeader}>
                            <Text style={styles.podTitle}>Delivery Confirmation</Text>
                            <Pressable onPress={() => setShowPodModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <FormInput
                                label="Receiver Name"
                                placeholder="Who is receiving?"
                                value={podForm.signeeName}
                                onChangeText={(v) => setPodForm(p => ({ ...p, signeeName: v }))}
                            />

                            <Text style={styles.podLabel}>Signature</Text>
                            <SignaturePad
                                onOK={(sig) => setPodForm(p => ({ ...p, signature: sig }))}
                                onEmpty={() => setPodForm(p => ({ ...p, signature: null }))}
                            />

                            <Pressable
                                style={[styles.photoButton, podForm.photo && styles.photoButtonActive]}
                                onPress={handleTakePhoto}
                            >
                                <Ionicons
                                    name={podForm.photo ? "checkmark-circle" : "camera-outline"}
                                    size={20}
                                    color={podForm.photo ? colors.success : colors.primary}
                                />
                                <Text style={[styles.photoButtonText, podForm.photo && { color: colors.success }]}>
                                    {podForm.photo ? "Photo Captured" : "Take POD Photo (Optional)"}
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[globalStyles.button, styles.podSubmit]}
                                onPress={handlePodSubmit}
                            >
                                <Text style={globalStyles.buttonText}>Confirm Delivery</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

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

            {/* Agent Selection Modal */}
            <Modal
                visible={showAgentModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAgentModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Assign Delivery Agent</Text>
                            <Pressable onPress={() => setShowAgentModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </Pressable>
                        </View>

                        <FlatList
                            data={agents}
                            keyExtractor={(item) => item._id}
                            style={{ maxHeight: 400 }}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={styles.agentOption}
                                    onPress={() => handleAssignAgent(item._id)}
                                >
                                    <View style={styles.agentAvatar}>
                                        <Text style={styles.agentAvatarText}>{item.name.charAt(0)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.agentName}>{item.name}</Text>
                                        <Text style={styles.agentEmail}>{item.email}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                                    <Text style={{ color: colors.textMuted }}>No delivery agents found</Text>
                                </View>
                            }
                        />
                        <Pressable
                            style={[globalStyles.buttonSecondary, styles.modalCancel]}
                            onPress={() => setShowAgentModal(false)}
                        >
                            <Text style={globalStyles.buttonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModalContent}>
                        <Text style={styles.deleteModalTitle}>Delete Courier</Text>
                        <Text style={styles.deleteModalMessage}>
                            Are you sure you want to delete this courier? This action cannot be undone.
                        </Text>
                        <View style={styles.deleteModalButtons}>
                            <Pressable
                                style={[globalStyles.buttonSecondary, { flex: 1 }]}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={globalStyles.buttonText}>Cancel</Text>
                            </Pressable>
                            <View style={{ width: spacing.sm }} />
                            <Pressable
                                style={[globalStyles.button, styles.deleteConfirmButton, { flex: 1 }]}
                                onPress={confirmDelete}
                            >
                                <Text style={globalStyles.buttonText}>Delete</Text>
                            </Pressable>
                        </View>
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
        color: '#fff',
    },
    modalCancel: {
        marginTop: spacing.md,
    },
    deleteModalContent: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.lg,
        marginHorizontal: spacing.lg,
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    deleteModalTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    deleteModalMessage: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
        textAlign: 'center',
        lineHeight: 22,
    },
    deleteModalButtons: {
        flexDirection: 'row',
    },
    deleteConfirmButton: {
        backgroundColor: colors.error,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    backButton: {
        padding: spacing.xs,
        marginLeft: -spacing.xs,
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
    },
    branchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        backgroundColor: colors.surface,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: spacing.md,
        gap: 6,
    },
    branchHeaderText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    podOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    podContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.lg,
        height: '85%',
    },
    podHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    podTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
    },
    podLabel: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        marginTop: spacing.lg,
        gap: 8,
    },
    photoButtonActive: {
        borderColor: colors.success,
        backgroundColor: colors.success + '10',
    },
    photoButtonText: {
        color: colors.primary,
        fontWeight: '600',
    },
    podSubmit: {
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
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
    assignButton: {
        backgroundColor: (colors as any).success || '#27ae60',
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: fontSize.md,
    },
    secondaryActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.sm,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    secondaryAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
    },
    secondaryActionText: {
        fontSize: fontSize.sm,
        fontWeight: '600',
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: colors.border,
    },
    headerActions: {
        width: 44,
        alignItems: 'flex-end',
    },
    actionIconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    agentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 12,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    agentAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    agentAvatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    agentName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
    },
    agentEmail: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
    },
    unauthorizedContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
    },
    unauthorizedTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },
    unauthorizedText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    backHomeButton: {
        marginTop: spacing.lg,
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: 12,
    },
    backHomeButtonText: {
        color: '#fff',
        fontSize: fontSize.md,
        fontWeight: '600',
    },
});
