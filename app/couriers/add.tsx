import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { FormInput, LoadingState } from '../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { Id } from '../../convex/_generated/dataModel';
import { validateName, validatePhone, showAlert } from '../../src/utils/validation';
import { useAuth } from '../../src/components/auth-context';

const PAYMENT_METHODS = ['cash', 'card', 'prepaid'] as const;

export default function AddCourierScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuth();
    
    const isCustomer = user?.role === 'customer';
    const isAdmin = user?.role === 'admin';
    const isBranchManager = user?.role === 'branch_manager';
    const isStaff = isAdmin || isBranchManager;

    const createCourier = useMutation(api.couriers.create);
    const branches = useQuery(api.branches.list);

    const [isSubmitting, setIsSubmitting] = useState(false);
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
        branchId: '' as string,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const calculatedPrice = (() => {
        // Pricing Engine Sync: Base 50 + Weight*10 + Distance*5
        const w = parseFloat(form.weight) || 0;
        const d = parseFloat(form.distance) || 0;
        let price = 50; // Base rate
        if (w > 0) price += w * 10;
        if (d > 0) price += d * 5;
        return form.deliveryType === 'express' ? Math.round(price * 1.5) : Math.round(price);
    })();

    const validate = () => {
        if (!user) {
            showAlert('Auth Error', 'You must be logged in to book.');
            return false;
        }

        if (!form.receiverName.trim() || !form.receiverPhone.trim()) {
            showAlert('Validation Error', 'Receiver details are mandatory.');
            return false;
        }

        if (!form.pickupAddress.trim() || !form.deliveryAddress.trim()) {
            showAlert('Validation Error', 'Addresses are mandatory.');
            return false;
        }

        if (!form.branchId) {
            showAlert('Hub Required', 'Please select your nearest branch hub for drop-off/pickup.');
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        try {
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
                paymentMethod: form.paymentMethod,
                bookedBy: user?._id as Id<'users'>,
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

    if (isSubmitting) return <LoadingState message="Processing booking..." />;

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
                    
                    <Text style={styles.sectionTitle}>Sender & Receiver</Text>
                    <FormInput
                        label="Receiver Name"
                        value={form.receiverName}
                        onChangeText={(v) => updateField('receiverName', v)}
                        placeholder="Full name of recipient"
                    />
                    <FormInput
                        label="Receiver Phone"
                        value={form.receiverPhone}
                        onChangeText={(v) => updateField('receiverPhone', v.replace(/[^0-9]/g, ''))}
                        placeholder="10-digit mobile number"
                        keyboardType="phone-pad"
                        maxLength={10}
                    />

                    <Text style={styles.sectionTitle}>Logistics Hub</Text>
                    <Text style={styles.helperText}>Select the nearest branch for this shipment:</Text>
                    <View style={styles.branchGrid}>
                        {branches?.map((branch) => (
                            <Pressable
                                key={branch._id}
                                style={[styles.branchChip, form.branchId === branch._id && styles.branchChipActive]}
                                onPress={() => updateField('branchId', branch._id)}
                            >
                                <Ionicons 
                                    name="business-outline" 
                                    size={14} 
                                    color={form.branchId === branch._id ? '#fff' : colors.textSecondary} 
                                />
                                <Text style={[styles.branchChipText, form.branchId === branch._id && { color: '#fff' }]}>
                                    {branch.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Addresses</Text>
                    <FormInput
                        label="Pickup Address"
                        value={form.pickupAddress}
                        onChangeText={(v) => updateField('pickupAddress', v)}
                        placeholder="Where should we pick up?"
                        multiline
                    />
                    <FormInput
                        label="Delivery Address"
                        value={form.deliveryAddress}
                        onChangeText={(v) => updateField('deliveryAddress', v)}
                        placeholder="Final destination"
                        multiline
                    />

                    <Text style={styles.sectionTitle}>Service Level</Text>
                    <View style={styles.deliveryTypeRow}>
                        <Pressable 
                            style={[styles.typeCard, form.deliveryType === 'normal' && styles.typeCardActive]}
                            onPress={() => updateField('deliveryType', 'normal')}
                        >
                            <Ionicons name="bicycle-outline" size={24} color={form.deliveryType === 'normal' ? colors.primary : colors.textMuted} />
                            <Text style={[styles.typeText, form.deliveryType === 'normal' && styles.typeTextActive]}>Normal</Text>
                            <Text style={styles.typeDesc}>3-5 Days</Text>
                        </Pressable>
                        <Pressable 
                            style={[styles.typeCard, form.deliveryType === 'express' && styles.typeCardExpress]}
                            onPress={() => updateField('deliveryType', 'express')}
                        >
                            <Ionicons name="flash-outline" size={24} color={form.deliveryType === 'express' ? '#fff' : colors.textMuted} />
                            <Text style={[styles.typeText, form.deliveryType === 'express' && { color: '#fff' }]}>Express</Text>
                            <Text style={[styles.typeDesc, form.deliveryType === 'express' && { color: 'rgba(255,255,255,0.8)' }]}>1-2 Days</Text>
                        </Pressable>
                    </View>

                    {isStaff && (
                        <View style={styles.staffSection}>
                            <Text style={styles.staffTitle}>Staff Verification Only</Text>
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
                                        label="Distance (km)"
                                        value={form.distance}
                                        onChangeText={(v) => updateField('distance', v)}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    <View style={styles.priceContainer}>
                        <View>
                            <Text style={styles.priceLabel}>Estimated Total</Text>
                            <Text style={styles.priceValue}>₹{calculatedPrice.toFixed(2)}</Text>
                        </View>
                        <Pressable style={styles.submitButton} onPress={handleSubmit}>
                            <Text style={styles.submitButtonText}>{isCustomer ? 'Book Now' : 'Create'}</Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </Pressable>
                    </View>

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
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', marginTop: spacing.xl, marginBottom: spacing.md, letterSpacing: 1 },
    helperText: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm },
    branchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
    branchChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    branchChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    branchChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    deliveryTypeRow: { flexDirection: 'row', gap: spacing.md },
    typeCard: { flex: 1, padding: spacing.md, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
    typeCardExpress: { backgroundColor: colors.warning, borderColor: colors.warning },
    typeText: { fontSize: 14, fontWeight: 'bold', marginTop: 4, color: colors.text },
    typeDesc: { fontSize: 10, color: colors.textMuted },
    staffSection: { marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.surfaceElevated, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border },
    staffTitle: { fontSize: 10, fontWeight: 'bold', color: colors.error, marginBottom: spacing.sm, textTransform: 'uppercase' },
    priceContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xxl, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    priceLabel: { fontSize: 12, color: colors.textSecondary },
    priceValue: { fontSize: 24, fontWeight: '900', color: colors.text },
    submitButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
    submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
