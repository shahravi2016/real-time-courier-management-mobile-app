import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Modal, KeyboardAvoidingView, Platform, Alert, FlatList, Image, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { StatusBadge, FormInput, ActivityLog, SignaturePad } from '../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';
import { LoadingState } from '../../src/components';
import { useAuth } from '../../src/components/auth-context';
import { useSafeNavigation } from '../../src/utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type CourierStatus = 'booked' | 'pending' | 'picked_up' | 'dispatched' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled';

const statusOptions: { label: string; value: CourierStatus }[] = [
    { label: 'Booked / Registered', value: 'booked' },
    { label: 'Pending / Action Needed', value: 'pending' },
    { label: 'Picked Up', value: 'picked_up' },
    { label: 'Arrived at Hub', value: 'dispatched' },
    { label: 'In Transit', value: 'in_transit' },
    { label: 'Out for Delivery', value: 'out_for_delivery' },
    { label: 'Cancelled', value: 'cancelled' },
];

export default function CourierDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useSafeNavigation();
    const { user } = useAuth();

    const courier = useQuery(api.couriers.getById, { id: id as Id<'couriers'>, userId: user?._id as string });
    const agents = useQuery(api.users.listAgents, user?.role === 'branch_manager' ? { branchId: user.branchId as Id<'branches'> } : {});
    const branches = useQuery(api.branches.list);

    const isAdmin = user?.role === 'admin';
    const isBranchManager = user?.role === 'branch_manager';
    const isStaff = isAdmin || isBranchManager;
    const isAssignedToMe = courier?.assignedTo === user?._id;

    const updateStatus = useMutation(api.couriers.updateStatus);
    const removeCourier = useMutation(api.couriers.remove);
    const completeDelivery = useMutation(api.couriers.completeDelivery);
    const assignAgent = useMutation(api.couriers.assignAgent);
    const assignBranch = useMutation(api.couriers.assignBranch);
    const generateUploadUrl = useMutation(api.couriers.generateUploadUrl);
    const cancelCourier = useMutation(api.couriers.cancelCourier);

    const markPickedUp = useMutation(api.couriers.markPickedUp);
    const transferToDestination = useMutation(api.couriers.transferToDestination);
    const arriveAtDestinationHub = useMutation(api.couriers.arriveAtDestinationHub);

    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPodModal, setShowPodModal] = useState(false);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingWeight, setIsEditingWeight] = useState(false);
    const [weightInput, setWeightInput] = useState('');

    const [editForm, setEditForm] = useState({
        senderName: '',
        senderPhone: '',
        receiverName: '',
        receiverPhone: '',
        pickupAddress: '',
        deliveryAddress: '',
        notes: '',
        weight: '',
        deliveryType: 'normal' as 'normal' | 'express',
    });

    const handleCopyId = () => {
        if (courier?.trackingId) {
            Clipboard.setString(courier.trackingId);
            if (Platform.OS === 'web') {
                window.alert('Tracking ID copied to clipboard!');
            } else {
                Alert.alert('Copied', 'Tracking ID copied to clipboard.');
            }
        }
    };

    const updateCourier = useMutation(api.couriers.update);

    const handleOpenEdit = () => {
        if (!courier) return;
        setEditForm({
            senderName: courier.senderName,
            senderPhone: courier.senderPhone || '',
            receiverName: courier.receiverName,
            receiverPhone: courier.receiverPhone,
            pickupAddress: courier.pickupAddress,
            deliveryAddress: courier.deliveryAddress,
            notes: courier.notes || '',
            weight: (courier.weight || 0).toString(),
            deliveryType: (courier.deliveryType as any) || 'normal',
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        setIsSubmitting(true);
        try {
            await updateCourier({
                id: courier!._id,
                senderName: editForm.senderName,
                senderPhone: editForm.senderPhone,
                receiverName: editForm.receiverName,
                receiverPhone: editForm.receiverPhone,
                pickupAddress: editForm.pickupAddress,
                deliveryAddress: editForm.deliveryAddress,
                notes: editForm.notes,
                weight: parseFloat(editForm.weight) || 0,
                deliveryType: editForm.deliveryType,
                userId: user?._id as Id<'users'>
            });
            setShowEditModal(false);
            Alert.alert('Success', 'Courier details updated.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRepost = async () => {
        Alert.alert(
            "Restore Booking",
            "This will re-activate the courier and move it back to 'Booked' status. Continue?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Re-post",
                    onPress: async () => {
                        try {
                            await updateStatus({ id: courier!._id, status: 'booked' });
                            Alert.alert("Success", "Courier has been re-posted to the system.");
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    }
                }
            ]
        );
    };

    const isMoving = !["booked", "pending", "cancelled"].includes(courier?.currentStatus || "");
    const canCancel = courier?.currentStatus === 'booked' || courier?.currentStatus === 'pending';
    const isCancelled = courier?.currentStatus === 'cancelled';
    const isCustomer = user?.role === 'customer';

    const handleCancelCourier = async () => {
        Alert.alert(
            "Cancel Booking",
            "Are you sure you want to cancel this courier? This action cannot be undone.",
            [
                { text: "Keep Booking", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await cancelCourier({
                                id: id as Id<'couriers'>,
                                userId: user?._id as Id<'users'>
                            });
                            Alert.alert("Success", "Courier cancelled successfully.");
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    }
                }
            ]
        );
    };

    const [podForm, setPodForm] = useState({
        signeeName: '',
        signature: null as string | null,
        photo: null as string | null,
        otpCode: '',
    });

    const [scrollEnabled, setScrollEnabled] = useState(true);

    const triggerNotification = (status: string) => {
        const msg = status === 'out_for_delivery'
            ? `SMS Sent to ${courier?.receiverPhone}: Your parcel is out for delivery with agent.`
            : `Email Sent to ${courier?.senderName}: Parcel status updated to ${status.replace('_', ' ')}.`;

        Alert.alert('System Notification', msg);
    };

    const handleUpdateStatus = async (status: CourierStatus) => {
        try {
            await updateStatus({
                id: id as Id<'couriers'>,
                status,
                userId: user?._id as Id<'users'>
            });
            setShowStatusModal(false);
            triggerNotification(status);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleAssignAgent = async (agentId: Id<'users'>) => {
        try {
            await assignAgent({
                id: id as Id<'couriers'>,
                agentId,
                userId: user?._id as Id<'users'>
            });
            setShowAgentModal(false);
            Alert.alert('Success', 'Agent assigned successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleTransferHub = async (branchId: Id<'branches'>) => {
        try {
            await assignBranch({
                id: id as Id<'couriers'>,
                branchId,
                userId: user?._id as Id<'users'>
            });
            setShowBranchModal(false);
            Alert.alert('Success', 'Parcel transferred to selected hub.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handlePickupAction = async () => {
        try {
            await markPickedUp({ id: id as Id<'couriers'>, agentId: user?._id as Id<'users'> });
            triggerNotification('picked_up');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleTransferAction = async () => {
        setIsSubmitting(true);
        try {
            await transferToDestination({ id: id as Id<'couriers'>, managerId: user?._id as Id<'users'> });
            triggerNotification('in_transit');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReceiveAction = async () => {
        setIsSubmitting(true);
        try {
            await arriveAtDestinationHub({ id: id as Id<'couriers'>, managerId: user?._id as Id<'users'> });
            triggerNotification('dispatched');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateWeight = async () => {
        const val = parseFloat(weightInput);
        if (isNaN(val) || val <= 0) return Alert.alert('Invalid', 'Please enter a valid weight.');

        setIsSubmitting(true);
        try {
            await updateCourier({
                id: id as Id<'couriers'>,
                weight: val,
                userId: user?._id as Id<'users'>
            });
            setIsEditingWeight(false);
            Alert.alert('Success', 'Weight updated successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const uploadToCloud = async (uri: string, isBase64 = false) => {
        try {
            const postUrl = await generateUploadUrl();

            // Safer way to get blob in React Native for local/data URIs
            // Using fetch().blob() is more reliable for data URIs than XHR
            const blob = await (await fetch(uri)).blob();

            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": isBase64 ? "image/png" : "image/jpeg" },
                body: blob,
            });
            const { storageId } = await result.json();
            return storageId;
        } catch (e) {
            console.error('Upload failed:', e);
            return null;
        }
    };

    const handlePodSubmit = async () => {
        if (!podForm.signeeName.trim() || !podForm.signature || !podForm.otpCode) {
            Alert.alert('Required', 'Name, Signature and OTP are mandatory.');
            return;
        }
        setIsSubmitting(true);
        try {
            const sigId = await uploadToCloud(podForm.signature, true);
            let photoId = undefined;
            if (podForm.photo) photoId = await uploadToCloud(podForm.photo, false);

            await completeDelivery({
                id: courier!._id,
                signeeName: podForm.signeeName.trim(),
                signatureId: sigId || undefined,
                photoId: photoId || undefined,
                otpCode: podForm.otpCode,
            });
            setShowPodModal(false);
            triggerNotification('delivered');
            Alert.alert('Success', 'Delivery completed and Proof stored in cloud.');
        } catch (error: any) {
            const errorMsg = error.message || '';
            if (errorMsg.includes("Invalid OTP")) {
                Alert.alert('Wrong OTP', 'The 4-digit code provided does not match our records. Please verify with the receiver.');
            } else {
                Alert.alert('Error', errorMsg || 'Failed to complete delivery.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Error', 'Camera access denied');
        const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
        if (!result.canceled) setPodForm(p => ({ ...p, photo: result.assets[0].uri }));
    };

    const handleDeleteCourier = async () => {
        try {
            await removeCourier({ id: id as Id<'couriers'> });
            router.replace('/couriers');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    if (!courier) return <LoadingState message="Loading courier..." />;

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButtonContainer}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Parcel Details</Text>
                <View style={{ width: 44 }}>
                    {isAdmin && (
                        <Pressable onPress={() => setShowDeleteModal(true)} style={styles.actionIconButton}>
                            <Ionicons name="trash-outline" size={22} color={colors.error} />
                        </Pressable>
                    )}
                </View>
            </View>

            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Cancelled Alert Banner */}
                {isCancelled && (
                    <View style={styles.cancelledBanner}>
                        <View style={globalStyles.row}>
                            <Ionicons name="alert-circle" size={24} color={colors.error} />
                            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                                <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
                                <Text style={styles.cancelledText}>This courier is inactive. You can edit details or re-post it to the system.</Text>
                            </View>
                        </View>
                        <View style={[globalStyles.row, { marginTop: spacing.md, gap: spacing.sm }]}>
                            <Pressable style={styles.bannerActionBtn} onPress={handleOpenEdit}>
                                <Ionicons name="create-outline" size={18} color={colors.text} />
                                <Text style={styles.bannerActionText}>Edit Details</Text>
                            </Pressable>
                            <Pressable style={[styles.bannerActionBtn, { backgroundColor: colors.primary }]} onPress={handleRepost}>
                                <Ionicons name="refresh" size={18} color="#fff" />
                                <Text style={[styles.bannerActionText, { color: '#fff' }]}>Re-post Courier</Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                {/* Status Bar */}
                <View style={styles.statusSection}>
                    <StatusBadge status={courier.currentStatus as any} />
                    {isStaff && courier.currentStatus !== 'delivered' && (
                        <Pressable onPress={() => setShowStatusModal(true)} style={styles.updateStatusBtn}>
                            <Text style={styles.updateStatusText}>Update Status</Text>
                        </Pressable>
                    )}
                </View>

                {/* Primary Card: Tracking & Participants */}
                <View style={globalStyles.card}>
                    <Text style={styles.trackingLabel}>Tracking ID</Text>
                    <View style={[globalStyles.row, { alignItems: 'center', gap: 12 }]}>
                        <Text style={styles.trackingId}>{courier.trackingId}</Text>
                        <Pressable onPress={handleCopyId} style={styles.copyButton}>
                            <Ionicons name="copy-outline" size={18} color={colors.primary} />
                        </Pressable>
                    </View>
                    {courier.agentName && (
                        <View style={{ marginTop: spacing.xs, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="person" size={14} color={colors.primary} />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                                Agent: {courier.agentName}
                            </Text>
                        </View>
                    )}
                    <View style={styles.divider} />
                    <View style={globalStyles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Sender</Text>
                            <Text style={styles.value}>{courier.senderName}</Text>
                            <Text style={styles.mutedText}>{courier.senderPhone}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Receiver</Text>
                            <Text style={styles.value}>{courier.receiverName}</Text>
                            <Text style={styles.mutedText}>{courier.receiverPhone}</Text>
                        </View>
                    </View>
                </View>

                {/* Shipping Route Section */}
                <View style={[globalStyles.card, { marginTop: spacing.md }]}>
                    <Text style={styles.sectionTitle}>Shipping Route</Text>
                    <View style={styles.routeRow}>
                        <View style={styles.routeIconContainer}>
                            <View style={styles.dot} />
                            <View style={styles.line} />
                            <Ionicons name="location" size={16} color={colors.primary} />
                        </View>
                        <View style={styles.routeContent}>
                            <View style={styles.routeItem}>
                                <Text style={styles.label}>Pickup Address</Text>
                                <Text style={styles.value}>{courier.pickupAddress}</Text>
                            </View>
                            <View style={[styles.routeItem, { marginTop: spacing.md }]}>
                                <Text style={styles.label}>Delivery Destination</Text>
                                <Text style={styles.value}>{courier.deliveryAddress}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Package Specifications */}
                <View style={[globalStyles.card, { marginTop: spacing.md }]}>
                    <Text style={styles.sectionTitle}>Package Details</Text>
                    <View style={styles.grid2}>
                        <View style={styles.gridItem}>
                            <Ionicons name="speedometer-outline" size={18} color={colors.primary} />
                            <View>
                                <Text style={styles.label}>Weight</Text>
                                <Text style={styles.value}>{courier.weight || '0'} kg</Text>
                            </View>
                        </View>
                        <View style={styles.gridItem}>
                            <Ionicons name="map-outline" size={18} color={colors.primary} />
                            <View>
                                <Text style={styles.label}>Distance</Text>
                                <Text style={styles.value}>{courier.distance || '0'} km</Text>
                            </View>
                        </View>
                    </View>
                    <View style={[styles.grid2, { marginTop: spacing.md }]}>
                        <View style={styles.gridItem}>
                            <Ionicons name="flash-outline" size={18} color={courier.deliveryType === 'express' ? colors.warning : colors.textMuted} />
                            <View>
                                <Text style={styles.label}>Service Type</Text>
                                <Text style={[styles.value, courier.deliveryType === 'express' && { color: colors.warning }]}>
                                    {courier.deliveryType === 'express' ? 'Express' : 'Standard'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.gridItem}>
                            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                            <View>
                                <Text style={styles.label}>OTP Code</Text>
                                <Text style={[styles.value, { letterSpacing: 2, color: colors.primary }]}>{courier.otpCode}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Billing & Invoice */}
                <View style={[globalStyles.card, { marginTop: spacing.md, backgroundColor: colors.surfaceElevated }]}>
                    <View style={globalStyles.spaceBetween}>
                        <View>
                            <Text style={styles.label}>Total Charges (Inc. GST)</Text>
                            <Text style={[styles.value, { fontSize: 24, fontWeight: '900', color: colors.primary }]}>₹{courier.price}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.label}>Payment Status</Text>
                            <View style={[styles.statusChip, { backgroundColor: courier.paymentStatus === 'paid' ? colors.success + '20' : colors.warning + '20' }]}>
                                <Text style={[styles.statusChipText, { color: courier.paymentStatus === 'paid' ? colors.success : colors.warning }]}>
                                    {(courier.paymentStatus || 'pending').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <Pressable
                        style={styles.invoiceBtn}
                        onPress={() => router.push(`/couriers/${id}/invoice`)}
                    >
                        <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                        <Text style={styles.invoiceBtnText}>View Detailed Tax Invoice</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </Pressable>
                </View>

                {/* Customer Actions (Cancellation) */}
                {isCustomer && canCancel && (
                    <View style={[globalStyles.card, { marginTop: spacing.md, borderColor: colors.error + '40', borderWidth: 1 }]}>
                        <Text style={[styles.sectionTitle, { color: colors.error }]}>Manage Booking</Text>
                        <Text style={[styles.mutedText, { marginBottom: spacing.md }]}>
                            You can cancel this booking as it hasn't been picked up yet. No charges will be applied.
                        </Text>
                        <Pressable
                            style={[globalStyles.button, { backgroundColor: colors.error }]}
                            onPress={handleCancelCourier}
                        >
                            <Ionicons name="close-circle" size={20} color="#fff" />
                            <Text style={globalStyles.buttonText}>Cancel Booking</Text>
                        </Pressable>
                    </View>
                )}

                {/* Proof of Delivery Display */}
                {courier.pod && (
                    <View style={[globalStyles.card, { marginTop: spacing.md, borderColor: colors.success }]}>
                        <Text style={styles.sectionTitle}>Proof of Delivery</Text>
                        <Text style={styles.label}>Received by: {courier.pod.signeeName}</Text>
                        <View style={styles.podVisuals}>
                            {courier.pod.signatureUrl && (
                                <View style={styles.podImageContainer}>
                                    <Text style={styles.tinyLabel}>Signature</Text>
                                    <Image
                                        source={{ uri: courier.pod.signatureUrl }}
                                        style={[styles.podPreview, styles.podSignature]}
                                        resizeMode="contain"
                                    />
                                </View>
                            )}
                            {courier.pod.photoUrl && (
                                <View style={styles.podImageContainer}>
                                    <Text style={styles.tinyLabel}>Arrival Photo</Text>
                                    <Image
                                        source={{ uri: courier.pod.photoUrl }}
                                        style={[styles.podPreview, styles.podPhoto]}
                                        resizeMode="contain"
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Operations Section (Staff Only) */}
                {isStaff && courier.currentStatus !== 'delivered' && (
                    <View style={styles.managementSection}>
                        <Text style={styles.sectionTitle}>Operations</Text>
                        <View style={globalStyles.row}>
                            <Pressable style={styles.manageBtn} onPress={() => setShowAgentModal(true)}>
                                <Ionicons name="person-add" size={18} color={colors.primary} />
                                <Text style={styles.manageBtnText}>{courier.assignedTo ? "Change Agent" : "Assign Agent"}</Text>
                            </Pressable>
                            <View style={{ width: spacing.md }} />
                            <Pressable style={styles.manageBtn} onPress={() => setShowBranchModal(true)}>
                                <Ionicons name="business" size={18} color={colors.primary} />
                                <Text style={styles.manageBtnText}>Transfer Hub</Text>
                            </Pressable>
                        </View>

                        {/* Weight Management for Staff */}
                        <View style={[styles.opsCard, { borderColor: colors.primary + '30' }]}>
                            <View style={globalStyles.spaceBetween}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={[styles.opsIcon, { backgroundColor: colors.primary + '10' }]}>
                                        <Ionicons name="scale-outline" size={18} color={colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={styles.opsLabel}>Parcel Weight</Text>
                                        <Text style={styles.opsValue}>{courier.weight} kg</Text>
                                    </View>
                                </View>
                                <Pressable
                                    style={styles.opsActionBtn}
                                    onPress={() => {
                                        setIsEditingWeight(!isEditingWeight);
                                        setWeightInput(courier.weight?.toString() || '');
                                    }}
                                >
                                    <Text style={styles.opsActionText}>{isEditingWeight ? 'Cancel' : 'Update'}</Text>
                                </Pressable>
                            </View>
                            {isEditingWeight && (
                                <View style={styles.opsEditWeight}>
                                    <View style={{ flex: 1 }}>
                                        <FormInput
                                            label="New Weight (kg)"
                                            value={weightInput}
                                            onChangeText={setWeightInput}
                                            placeholder="Enter weight in kg"
                                            keyboardType="numeric"
                                            autoFocus
                                        />
                                    </View>
                                    <Pressable
                                        style={[globalStyles.button, { height: 50, paddingHorizontal: 20, backgroundColor: colors.primary, marginTop: 4 }]}
                                        onPress={handleUpdateWeight}
                                        disabled={isSubmitting}
                                    >
                                        <Text style={globalStyles.buttonText}>{isSubmitting ? '...' : 'Save'}</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>

                        {/* Visibility limited to 'pending' (Arrived at Hub) for Transfer Hub */}
                        {courier.currentStatus === 'pending' && (
                            <Pressable
                                style={[globalStyles.button, { marginTop: spacing.md, backgroundColor: colors.warning }]}
                                onPress={handleTransferAction}
                                disabled={isSubmitting}
                            >
                                <Ionicons name="airplane-outline" size={20} color="#fff" />
                                <Text style={globalStyles.buttonText}>{isSubmitting ? 'Processing...' : 'Transfer to Destination Hub'}</Text>
                            </Pressable>
                        )}
                        {courier.currentStatus === 'in_transit' && (
                            <Pressable
                                style={[globalStyles.button, { marginTop: spacing.md, backgroundColor: colors.primary }]}
                                onPress={handleReceiveAction}
                                disabled={isSubmitting}
                            >
                                <Ionicons name="download-outline" size={20} color="#fff" />
                                <Text style={globalStyles.buttonText}>{isSubmitting ? 'Updating...' : 'Receive at Hub & Assign Agent'}</Text>
                            </Pressable>
                        )}
                    </View>
                )}

                {/* Agent Actions */}
                {isAssignedToMe && courier.currentStatus !== 'delivered' && (
                    <View style={styles.agentActions}>
                        {courier.currentStatus === 'pickup_assigned' && (
                            <Pressable style={[globalStyles.button, { backgroundColor: colors.warning, marginBottom: spacing.sm }]} onPress={handlePickupAction}>
                                <Ionicons name="cube-outline" size={20} color="#fff" />
                                <Text style={globalStyles.buttonText}>Mark as Picked Up</Text>
                            </Pressable>
                        )}
                        {courier.currentStatus === 'picked_up' && (
                            <Pressable style={[globalStyles.button, { backgroundColor: colors.primary, marginBottom: spacing.sm }]} onPress={() => handleUpdateStatus('pending')}>
                                <Ionicons name="business-outline" size={20} color="#fff" />
                                <Text style={globalStyles.buttonText}>Arrived at Hub</Text>
                            </Pressable>
                        )}
                        {(courier.currentStatus === 'out_for_delivery' || courier.currentStatus === 'dispatched') && (
                            <Pressable style={[globalStyles.button, { backgroundColor: colors.success }]} onPress={() => setShowPodModal(true)}>
                                <Ionicons name="checkmark-done" size={20} color="#fff" />
                                <Text style={globalStyles.buttonText}>Complete Delivery (POD)</Text>
                            </Pressable>
                        )}
                    </View>
                )}

                <ActivityLog courierId={courier._id} />
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modals */}
            <Modal
                visible={showStatusModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowStatusModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Parcel Status</Text>
                        {statusOptions.map((opt) => (
                            <Pressable key={opt.value} style={styles.optionItem} onPress={() => handleUpdateStatus(opt.value)}>
                                <Text style={[styles.optionText, courier.currentStatus === opt.value && { color: colors.primary, fontWeight: 'bold' }]}>{opt.label}</Text>
                            </Pressable>
                        ))}
                        <Pressable style={globalStyles.buttonSecondary} onPress={() => setShowStatusModal(false)}>
                            <Text style={globalStyles.buttonText}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showAgentModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAgentModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Assign to Delivery Agent</Text>
                        <FlatList
                            data={agents}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <Pressable style={styles.optionItem} onPress={() => handleAssignAgent(item._id)}>
                                    <View>
                                        <Text style={styles.optionText}>{item.name}</Text>
                                        <Text style={styles.tinyLabel}>{item.phone || "No phone"}</Text>
                                    </View>
                                    {courier.assignedTo === item._id && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                                </Pressable>
                            )}
                        />
                        <Pressable style={globalStyles.buttonSecondary} onPress={() => setShowAgentModal(false)}>
                            <Text style={globalStyles.buttonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showBranchModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowBranchModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Transfer to Branch Hub</Text>
                        <FlatList
                            data={branches}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <Pressable style={styles.optionItem} onPress={() => handleTransferHub(item._id)}>
                                    <View>
                                        <Text style={styles.optionText}>{item.name}</Text>
                                        <Text style={styles.tinyLabel}>{item.address}</Text>
                                    </View>
                                    {courier.branchId === item._id && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                                </Pressable>
                            )}
                        />
                        <Pressable style={globalStyles.buttonSecondary} onPress={() => setShowBranchModal(false)}>
                            <Text style={globalStyles.buttonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showPodModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPodModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Proof of Delivery</Text>
                        <ScrollView
                            scrollEnabled={scrollEnabled}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <FormInput label="Receiver Name" value={podForm.signeeName} onChangeText={v => setPodForm(p => ({ ...p, signeeName: v }))} />
                            <FormInput label="OTP Code" value={podForm.otpCode} onChangeText={v => setPodForm(p => ({ ...p, otpCode: v }))} keyboardType="numeric" maxLength={4} />
                            <Text style={styles.label}>Draw Signature</Text>
                            <View style={styles.signaturePadWrapper}>
                                <SignaturePad
                                    onOK={sig => {
                                        setPodForm(p => ({ ...p, signature: sig }));
                                        setScrollEnabled(true);
                                    }}
                                    onBegin={() => setScrollEnabled(false)}
                                    onEnd={() => setScrollEnabled(true)}
                                />
                            </View>
                            <Pressable style={styles.photoButton} onPress={handleTakePhoto}>
                                <Ionicons name="camera" size={20} color={colors.primary} />
                                <Text style={styles.photoButtonText}>{podForm.photo ? "Photo Captured" : "Take Arrival Photo"}</Text>
                            </Pressable>
                            <Pressable style={globalStyles.button} onPress={handlePodSubmit} disabled={isSubmitting}>
                                <Text style={globalStyles.buttonText}>{isSubmitting ? "Uploading Proof..." : "Submit & Complete"}</Text>
                            </Pressable>
                            <Pressable style={[globalStyles.buttonSecondary, { marginTop: spacing.sm }]} onPress={() => setShowPodModal(false)}>
                                <Text style={globalStyles.buttonText}>Cancel</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showEditModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Courier Details</Text>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {isMoving && (
                                <View style={styles.lockWarning}>
                                    <Ionicons name="lock-closed" size={14} color={colors.warning} />
                                    <Text style={styles.lockWarningText}>Price-related fields are locked because parcel is in movement.</Text>
                                </View>
                            )}

                            <Text style={styles.formSectionLabel}>PARTICIPANTS</Text>
                            <FormInput label="Sender Name" value={editForm.senderName} onChangeText={v => setEditForm(p => ({ ...p, senderName: v }))} />
                            <FormInput label="Sender Phone" value={editForm.senderPhone} onChangeText={v => setEditForm(p => ({ ...p, senderPhone: v }))} keyboardType="phone-pad" />
                            <FormInput label="Receiver Name" value={editForm.receiverName} onChangeText={v => setEditForm(p => ({ ...p, receiverName: v }))} />
                            <FormInput label="Receiver Phone" value={editForm.receiverPhone} onChangeText={v => setEditForm(p => ({ ...p, receiverPhone: v }))} keyboardType="phone-pad" />

                            <Text style={styles.formSectionLabel}>ADDRESSES</Text>
                            <FormInput label="Pickup Address" value={editForm.pickupAddress} onChangeText={v => setEditForm(p => ({ ...p, pickupAddress: v }))} multiline />
                            <FormInput label="Delivery Address" value={editForm.deliveryAddress} onChangeText={v => setEditForm(p => ({ ...p, deliveryAddress: v }))} multiline />

                            <Text style={styles.formSectionLabel}>SPECIFICATIONS</Text>
                            <FormInput
                                label="Weight (kg)"
                                value={editForm.weight}
                                onChangeText={v => setEditForm(p => ({ ...p, weight: v }))}
                                keyboardType="numeric"
                                editable={!isMoving}
                            />

                            <Text style={styles.label}>Delivery Type</Text>
                            <View style={[globalStyles.row, { gap: spacing.sm, marginBottom: spacing.md }]}>
                                <Pressable
                                    style={[styles.typeSelect, editForm.deliveryType === 'normal' && styles.typeSelectActive, isMoving && { opacity: 0.5 }]}
                                    onPress={() => !isMoving && setEditForm(p => ({ ...p, deliveryType: 'normal' }))}
                                    disabled={isMoving}
                                >
                                    <Text style={[styles.typeSelectText, editForm.deliveryType === 'normal' && styles.typeSelectTextActive]}>Normal</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.typeSelect, editForm.deliveryType === 'express' && styles.typeSelectActive, isMoving && { opacity: 0.5 }]}
                                    onPress={() => !isMoving && setEditForm(p => ({ ...p, deliveryType: 'express' }))}
                                    disabled={isMoving}
                                >
                                    <Text style={[styles.typeSelectText, editForm.deliveryType === 'express' && styles.typeSelectTextActive]}>Express</Text>
                                </Pressable>
                            </View>

                            <FormInput label="Additional Notes" value={editForm.notes} onChangeText={v => setEditForm(p => ({ ...p, notes: v }))} multiline />

                            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
                                <Pressable style={globalStyles.button} onPress={handleSaveEdit} disabled={isSubmitting}>
                                    <Text style={globalStyles.buttonText}>{isSubmitting ? "Saving..." : "Save Changes"}</Text>
                                </Pressable>
                                <Pressable style={globalStyles.buttonSecondary} onPress={() => setShowEditModal(false)}>
                                    <Text style={globalStyles.buttonText}>Cancel</Text>
                                </Pressable>
                            </View>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: 250 }]}>
                        <Text style={styles.modalTitle}>Delete Courier?</Text>
                        <Text style={[styles.mutedText, { marginBottom: spacing.xl }]}>This action cannot be undone. All data for this tracking ID will be permanently removed.</Text>
                        <View style={globalStyles.row}>
                            <Pressable style={[globalStyles.button, { flex: 1, backgroundColor: colors.error }]} onPress={handleDeleteCourier}>
                                <Text style={globalStyles.buttonText}>Delete</Text>
                            </Pressable>
                            <View style={{ width: spacing.md }} />
                            <Pressable style={[globalStyles.buttonSecondary, { flex: 1 }]} onPress={() => setShowDeleteModal(false)}>
                                <Text style={globalStyles.buttonText}>Keep</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, height: 64 },
    headerTitle: { fontSize: fontSize.lg, fontWeight: 'bold', color: colors.text },
    backButtonContainer: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    statusSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing.md },
    updateStatusBtn: { backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
    updateStatusText: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
    trackingLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    trackingId: { fontSize: 24, fontWeight: '900', color: colors.primary },
    copyButton: { padding: 4, marginLeft: 4 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
    label: { fontSize: 10, color: colors.textSecondary, marginBottom: 4, textTransform: 'uppercase', fontWeight: '600' },
    value: { fontSize: 15, fontWeight: '600', color: colors.text },
    mutedText: { fontSize: 12, color: colors.textMuted },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md },
    routeRow: { flexDirection: 'row', gap: spacing.md },
    routeIconContainer: { alignItems: 'center', paddingTop: 4 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted, marginBottom: 2 },
    line: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 },
    routeContent: { flex: 1 },
    routeItem: { flex: 1 },
    grid2: { flexDirection: 'row', gap: spacing.md },
    gridItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusChipText: { fontSize: 10, fontWeight: 'bold' },
    invoiceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.primary + '10', paddingVertical: 14, borderRadius: 16, marginTop: spacing.lg, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed' },
    invoiceBtnText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
    managementSection: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    manageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    manageBtnText: { color: colors.text, fontSize: 12, fontWeight: '600' },
    podVisuals: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    podImageContainer: { flex: 1 },
    tinyLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 4 },
    podPreview: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: 4
    },
    podSignature: { backgroundColor: '#F9FAFB' }, // Specific background for signature to stand out
    podPhoto: { backgroundColor: '#F3F4F6' },
    agentActions: { padding: spacing.md },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.background, padding: spacing.xl, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: spacing.xl },
    optionItem: { paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    optionText: { fontSize: 16, color: colors.text },
    photoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.md, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, marginVertical: spacing.md },
    photoButtonText: { color: colors.primary, fontWeight: '600' },
    actionIconButton: { padding: 8 },
    cancelledBanner: { backgroundColor: colors.error + '10', padding: spacing.lg, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: colors.error, marginBottom: spacing.md },
    cancelledTitle: { fontSize: 16, fontWeight: '800', color: colors.error },
    cancelledText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    bannerActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surfaceElevated, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    bannerActionText: { fontSize: 13, fontWeight: '700', color: colors.text },
    lockWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.warning + '15', padding: 8, borderRadius: 8, marginBottom: spacing.md },
    lockWarningText: { fontSize: 11, color: colors.warning, fontWeight: '600', flex: 1 },
    formSectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm, letterSpacing: 1 },
    typeSelect: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface },
    typeSelectActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
    typeSelectText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    typeSelectTextActive: { color: colors.primary, fontWeight: 'bold' },
    opsCard: {
        marginTop: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    opsIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    opsLabel: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 0.5 },
    opsValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },
    opsActionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.primary + '10' },
    opsActionText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    opsEditWeight: { marginTop: spacing.md, flexDirection: 'row', gap: 10, alignItems: 'center' },
    signaturePadWrapper: { marginVertical: spacing.md, minHeight: 350 },
});
