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
        expectedDeliveryDate: '',
        paymentMethod: 'cash' as 'cash' | 'card' | 'prepaid',
        deliveryType: 'normal' as 'normal' | 'express',
        branchId: '' as string,
    });

    // Pre-fill form from user data OR rebook params
    React.useEffect(() => {
        if (params.rebook === 'true') {
            setForm(prev => ({
                ...prev,
                senderName: (params.senderName as string) || user?.name || '',
                senderPhone: (params.senderPhone as string) || user?.phone || '',
                receiverName: (params.receiverName as string) || '',
                receiverPhone: (params.receiverPhone as string) || '',
                pickupAddress: (params.pickupAddress as string) || '',
                deliveryAddress: (params.deliveryAddress as string) || '',
                weight: isStaff ? (params.weight as string || '') : '',
                distance: isStaff ? (params.distance as string || '') : '',
            }));
        } else if (isCustomer && user) {
            setForm(prev => ({
                ...prev,
                senderName: user.name || '',
                senderPhone: user.phone || '',
            }));
        }
    }, [isCustomer, user?.name, user?.phone, params.rebook, isStaff]);

    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const calculatedPrice = (() => {
        if (!isStaff) return null; // Customers don't see/set price during booking
        const w = parseFloat(form.weight) || 0;
        const d = parseFloat(form.distance) || 0;
        if (w === 0 && d === 0) return null;
        const basePrice = w * 5 + d * 2 + 10;
        return form.deliveryType === 'express' ? basePrice * 1.5 : basePrice;
    })();

    const validate = () => {
        const newErrors: Record<string, string> = {};

        // Authentication/Identity Check
        if (!user) {
            Alert.alert('Auth Error', 'You must be logged in to book a courier.');
            return false;
        }

        if (!form.senderName.trim()) newErrors.senderName = 'Sender name is required';
        
        // Proper Phone Validation
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!form.senderPhone.trim()) {
            newErrors.senderPhone = 'Sender phone is required';
        } else if (!phoneRegex.test(form.senderPhone.replace(/\D/g, ''))) {
            newErrors.senderPhone = 'Enter a valid 10-digit phone number';
        }

        if (!form.receiverName.trim()) newErrors.receiverName = 'Receiver name is required';
        if (!form.receiverPhone.trim()) {
            newErrors.receiverPhone = 'Receiver phone is required';
        } else if (!phoneRegex.test(form.receiverPhone.replace(/\D/g, ''))) {
            newErrors.receiverPhone = 'Enter a valid 10-digit phone number';
        }

        if (!form.pickupAddress.trim()) newErrors.pickupAddress = 'Pickup address is required';
        if (!form.deliveryAddress.trim()) newErrors.deliveryAddress = 'Delivery address is required';

        // Staff-only fields validation
        if (isStaff) {
            const w = parseFloat(form.weight);
            if (isNaN(w) || w <= 0) {
                newErrors.weight = 'Valid weight required for staff booking';
            } else if (w > 500) {
                newErrors.weight = 'Weight cannot exceed 500kg';
            }

            const d = parseFloat(form.distance);
            if (isNaN(d) || d <= 0) {
                newErrors.distance = 'Valid distance required for staff booking';
            } else if (d > 2000) {
                newErrors.distance = 'Distance cannot exceed 2000km';
            }

            if (!form.branchId) {
                newErrors.branch = 'Staff must assign a branch hub';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            const w = parseFloat(form.weight) || undefined;
            const d = parseFloat(form.distance) || undefined;

            const courierId = await createCourier({
                senderName: form.senderName.trim(),
                senderPhone: form.senderPhone.trim(),
                receiverName: form.receiverName.trim(),
                receiverPhone: form.receiverPhone.trim(),
                pickupAddress: form.pickupAddress.trim(),
                deliveryAddress: form.deliveryAddress.trim(),
                notes: form.notes.trim() || undefined,
                weight: w,
                distance: d,
                price: calculatedPrice || undefined,
                paymentMethod: form.paymentMethod,
                deliveryType: form.deliveryType,
                expectedDeliveryDate: form.expectedDeliveryDate.trim() || undefined,
                branchId: form.branchId ? (form.branchId as Id<'branches'>) : undefined,
                bookedBy: user?._id as Id<'users'>,
            });

            // Mock Notification
            const { triggerMockNotification } = require('../../src/utils/notifications');
            triggerMockNotification(
                'SMS',
                form.receiverPhone,
                `Shipment Alert! A new courier with Tracking ID ${courierId} has been created. Track it in Courier Manager app.`
            );

            Alert.alert('Success', 'Courier booked successfully', [
                { text: 'OK', onPress: () => router.replace('/couriers') },
            ]);
        } catch (error: any) {
            Alert.alert('Booking Error', error.message || 'Failed to create courier.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitting) {
        return (
            <SafeAreaView style={globalStyles.safeArea}>
                <Stack.Screen options={{ title: 'Add Courier' }} />
                <LoadingState message="Processing shipment..." />
            </SafeAreaView>
        );
    }

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
                <Text style={styles.headerTitle}>New Courier</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionLabel}>Shipment Details</Text>

                    <FormInput
                        label="Sender Name"
                        value={form.senderName}
                        onChangeText={(v) => updateField('senderName', v)}
                        placeholder="Enter sender name"
                        error={errors.senderName}
                    />

                    <FormInput
                        label="Sender Phone"
                        value={form.senderPhone}
                        onChangeText={(v) => updateField('senderPhone', v.replace(/\D/g, ''))}
                        placeholder="10-digit sender phone"
                        keyboardType="phone-pad"
                        error={errors.senderPhone}
                        maxLength={10}
                    />

                    <FormInput
                        label="Receiver Name"
                        value={form.receiverName}
                        onChangeText={(v) => updateField('receiverName', v)}
                        placeholder="Enter receiver name"
                        error={errors.receiverName}
                    />

                    <FormInput
                        label="Receiver Phone"
                        value={form.receiverPhone}
                        onChangeText={(v) => updateField('receiverPhone', v.replace(/\D/g, ''))}
                        placeholder="10-digit phone number"
                        keyboardType="phone-pad"
                        error={errors.receiverPhone}
                        maxLength={10}
                    />

                    <FormInput
                        label="Pickup Address"
                        value={form.pickupAddress}
                        onChangeText={(v) => updateField('pickupAddress', v)}
                        placeholder="Street, City, Zip"
                        multiline
                        error={errors.pickupAddress}
                    />

                    <FormInput
                        label="Delivery Address"
                        value={form.deliveryAddress}
                        onChangeText={(v) => updateField('deliveryAddress', v)}
                        placeholder="Destination address"
                        multiline
                        error={errors.deliveryAddress}
                    />

                    <FormInput
                        label="Notes (Optional)"
                        value={form.notes}
                        onChangeText={(v) => updateField('notes', v)}
                        placeholder="Handle with care, etc."
                        multiline
                    />

                    {/* Restricted Fields: Only for Admins/Managers */}
                    <Text style={[styles.sectionLabel, !isStaff && { opacity: 0.5 }]}>
                        Billing & Logistics { !isStaff && '(Staff Only)'}
                    </Text>

                    <View style={[globalStyles.row, !isStaff && { opacity: 0.5 }]}>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Weight (kg)"
                                value={form.weight}
                                onChangeText={(v) => updateField('weight', v)}
                                placeholder="0.0"
                                keyboardType="numeric"
                                editable={isStaff}
                                error={errors.weight}
                            />
                        </View>
                        <View style={{ width: spacing.md }} />
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Distance (km)"
                                value={form.distance}
                                onChangeText={(v) => updateField('distance', v)}
                                placeholder="0.0"
                                keyboardType="numeric"
                                editable={isStaff}
                                error={errors.distance}
                            />
                        </View>
                    </View>

                    <Text style={[styles.fieldLabel, !isStaff && { opacity: 0.5 }]}>Payment Method</Text>
                    <View style={[styles.paymentRow, !isStaff && { opacity: 0.5 }]}>
                        {PAYMENT_METHODS.map((method) => (
                            <Pressable
                                key={method}
                                disabled={!isStaff}
                                style={[
                                    styles.paymentChip,
                                    form.paymentMethod === method && styles.paymentChipActive
                                ]}
                                onPress={() => setForm(prev => ({ ...prev, paymentMethod: method }))}
                            >
                                <Ionicons
                                    name={method === 'cash' ? 'cash-outline' : method === 'card' ? 'card-outline' : 'wallet-outline'}
                                    size={16}
                                    color={form.paymentMethod === method ? '#fff' : colors.textSecondary}
                                />
                                <Text style={[styles.paymentChipText, form.paymentMethod === method && styles.paymentChipTextActive]}>
                                    {method.toUpperCase()}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {isStaff && (
                        <>
                            <Text style={styles.sectionLabel}>Branch Assignment</Text>
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
                            {errors.branch && <Text style={styles.errorText}>{errors.branch}</Text>}
                        </>
                    )}

                    {calculatedPrice !== null && isStaff && (
                        <View style={styles.pricePreview}>
                            <Text style={styles.priceLabel}>Estimated Price</Text>
                            <Text style={styles.priceValue}>₹{calculatedPrice.toFixed(2)}</Text>
                        </View>
                    )}

                    <Pressable
                        style={({ pressed }) => [styles.submitButton, pressed && styles.buttonPressed]}
                        onPress={handleSubmit}
                    >
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={globalStyles.buttonText}>{isStaff ? 'Register Courier' : 'Request Booking'}</Text>
                    </Pressable>

                    <View style={{ height: spacing.xxl }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    sectionLabel: {
        fontSize: fontSize.xs,
        fontWeight: 'bold',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: spacing.md,
        marginTop: spacing.md,
    },
    fieldLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 8,
        fontWeight: '600',
    },
    paymentRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    paymentChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    paymentChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    paymentChipText: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: 'bold',
    },
    paymentChipTextActive: {
        color: '#fff',
    },
    pricePreview: {
        backgroundColor: colors.success + '15',
        borderWidth: 1,
        borderColor: colors.success + '30',
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 10,
        color: colors.success,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    priceValue: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.success,
        marginTop: 4,
    },
    branchGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    branchChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    branchChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    branchChipText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginTop: spacing.md,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
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
    headerTitle: {
        fontSize: fontSize.md,
        fontWeight: 'bold',
        color: colors.text,
    },
    errorText: {
        fontSize: 10,
        color: colors.error,
        marginTop: -spacing.sm,
        marginBottom: spacing.md,
        fontWeight: 'bold',
    },
});
