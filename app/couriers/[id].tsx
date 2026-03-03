import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Modal, KeyboardAvoidingView, Platform, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { StatusBadge, FormInput, ActivityLog, SignaturePad } from '../../src/components';
import { generateAndShareInvoice } from '../../src/components/invoice-generator';
import { colors, spacing, fontSize, globalStyles, borderRadius } from '../../src/styles/theme';
import { LoadingState, EmptyState, ErrorState } from '../../src/components';
import { useAuth } from '../../src/components/auth-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type CourierStatus =
    | 'booked'
    | 'pending'
    | 'picked_up'
    | 'dispatched'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';

const statusOptions: { label: string; value: CourierStatus }[] = [
    { label: 'Booked / Registered', value: 'booked' },
    { label: 'Pending / Action Needed', value: 'pending' },
    { label: 'Picked Up', value: 'picked_up' },
    { label: 'Arrived at Hub', value: 'dispatched' },
    { label: 'In Transit', value: 'in_transit' },
    { label: 'Cancelled', value: 'cancelled' },
];

export default function CourierDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const courier = useQuery(api.couriers.getById, { id: id as Id<'couriers'> });
    const agents = useQuery(api.users.listAgents);
    const branches = useQuery(api.branches.list);
    const isAdmin = user?.role === 'admin';
    const isBranchManager = user?.role === 'branch_manager';
    const isCustomer = user?.role === 'customer';
    const isAssignedToMe = courier?.assignedTo === user?._id;
    const belongsToMyBranch = courier?.branchId === user?.branchId;
    const isMyParcel = isCustomer && (
        courier?.receiverPhone === user?.phone ||
        courier?.senderPhone === user?.phone ||
        courier?.senderName === user?.name
    );
    const canManageStatus = isAdmin || isAssignedToMe || (isBranchManager && belongsToMyBranch);

    const updateCourier = useMutation(api.couriers.update);
    const updateStatus = useMutation(api.couriers.updateStatus);
    const removeCourier = useMutation(api.couriers.remove);
    const completeDelivery = useMutation(api.couriers.completeDelivery);
    const assignCourier = useMutation(api.couriers.assignCourier);
    const cancelCourier = useMutation(api.couriers.cancelCourier);

    const [isEditing, setIsEditing] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPodModal, setShowPodModal] = useState(false);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const showMenu = () => {
        const options = [
            { text: 'Cancel', style: 'cancel' as const },
            { text: 'Edit Courier Details', onPress: () => setIsEditing(true) },
        ];

        if (isAdmin) {
            options.push({
                text: 'Delete Courier',
                onPress: handleDelete,
                style: 'destructive' as const
            });
        }

        Alert.alert('Courier Actions', 'Select an operation:', options);
    };

    const [podForm, setPodForm] = useState({
        signeeName: '',
        signature: null as string | null,
        photo: null as string | null,
        otpCode: '',
    });
        // ... rest of the state
    
        const handleAssignBranch = async (branchId: Id<'branches'>) => {
            if (!courier) return;
            setShowBranchModal(false);
            setIsSubmitting(true);
            try {
                await updateCourier({
                    id: courier._id,
                    branchId,
                });
                Alert.alert('Success', 'Parcel assigned to branch hub.');
            } catch (error) {
                Alert.alert('Error', 'Failed to assign branch');
            } finally {
                setIsSubmitting(false);
            }
        };
    
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
                branchId: courier.branchId || '',
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

        // Mandatory Branch Assignment
        if ((isAdmin || isBranchManager) && !editForm.branchId) {
            newErrors.branchId = 'Branch assignment is mandatory';
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
                branchId: editForm.branchId ? (editForm.branchId as Id<'branches'>) : undefined,
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

            // Notification for Assignment
            const { notifyStatusChange } = require('../../src/utils/notifications');
            notifyStatusChange(
                courier.trackingId,
                'in_transit', // status changes to in_transit on assignment
                courier.receiverPhone,
                courier.senderName
            );

            Alert.alert('Success', 'Courier assigned to agent');
        } catch (error) {
            console.error('Failed to assign agent:', error);
            Alert.alert('Error', 'Failed to assign agent');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!courier) return;

        Alert.alert(
            'Cancel Booking',
            'Are you sure you want to cancel this booking? This action cannot be undone.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        setIsSubmitting(true);
                        try {
                            await cancelCourier({ id: courier._id });
                            Alert.alert('Cancelled', 'Your booking has been cancelled.');
                        } catch (error: any) {
                            Alert.alert('Error', error?.message || 'Failed to cancel booking');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDownloadInvoice = async () => {
        if (!courier) return;
        setIsSubmitting(true);
        try {
            await generateAndShareInvoice(courier, courier.trackingId);
        } catch (error) {
            console.error('Invoice error:', error);
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
        if (!podForm.otpCode || podForm.otpCode.length !== 4) {
            Alert.alert('OTP Required', 'Please enter the 4-digit delivery OTP.');
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
                id: courier._id,
                signeeName: podForm.signeeName.trim(),
                signatureId: podForm.signature || undefined,
                photoId: podForm.photo || undefined,
                otpCode: podForm.otpCode,
            });

            // Notification for Completion
            const { notifyStatusChange } = require('../../src/utils/notifications');
            notifyStatusChange(
                courier.trackingId,
                'delivered',
                courier.receiverPhone,
                courier.senderName
            );

            setShowPodModal(false);
            Alert.alert('Success', 'Delivery completed successfully!');
        } catch (error: any) {
            console.error('POD failed:', error);
            const errorMessage = error?.message || '';
            if (errorMessage.includes('Invalid OTP')) {
                Alert.alert('Security Check Failed', 'The OTP code you entered is incorrect. Please ask the customer for the 4-digit code shown on their tracking screen.');
            } else {
                Alert.alert('System Error', 'Failed to complete delivery. Please try again or contact support.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRebook = () => {
        if (!courier) return;
        router.push({
            pathname: '/couriers/add',
            params: {
                rebook: 'true',
                senderName: courier.senderName,
                senderPhone: courier.senderPhone || '',
                receiverName: courier.receiverName,
                receiverPhone: courier.receiverPhone,
                pickupAddress: courier.pickupAddress,
                deliveryAddress: courier.deliveryAddress,
                weight: courier.weight?.toString() || '',
                distance: courier.distance?.toString() || '',
            }
        });
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
                    <Pressable 
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/')} 
                        style={styles.backButtonContainer}
                    >
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
                    <Pressable 
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/')} 
                        style={styles.backButtonContainer}
                    >
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
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
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
                    {(isAdmin || (isBranchManager && belongsToMyBranch)) && (
                        <Pressable onPress={showMenu} style={styles.actionIconButton}>
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
                        <StatusBadge status={courier.currentStatus as any} />
                        {courier.deliveryType === 'express' && (
                            <View style={styles.expressBadge}>
                                <Ionicons name="flash" size={12} color="#fff" />
                                <Text style={styles.expressBadgeText}>EXPRESS</Text>
                            </View>
                        )}
                    </View>

                    {/* Status Timeline */}
                    <View style={styles.timelineSection}>
                        {(() => {
                            const steps = [
                                { key: 'booked', label: 'Booked', icon: 'receipt-outline' },
                                { key: 'in_transit', label: 'In Transit', icon: 'airplane-outline' },
                                { key: 'out_for_delivery', label: 'Out', icon: 'navigate-outline' },
                                { key: 'delivered', label: 'Delivered', icon: 'checkmark-done-outline' },
                            ];

                            let logicalIndex = 0;
                            if (courier.currentStatus === 'delivered') logicalIndex = 3;
                            else if (courier.currentStatus === 'out_for_delivery') logicalIndex = 2;
                            else if (['in_transit', 'dispatched', 'picked_up', 'pending'].includes(courier.currentStatus)) logicalIndex = 1;
                            else logicalIndex = 0; // booked

                            const isCancelled = courier.currentStatus === 'cancelled';

                            return (
                                <View style={styles.statusBarContainer}>
                                    <View style={styles.statusBarBackground} />
                                    <View style={styles.statusBarFillContainer}>
                                        <View
                                            style={[
                                                styles.statusBarFill,
                                                { 
                                                    width: isCancelled ? '0%' : 
                                                           `${(logicalIndex / (steps.length - 1)) * 100}%`
                                                }
                                            ]}
                                        />
                                    </View>
                                    <View style={styles.statusSteps}>
                                        {steps.map((step, idx) => {
                                            const isActive = !isCancelled && logicalIndex >= idx;
                                            return (
                                                <View key={step.key} style={styles.stepItem}>
                                                    <View style={[
                                                        styles.stepCircle,
                                                        isActive && styles.stepCircleActive,
                                                        isCancelled && { backgroundColor: colors.border }
                                                    ]}>
                                                        <Ionicons
                                                            name={step.icon as any}
                                                            size={14}
                                                            color={isActive ? '#fff' : colors.textMuted}
                                                        />
                                                    </View>
                                                    <Text style={[
                                                        styles.stepLabel,
                                                        isActive && styles.stepLabelActive
                                                    ]}>{step.label}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })()}
                    </View>

                    {/* Delivery OTP for Sender/Receiver */}
                    {(isMyParcel || isAdmin) && courier.currentStatus !== 'delivered' && courier.currentStatus !== 'cancelled' && courier.otpCode && (
                        <View style={styles.otpSection}>
                            <View style={styles.otpCard}>
                                <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={styles.otpLabel}>Delivery Security Code</Text>
                                    <Text style={styles.otpValue}>{courier.otpCode}</Text>
                                    <Text style={styles.otpHint}>Share this OTP with the agent upon delivery.</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {courier.branchId && (
                        <View style={styles.branchHeader}>
                            <Ionicons name="business" size={14} color={colors.textSecondary} />
                            <Text style={styles.branchHeaderText}>
                                Assigned to: {branches?.find(b => b._id === courier.branchId)?.name || 'Loading branch...'}
                            </Text>
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

                            {/* Branch Selection UI in Edit Mode */}
                            {(isAdmin || isBranchManager) && (
                                <View style={{ marginBottom: spacing.md }}>
                                    <Text style={globalStyles.label}>Branch Hub (Mandatory)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                                        {branches?.map(b => (
                                            <Pressable
                                                key={b._id}
                                                style={[
                                                    styles.branchChipSmall,
                                                    editForm.branchId === b._id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                ]}
                                                onPress={() => setEditForm(p => ({ ...p, branchId: b._id }))}
                                            >
                                                <Text style={[styles.branchChipSmallText, editForm.branchId === b._id && { color: '#fff' }]}>
                                                    {b.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                    {editErrors.branchId && <Text style={styles.errorTextSmall}>{editErrors.branchId}</Text>}
                                </View>
                            )}

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
                            {isCustomer ? (
                                <View style={styles.actionsContainerVertical}>
                                    <View style={styles.actionsRow}>
                                        {courier.currentStatus === 'booked' && (
                                            <Pressable
                                                style={[styles.actionButtonSplit, { backgroundColor: colors.error }]}
                                                onPress={handleCancelBooking}
                                            >
                                                <Ionicons name="close-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                                                <Text style={styles.actionButtonTextSmall}>Cancel</Text>
                                            </Pressable>
                                        )}
                                        {courier.price && (
                                            <Pressable
                                                style={[styles.actionButtonSplit, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                                                onPress={handleDownloadInvoice}
                                            >
                                                <Ionicons name="download-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                                                <Text style={[styles.actionButtonTextSmall, { color: colors.primary }]}>Invoice</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                    {(courier.currentStatus === 'delivered' || courier.currentStatus === 'cancelled') && (
                                        <Pressable
                                            style={styles.fullWidthButton}
                                            onPress={handleRebook}
                                        >
                                            <Ionicons name="refresh-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Rebook Quick</Text>
                                        </Pressable>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.actionsContainerVertical}>
                                    <View style={styles.actionsRow}>
                                        {(isAdmin || (isBranchManager && belongsToMyBranch)) && (
                                            <Pressable
                                                style={[styles.actionButtonSplit, styles.assignButton]}
                                                onPress={() => {
                                                    if (!courier.branchId && isAdmin) {
                                                        Alert.alert('Incomplete', 'Please assign a branch hub first.');
                                                    } else {
                                                        setShowAgentModal(true);
                                                    }
                                                }}
                                            >
                                                <Ionicons name="person-add-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                                                <Text style={styles.actionButtonTextSmall}>
                                                    {courier.assignedTo ? 'Re-assign Agent' : 'Assign Agent'}
                                                </Text>
                                            </Pressable>
                                        )}

                                        {canManageStatus && courier.currentStatus !== 'delivered' && courier.currentStatus !== 'cancelled' && (
                                            <Pressable
                                                style={styles.actionButtonSplit}
                                                onPress={() => {
                                                    // Only Admin and Assigned Agent can trigger the OTP/POD flow
                                                    if (courier.currentStatus === 'out_for_delivery' && (isAdmin || isAssignedToMe)) {
                                                        setShowPodModal(true);
                                                    } else {
                                                        setShowStatusModal(true);
                                                    }
                                                }}
                                            >
                                                <Ionicons
                                                    name={courier.currentStatus === 'out_for_delivery' && (isAdmin || isAssignedToMe) ? "checkbox-outline" : "sync-outline"}
                                                    size={18}
                                                    color="#fff"
                                                    style={{ marginRight: 6 }}
                                                />
                                                <Text style={styles.actionButtonTextSmall}>
                                                    {courier.currentStatus === 'out_for_delivery' && (isAdmin || isAssignedToMe) ? 'Complete' : 'Update'}
                                                </Text>
                                            </Pressable>
                                        )}
                                    </View>

                                    {isAdmin && (
                                        <Pressable
                                            style={[styles.fullWidthButton, { marginTop: spacing.sm }]}
                                            onPress={() => setShowBranchModal(true)}
                                        >
                                            <Ionicons name="business-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                            <Text style={styles.actionButtonText}>
                                                {courier.branchId ? 'Reassign Branch Hub' : 'Assign Branch Hub'}
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            )}

                            {/* Logistics Hub Info */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Logistics Hub</Text>
                                <View style={globalStyles.card}>
                                    <View style={styles.hubRow}>
                                        <Ionicons name="business" size={18} color={colors.primary} />
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={styles.hubLabel}>Assigned Branch</Text>
                                            <Text style={styles.hubValueText}>
                                                {branches?.find(b => b._id === courier.branchId)?.name || 'Not Assigned'}
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    {courier.assignedTo && (
                                        <View style={[styles.hubRow, { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }]}>
                                            <Ionicons name="bicycle" size={18} color={colors.success} />
                                            <View style={{ marginLeft: 12 }}>
                                                <Text style={styles.hubLabel}>Delivery Agent</Text>
                                                <Text style={styles.hubValueText}>
                                                    {agents?.find(a => a._id === courier.assignedTo)?.name || "Assigned Agent"}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>

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
                                                <Text style={styles.value}>Total: ₹{courier.price.toFixed(2)}</Text>
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
                                <Text style={styles.sectionTitle}>Tracking Status</Text>
                                <View style={globalStyles.card}>
                                    <View style={globalStyles.spaceBetween}>
                                        <Text style={styles.subValue}>Estimated Delivery</Text>
                                        <Text style={[styles.value, { color: colors.primary, fontWeight: 'bold' }]}>
                                            {courier.expectedDeliveryDate || 'TBD'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Timestamps</Text>
                                <View style={globalStyles.card}>
                                    <Text style={styles.subValue}>Created: {formattedCreated}</Text>
                                    <Text style={styles.subValue}>Updated: {formattedUpdated}</Text>
                                </View>
                            </View>

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
                            <Text style={styles.podTitle}>Confirm Delivery</Text>
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

                            <FormInput
                                label="Delivery OTP (4 Digits)"
                                placeholder="Enter 4-digit code"
                                value={podForm.otpCode}
                                onChangeText={(v) => {
                                    const numeric = v.replace(/[^0-9]/g, '');
                                    if (numeric.length <= 4) {
                                        setPodForm(p => ({ ...p, otpCode: numeric }));
                                    }
                                }}
                                keyboardType="numeric"
                                maxLength={4}
                            />

                            <Text style={styles.podLabel}>Digital Signature</Text>
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
                                    {podForm.photo ? "Arrival Photo Captured" : "Take Arrival Photo (Optional)"}
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[globalStyles.button, styles.podSubmit]}
                                onPress={handlePodSubmit}
                            >
                                <Text style={globalStyles.buttonText}>Finalize Delivery</Text>
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
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Parcel Status</Text>
                            <Pressable onPress={() => setShowStatusModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </Pressable>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
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
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Branch Selection Modal */}
            <Modal
                visible={showBranchModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowBranchModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Branch Hub</Text>
                            <Pressable onPress={() => setShowBranchModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </Pressable>
                        </View>

                        <FlatList
                            data={branches}
                            keyExtractor={(item) => item._id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={styles.agentOption}
                                    onPress={() => handleAssignBranch(item._id)}
                                >
                                    <View style={[styles.agentAvatar, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="business" size={20} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.agentName}>{item.name}</Text>
                                        <Text style={styles.agentEmail}>{item.address}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.border} />
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                                    <Text style={{ color: colors.textMuted }}>No branch hubs found</Text>
                                </View>
                            }
                        />
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
                            <Text style={styles.modalTitle}>Assign Agent</Text>
                            <Pressable onPress={() => setShowAgentModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </Pressable>
                        </View>

                        <FlatList
                            data={agents?.filter(a => a.branchId === courier.branchId)}
                            keyExtractor={(item) => item._id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <Pressable
                                    key={item._id}
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
                                    <Ionicons name="chevron-forward" size={20} color={colors.border} />
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                                    <Text style={{ color: colors.textMuted }}>No delivery agents found in this branch</Text>
                                </View>
                            }
                        />
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
                <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
                    <View style={styles.deleteModalContent}>
                        <Ionicons name="trash-outline" size={48} color={colors.error} style={{ alignSelf: 'center', marginBottom: spacing.md }} />
                        <Text style={styles.deleteModalTitle}>Remove Courier?</Text>
                        <Text style={styles.deleteModalMessage}>
                            This action is permanent and will remove all tracking history for this parcel.
                        </Text>
                        <View style={styles.deleteModalButtons}>
                            <Pressable
                                style={[globalStyles.buttonSecondary, { flex: 1, borderColor: colors.textMuted }]}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={globalStyles.buttonSecondaryText}>Keep It</Text>
                            </Pressable>
                            <View style={{ width: spacing.md }} />
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
        height: 64,
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.text,
        flex: 1,
        textAlign: 'center',
    },
    headerActions: {
        width: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    actionIconButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -spacing.sm,
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
    statusSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    assignButton: {
        backgroundColor: colors.success,
    },
    actionsContainerVertical: {
        marginBottom: spacing.xl,
        gap: spacing.sm,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionButtonSplit: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    fullWidthButton: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        paddingVertical: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionButtonTextSmall: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
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
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        letterSpacing: -0.5,
    },
    podOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'flex-end',
    },
    podContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: spacing.lg,
        height: '90%',
        borderWidth: 1,
        borderColor: colors.border,
    },
    podHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    podTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        letterSpacing: -0.5,
    },
    deleteModalContent: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: spacing.xl,
        marginHorizontal: spacing.lg,
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: colors.border,
    },
    deleteModalTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    deleteModalMessage: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
        textAlign: 'center',
        lineHeight: 24,
    },
    deleteModalButtons: {
        flexDirection: 'row',
        marginTop: spacing.sm,
    },
    deleteConfirmButton: {
        backgroundColor: colors.error,
        borderColor: colors.error,
    },
    statusOption: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        borderRadius: 16,
        marginBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statusOptionActive: {
        backgroundColor: colors.primary + '20',
        borderColor: colors.primary,
    },
    statusOptionText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    statusOptionTextActive: {
        fontWeight: '700',
        color: colors.primary,
    },
    agentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    agentAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    agentAvatarText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 18,
    },
    agentName: {
        fontSize: fontSize.md,
        fontWeight: 'bold',
        color: colors.text,
    },
    agentEmail: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        marginTop: 2,
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
    otpSection: {
        marginBottom: spacing.lg,
    },
    otpCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '10',
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary + '30',
        borderStyle: 'dashed',
    },
    otpLabel: {
        fontSize: fontSize.xs,
        fontWeight: '600',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    otpValue: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        color: colors.primary,
        marginVertical: 2,
    },
    otpHint: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
    },
    branchChipSmall: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.xs,
    },
    branchChipSmallText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    errorTextSmall: {
        fontSize: 10,
        color: colors.error,
        marginTop: 2,
    },
    expressBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
    },
    expressBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    timelineSection: {
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.xs,
    },
    statusBarContainer: {
        height: 60,
        justifyContent: 'center',
        position: 'relative',
    },
    statusBarBackground: {
        position: 'absolute',
        top: 25,
        left: 30, // center of first step (60/2)
        right: 30, // center of last step (60/2)
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
    },
    statusBarFillContainer: {
        position: 'absolute',
        top: 25,
        left: 30,
        right: 30,
        height: 4,
        zIndex: 0,
    },
    statusBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    statusSteps: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    stepItem: {
        alignItems: 'center',
        width: 60,
    },
    stepCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    stepCircleActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    stepLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 6,
        fontWeight: '500',
    },
    stepLabelActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    assignButton: {
        backgroundColor: colors.success,
    },
    actionsContainerVertical: {
        marginBottom: spacing.xl,
        gap: spacing.sm,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionButtonSplit: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    fullWidthButton: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        paddingVertical: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionButtonTextSmall: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    hubRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hubLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    hubValueText: {
        fontSize: fontSize.md,
        color: '#fff',
        fontWeight: '600',
    },
});
