import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { FormInput, LoadingState } from '../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '../../src/components/auth-context';
import { useSafeNavigation } from '../../src/utils/navigation';
import * as Location from 'expo-location';

export default function AddCourierScreen() {
    const router = useSafeNavigation();
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
        distance: '',
        paymentMethod: 'cash' as 'cash' | 'card' | 'prepaid',
        deliveryType: 'normal' as 'normal' | 'express',
        originBranch: '' as string,
        destinationBranch: '' as string,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const [coords, setCoords] = useState({
        pickupLat: undefined as number | undefined,
        pickupLng: undefined as number | undefined,
        deliveryLat: undefined as number | undefined,
        deliveryLng: undefined as number | undefined,
    });

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        
        if (errors[field]) {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[field];
                return newErrs;
            });
        }

        if (field === 'pickupAddress') {
            setCoords(p => ({ ...p, pickupLat: undefined, pickupLng: undefined }));
        } else if (field === 'deliveryAddress') {
            setCoords(p => ({ ...p, deliveryLat: undefined, deliveryLng: undefined }));
        }
    };

    const geocodeWeb = async (address: string) => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
            const res = await fetch(url, { headers: { 'User-Agent': 'CourierManagerApp' } });
            const data = await res.json();
            if (data && data[0]) {
                return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
            }
        } catch (e) {
            console.warn('Web Geocoding failed');
        }
        return null;
    };

    const reverseGeocodeWeb = async (lat: number, lon: number) => {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
            const res = await fetch(url, { headers: { 'User-Agent': 'CourierManagerApp' } });
            const data = await res.json();
            if (data && data.display_name) return data.display_name;
        } catch (e) {
            console.warn('Web Reverse Geocoding failed');
        }
        return null;
    };

    const handleUseCurrentLocation = async () => {
        setIsLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (Platform.OS === 'web') window.alert('Location permission denied.');
                else Alert.alert('Permission Denied', 'Location access is needed.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = location.coords;

            let addressStr = '';
            if (Platform.OS === 'web') {
                const res = await reverseGeocodeWeb(latitude, longitude);
                if (res) addressStr = res;
            } else {
                const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (address) {
                    addressStr = `${address.name || ''} ${address.street || ''}, ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim();
                }
            }

            if (addressStr) {
                setForm(p => ({ ...p, pickupAddress: addressStr }));
                setCoords(p => ({ ...p, pickupLat: latitude, pickupLng: longitude }));
                if (errors.pickupAddress) setErrors(prev => ({ ...prev, pickupAddress: '' }));
            }
        } catch (error) {
            console.warn('Location detection failed');
        } finally {
            setIsLocating(false);
        }
    };

    const geocodeAddresses = async () => {
        let pickup = { lat: coords.pickupLat, lng: coords.pickupLng };
        let delivery = { lat: coords.deliveryLat, lng: coords.deliveryLng };

        const runGeocode = async (address: string) => {
            if (Platform.OS === 'web') return await geocodeWeb(address);
            try {
                const res = await Location.geocodeAsync(address);
                return res[0] ? { latitude: res[0].latitude, longitude: res[0].longitude } : null;
            } catch (e) { return null; }
        };

        try {
            if (!pickup.lat && form.pickupAddress) {
                const res = await runGeocode(form.pickupAddress);
                if (res) pickup = { lat: res.latitude, lng: res.longitude };
            }
            if (!delivery.lat && form.deliveryAddress) {
                const resDel = await runGeocode(form.deliveryAddress);
                if (resDel) delivery = { lat: resDel.latitude, lng: resDel.longitude };
            }
        } catch (e) {
            console.error('Geocoding logic error');
        }
        return { pickup, delivery };
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.receiverName.trim()) newErrors.receiverName = 'Recipient name is required';
        if (!form.receiverPhone.trim() || form.receiverPhone.length < 10) newErrors.receiverPhone = 'Valid 10-digit phone is required';
        if (!form.pickupAddress.trim()) newErrors.pickupAddress = 'Pickup point is required';
        if (!form.deliveryAddress.trim()) newErrors.deliveryAddress = 'Delivery destination is required';
        if (!form.destinationBranch) newErrors.destinationBranch = 'Please select a destination hub';
        
        // Custom validations
        if (form.senderPhone && form.receiverPhone && form.senderPhone.replace(/\D/g, '') === form.receiverPhone.replace(/\D/g, '')) {
            newErrors.receiverPhone = 'Sender and Receiver phone numbers cannot be the same';
        }
        if (form.pickupAddress && form.deliveryAddress && form.pickupAddress.trim().toLowerCase() === form.deliveryAddress.trim().toLowerCase()) {
            newErrors.deliveryAddress = 'Pickup and Delivery addresses cannot be the same';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const geocodeTask = geocodeAddresses();
            const timeoutTask = new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000));
            
            let resolvedCoords = { pickup: { lat: undefined, lng: undefined }, delivery: { lat: undefined, lng: undefined } };
            
            try {
                resolvedCoords = await Promise.race([geocodeTask, timeoutTask]) as any;
            } catch (e) {
                console.warn('Geocoding timeout');
            }

            const cleanNum = (val: string) => {
                const n = parseFloat(val);
                return isNaN(n) ? undefined : n;
            };

            await createCourier({
                senderName: form.senderName.trim(),
                senderPhone: form.senderPhone.trim(),
                receiverName: form.receiverName.trim(),
                receiverPhone: form.receiverPhone.trim(),
                pickupAddress: form.pickupAddress.trim(),
                deliveryAddress: form.deliveryAddress.trim(),
                notes: form.notes.trim() || undefined,
                weight: cleanNum(form.weight),
                distance: cleanNum(form.distance),
                originBranch: form.originBranch as Id<'branches'>,
                destinationBranch: form.destinationBranch as Id<'branches'>,
                deliveryType: form.deliveryType,
                paymentMethod: form.paymentMethod as 'cash' | 'card' | 'prepaid',
                bookedBy: user?._id as Id<'users'>,
                pickupLat: resolvedCoords.pickup?.lat,
                pickupLng: resolvedCoords.pickup?.lng,
                deliveryLat: resolvedCoords.delivery?.lat,
                deliveryLng: resolvedCoords.delivery?.lng,
            });

            if (Platform.OS === 'web') {
                window.alert('Success! Courier booked successfully.');
                router.replace('/couriers');
            } else {
                Alert.alert('Success', 'Courier booked successfully!', [
                    { text: 'OK', onPress: () => router.replace('/couriers') }
                ]);
            }
        } catch (error: any) {
            const msg = error.message || 'Failed to create booking.';
            if (Platform.OS === 'web') window.alert('Error: ' + msg);
            else Alert.alert('Error', msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!branches) return <LoadingState message="Loading service hubs..." />;

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={styles.header}>
                <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButtonContainer}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>New Shipment</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView 
                    style={styles.container} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    
                    <Text style={styles.sectionTitle}>Recipient Details</Text>
                    <FormInput
                        label="Receiver Name"
                        value={form.receiverName}
                        onChangeText={(v) => updateField('receiverName', v)}
                        placeholder="Full name"
                        error={errors.receiverName}
                    />
                    <FormInput
                        label="Receiver Phone"
                        value={form.receiverPhone}
                        onChangeText={(v) => updateField('receiverPhone', v.replace(/[^0-9]/g, ''))}
                        placeholder="10-digit number"
                        keyboardType="phone-pad"
                        maxLength={10}
                        error={errors.receiverPhone}
                    />

                    <Text style={styles.sectionTitle}>Pickup Address</Text>
                    <View style={styles.addressWrapper}>
                        <FormInput
                            label="Current Location or Street Address"
                            value={form.pickupAddress}
                            onChangeText={(v) => updateField('pickupAddress', v)}
                            placeholder="Where should we pick up?"
                            multiline
                            error={errors.pickupAddress}
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
                        error={errors.deliveryAddress}
                    />

                    <Text style={styles.sectionTitle}>Origin Hub (Nearest to pickup)</Text>
                    <View style={styles.branchGrid}>
                        {branches?.map((branch) => (
                            <Pressable
                                key={branch._id}
                                style={[styles.branchChip, form.originBranch === branch._id && styles.branchChipActive, errors.originBranch && { borderColor: colors.error }]}
                                onPress={() => updateField('originBranch', branch._id)}
                            >
                                <Text style={[styles.branchChipText, form.originBranch === branch._id && { color: '#fff' }]}>
                                    {branch.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    {errors.originBranch && <Text style={styles.errorText}>{errors.originBranch}</Text>}

                    <Text style={styles.sectionTitle}>Destination Hub (Nearest to delivery)</Text>
                    <View style={styles.branchGrid}>
                        {branches?.map((branch) => (
                            <Pressable
                                key={`dest-${branch._id}`}
                                style={[styles.branchChip, form.destinationBranch === branch._id && styles.branchChipActive, errors.destinationBranch && { borderColor: colors.error }]}
                                onPress={() => updateField('destinationBranch', branch._id)}
                            >
                                <Text style={[styles.branchChipText, form.destinationBranch === branch._id && { color: '#fff' }]}>
                                    {branch.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    {errors.destinationBranch && <Text style={styles.errorText}>{errors.destinationBranch}</Text>}

                    <Text style={styles.sectionTitle}>Delivery Speed</Text>
                    <View style={styles.deliveryTypeRow}>
                        <Pressable 
                            style={[styles.typeCard, form.deliveryType === 'normal' && styles.typeCardActive]}
                            onPress={() => updateField('deliveryType', 'normal')}
                        >
                            <Text style={[styles.typeText, form.deliveryType === 'normal' && { color: colors.primary }]}>Normal</Text>
                            <Text style={styles.typeDesc}>Standard Rates</Text>
                        </Pressable>
                        <Pressable 
                            style={[styles.typeCard, form.deliveryType === 'express' && styles.typeCardExpress]}
                            onPress={() => updateField('deliveryType', 'express')}
                        >
                            <Text style={[styles.typeText, form.deliveryType === 'express' && { color: '#fff' }]}>Express (+50%)</Text>
                            <Text style={[styles.typeDesc, form.deliveryType === 'express' && { color: 'rgba(255,255,255,0.8)' }]}>Priority</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    <View style={styles.deliveryTypeRow}>
                        {['cash', 'card', 'prepaid'].map((method) => (
                            <Pressable 
                                key={method}
                                style={[styles.typeCard, form.paymentMethod === method && styles.typeCardActive]}
                                onPress={() => updateField('paymentMethod', method)}
                            >
                                <Text style={[styles.typeText, form.paymentMethod === method && { color: colors.primary }, { textTransform: 'capitalize' }]}>{method}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {isStaff && (
                        <View style={styles.staffSection}>
                            <Text style={styles.staffTitle}>Logistics Override (Staff Only)</Text>
                            <View style={globalStyles.row}>
                                <View style={{ flex: 1 }}>
                                    <FormInput label="Weight (kg)" value={form.weight} onChangeText={(v) => updateField('weight', v)} keyboardType="numeric" />
                                </View>
                                <View style={{ width: spacing.md }} />
                                <View style={{ flex: 1 }}>
                                    <FormInput label="Dist Override (km)" value={form.distance} onChangeText={(v) => updateField('distance', v)} keyboardType="numeric" />
                                </View>
                            </View>
                        </View>
                    )}

                    <Pressable 
                        style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]} 
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitButtonText}>Confirm Booking</Text>
                                <Ionicons name="chevron-forward" size={20} color="#fff" />
                            </>
                        )}
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
    backButtonContainer: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.xl, marginBottom: spacing.sm, letterSpacing: 1 },
    addressWrapper: { position: 'relative' },
    locationButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-end', marginTop: -spacing.xs, marginBottom: spacing.md },
    locationButtonText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
    branchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    branchChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    branchChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    branchChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    errorText: { color: colors.error, fontSize: 10, marginLeft: 4, marginTop: 4 },
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
