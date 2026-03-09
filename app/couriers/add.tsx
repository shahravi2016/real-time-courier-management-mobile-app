import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { FormInput, LoadingState } from '../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { Id } from '../../convex/_generated/dataModel';
import { showAlert } from '../../src/utils/validation';
import { useAuth } from '../../src/components/auth-context';
import * as Location from 'expo-location';

export default function AddCourierScreen() {
    const router = useRouter();
    const { user } = useAuth();
    
    const isAdmin = user?.role === 'admin';
    const isBranchManager = user?.role === 'branch_manager';
    const isStaff = isAdmin || isBranchManager;

    const createCourier = useMutation(api.couriers.create);
    const branches = useQuery(api.branches.list);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    
    const [form, setForm] = useState({
        senderName: user?.name || '',
        senderPhone: user?.phone || '',
        receiverName: '',
        receiverPhone: '',
        pickupAddress: '',
        deliveryAddress: '',
        notes: '',
        weight: '',
        distance: '', // Still used for manual staff overrides
        paymentMethod: 'cash' as 'cash' | 'card' | 'prepaid',
        deliveryType: 'normal' as 'normal' | 'express',
        branchId: '' as string,
    });

    const [coords, setCoords] = useState({
        pickupLat: undefined as number | undefined,
        pickupLng: undefined as number | undefined,
        deliveryLat: undefined as number | undefined,
        deliveryLng: undefined as number | undefined,
    });

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        
        // Logic refinement: If user types manually, clear the hidden GPS cache 
        // to force a fresh geocode on submission.
        if (field === 'pickupAddress') {
            setCoords(p => ({ ...p, pickupLat: undefined, pickupLng: undefined }));
        } else if (field === 'deliveryAddress') {
            setCoords(p => ({ ...p, deliveryLat: undefined, deliveryLng: undefined }));
        }
    };

    const handleUseCurrentLocation = async () => {
        setIsLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access is needed to detect your address.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = location.coords;

            // Reverse Geocode to get address string
            const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (address) {
                const addressStr = `${address.name || ''} ${address.street || ''}, ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim();
                setForm(p => ({ ...p, pickupAddress: addressStr }));
                setCoords(p => ({ ...p, pickupLat: latitude, pickupLng: longitude }));
            }
        } catch (error) {
            Alert.alert('Location Error', 'Could not detect your current location.');
        } finally {
            setIsLocating(false);
        }
    };

    const geocodeAddresses = async () => {
        let pickup = { lat: coords.pickupLat, lng: coords.pickupLng };
        let delivery = { lat: coords.deliveryLat, lng: coords.deliveryLng };

        try {
            // Geocode Pickup if not already detected via GPS
            if (!pickup.lat) {
                const res = await Location.geocodeAsync(form.pickupAddress);
                if (res[0]) {
                    pickup = { lat: res[0].latitude, lng: res[0].longitude };
                }
            }

            // Geocode Delivery
            const resDel = await Location.geocodeAsync(form.deliveryAddress);
            if (resDel[0]) {
                delivery = { lat: resDel[0].latitude, lng: resDel[0].longitude };
            }
        } catch (e) {
            console.warn('Geocoding failed, falling back to manual/default distance.');
        }

        return { pickup, delivery };
    };

    const validate = () => {
        if (!form.receiverName.trim() || !form.receiverPhone.trim()) {
            showAlert('Validation Error', 'Receiver details are mandatory.');
            return false;
        }
        if (!form.pickupAddress.trim() || !form.deliveryAddress.trim()) {
            showAlert('Validation Error', 'Addresses are mandatory.');
            return false;
        }
        if (!form.branchId) {
            showAlert('Hub Required', 'Please select a branch hub.');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            // 1. Resolve Coordinates in background
            const resolvedCoords = await geocodeAddresses();

            // 2. Submit to backend
            await createCourier({
                senderName: form.senderName.trim(),
                senderPhone: form.senderPhone.trim(),
                receiverName: form.receiverName.trim(),
                receiverPhone: form.receiverPhone.trim(),
                pickupAddress: form.pickupAddress.trim(),
                deliveryAddress: form.deliveryAddress.trim(),
                notes: form.notes.trim() || undefined,
                weight: parseFloat(form.weight) || undefined,
                distance: parseFloat(form.distance) || undefined,
                branchId: form.branchId as Id<'branches'>,
                deliveryType: form.deliveryType,
                bookedBy: user?._id as Id<'users'>,
                // Pass coordinates for backend Haversine calculation
                pickupLat: resolvedCoords.pickup.lat,
                pickupLng: resolvedCoords.pickup.lng,
                deliveryLat: resolvedCoords.delivery.lat,
                deliveryLng: resolvedCoords.delivery.lng,
            });

            Alert.alert('Success', 'Courier booked successfully!', [
                { text: 'View My Parcels', onPress: () => router.replace('/couriers') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create booking.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitting) return <LoadingState message="Calculating route & pricing..." />;

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>New Shipment</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                    
                    <Text style={styles.sectionTitle}>Recipient Details</Text>
                    <FormInput
                        label="Receiver Name"
                        value={form.receiverName}
                        onChangeText={(v) => updateField('receiverName', v)}
                        placeholder="Full name"
                    />
                    <FormInput
                        label="Receiver Phone"
                        value={form.receiverPhone}
                        onChangeText={(v) => updateField('receiverPhone', v.replace(/[^0-9]/g, ''))}
                        placeholder="10-digit number"
                        keyboardType="phone-pad"
                        maxLength={10}
                    />

                    <Text style={styles.sectionTitle}>Pickup Address</Text>
                    <View style={styles.addressWrapper}>
                        <FormInput
                            label="Current Location or Street Address"
                            value={form.pickupAddress}
                            onChangeText={(v) => updateField('pickupAddress', v)}
                            placeholder="Where should we pick up?"
                            multiline
                        />
                        <Pressable 
                            style={[styles.locationButton, isLocating && { opacity: 0.7 }]} 
                            onPress={handleUseCurrentLocation}
                            disabled={isLocating}
                        >
                            {isLocating ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="location" size={16} color={colors.primary} />
                            )}
                            <Text style={styles.locationButtonText}>
                                {isLocating ? "Locating..." : "Use Current Location"}
                            </Text>
                        </Pressable>
                    </View>

                    <Text style={styles.sectionTitle}>Delivery Address</Text>
                    <FormInput
                        label="Destination"
                        value={form.deliveryAddress}
                        onChangeText={(v) => updateField('deliveryAddress', v)}
                        placeholder="Final delivery point"
                        multiline
                    />

                    <Text style={styles.sectionTitle}>Nearest Branch Hub</Text>
                    <View style={styles.branchGrid}>
                        {branches?.map((branch) => (
                            <Pressable
                                key={branch._id}
                                style={[styles.branchChip, form.branchId === branch._id && styles.branchChipActive]}
                                onPress={() => updateField('branchId', branch._id)}
                            >
                                <Text style={[styles.branchChipText, form.branchId === branch._id && { color: '#fff' }]}>
                                    {branch.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Delivery Speed</Text>
                    <View style={styles.deliveryTypeRow}>
                        <Pressable 
                            style={[styles.typeCard, form.deliveryType === 'normal' && styles.typeCardActive]}
                            onPress={() => updateField('deliveryType', 'normal')}
                        >
                            <Text style={[styles.typeText, form.deliveryType === 'normal' && styles.typeTextActive]}>Normal</Text>
                            <Text style={styles.typeDesc}>Standard Rates</Text>
                        </Pressable>
                        <Pressable 
                            style={[styles.typeCard, form.deliveryType === 'express' && styles.typeCardExpress]}
                            onPress={() => updateField('deliveryType', 'express')}
                        >
                            <Text style={[styles.typeText, form.deliveryType === 'express' && { color: '#fff' }]}>Express</Text>
                            <Text style={[styles.typeDesc, form.deliveryType === 'express' && { color: 'rgba(255,255,255,0.8)' }]}>Priority</Text>
                        </Pressable>
                    </View>

                    {isStaff && (
                        <View style={styles.staffSection}>
                            <Text style={styles.staffTitle}>Logistics Override (Staff Only)</Text>
                            <View style={globalStyles.row}>
                                <View style={{ flex: 1 }}>
                                    <FormInput
                                        label="Weight (kg)"
                                        value={form.weight}
                                        onChangeText={(v) => updateField('weight', v)}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ width: spacing.md }} />
                                <View style={{ flex: 1 }}>
                                    <FormInput
                                        label="Dist Override (km)"
                                        value={form.distance}
                                        onChangeText={(v) => updateField('distance', v)}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    <Pressable style={styles.submitButton} onPress={handleSubmit}>
                        <Text style={styles.submitButtonText}>Confirm Booking</Text>
                        <Ionicons name="chevron-forward" size={20} color="#fff" />
                    </Pressable>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    backButton: { padding: spacing.sm },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.xl, marginBottom: spacing.sm, letterSpacing: 1 },
    addressWrapper: { position: 'relative' },
    locationButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-end', marginTop: -spacing.xs, marginBottom: spacing.md },
    locationButtonText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
    branchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
    branchChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    branchChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    branchChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    deliveryTypeRow: { flexDirection: 'row', gap: spacing.md },
    typeCard: { flex: 1, padding: spacing.md, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
    typeCardExpress: { backgroundColor: colors.warning, borderColor: colors.warning },
    typeText: { fontSize: 14, fontWeight: 'bold', color: colors.text },
    typeDesc: { fontSize: 10, color: colors.textMuted },
    staffSection: { marginTop: spacing.xl, padding: spacing.md, backgroundColor: '#FFF9C4', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#FBC02D' },
    staffTitle: { fontSize: 10, fontWeight: 'bold', color: '#F57F17', marginBottom: spacing.sm, textTransform: 'uppercase' },
    submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, marginTop: spacing.xxl },
    submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
