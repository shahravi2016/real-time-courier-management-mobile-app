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
                weight: (params.weight as string) || '',
                distance: (params.distance as string) || '',
            }));
        } else if (isCustomer && user) {
            setForm(prev => ({
                ...prev,
                senderName: user.name || '',
                senderPhone: user.phone || '',
            }));
        }
    }, [isCustomer, user, params]);

    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const calculatedPrice = (() => {
        const w = parseFloat(form.weight) || 0;
        const d = parseFloat(form.distance) || 0;
        if (w === 0 && d === 0) return null;
        const basePrice = w * 5 + d * 2 + 10;
        return form.deliveryType === 'express' ? basePrice * 1.5 : basePrice;
    })();

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!form.senderName.trim()) newErrors.senderName = 'Sender name is required';
        if (!form.senderPhone.trim()) {
            newErrors.senderPhone = 'Sender phone is required';
        } else if (form.senderPhone.replace(/\D/g, '').length !== 10) {
            newErrors.senderPhone = 'Sender phone must be 10 digits';
        }

        if (!form.receiverName.trim()) newErrors.receiverName = 'Receiver name is required';
        if (!form.receiverPhone.trim()) {
            newErrors.receiverPhone = 'Phone number is required';
        } else {
            const digits = form.receiverPhone.replace(/\D/g, '');
            if (digits.length !== 10) {
                newErrors.receiverPhone = 'Phone number must be exactly 10 digits';
            }
        }
        // ... (remaining validation)
        if (!form.pickupAddress.trim()) newErrors.pickupAddress = 'Pickup address is required';
        if (!form.deliveryAddress.trim()) newErrors.deliveryAddress = 'Delivery address is required';

        // Robust numeric validation
        const w = parseFloat(form.weight);
        if (isNaN(w) || w <= 0) {
            newErrors.weight = 'Valid weight is required';
        } else if (w > 500) {
            newErrors.weight = 'Weight cannot exceed 500kg';
        }

        const d = parseFloat(form.distance);
        if (isNaN(d) || d <= 0) {
            newErrors.distance = 'Valid distance is required';
        } else if (d > 2000) {
            newErrors.distance = 'Distance cannot exceed 2000km';
        }

        // Branch validation
        if (branches && branches.length > 0 && !form.branchId) {
            newErrors.branch = 'Please select a branch hub';
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
                bookedBy: user?._id as any,
            });
            // ... (previous code)

            // Mock Notification for new order
            const { triggerMockNotification } = require('../../src/utils/notifications');
            triggerMockNotification(
                'SMS',
                form.receiverPhone,
                `Shipment Alert! A new courier with ID ${courierId} has been created for you. Track it in our app.`
            );

            Alert.alert('Success', 'Courier created successfully', [
                { text: 'OK', onPress: () => router.replace('/couriers') },
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to create courier. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitting) {
        return (
            <SafeAreaView style={globalStyles.safeArea}>
                <Stack.Screen options={{ title: 'Add Courier' }} />
                <LoadingState message="Creating courier..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />

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
                <Text style={styles.headerTitle}>New Courier</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                    {/* Shipment Details */}
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
                        onChangeText={(v) => {
                            const numeric = v.replace(/[^0-9]/g, '');
                            if (numeric.length <= 10) {
                                updateField('senderPhone', numeric);
                            }
                        }}
                        placeholder="Enter 10-digit sender phone"
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
                        onChangeText={(v) => {
                            const numeric = v.replace(/[^0-9]/g, '');
                            if (numeric.length <= 10) {
                                updateField('receiverPhone', numeric);
                            }
                        }}
                        placeholder="Enter 10-digit phone number"
                        keyboardType="phone-pad"
                        error={errors.receiverPhone}
                        maxLength={10}
                    />

                    <FormInput
                        label="Pickup Address"
                        value={form.pickupAddress}
                        onChangeText={(v) => updateField('pickupAddress', v)}
                        placeholder="Enter pickup address"
                        multiline
                        error={errors.pickupAddress}
                    />

                    <FormInput
                        label="Delivery Address"
                        value={form.deliveryAddress}
                        onChangeText={(v) => updateField('deliveryAddress', v)}
                        placeholder="Enter delivery address"
                        multiline
                        error={errors.deliveryAddress}
                    />

                    <FormInput
                        label="Expected Delivery Date (Optional)"
                        value={form.expectedDeliveryDate}
                        onChangeText={(v) => updateField('expectedDeliveryDate', v)}
                        placeholder="e.g. 2026-02-25"
                    />

                    <FormInput
                        label="Notes (Optional)"
                        value={form.notes}
                        onChangeText={(v) => updateField('notes', v)}
                        placeholder="Any additional notes"
                        multiline
                    />

                    {/* Billing Details */}
                    <Text style={styles.sectionLabel}>Billing Details</Text>

                    <View style={globalStyles.row}>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Weight (kg)"
                                value={form.weight}
                                onChangeText={(v) => updateField('weight', v)}
                                placeholder="0.0"
                                keyboardType="numeric"
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
                                error={errors.distance}
                            />
                        </View>
                    </View>

                    <Text style={styles.fieldLabel}>Payment Method</Text>
                    <View style={styles.paymentRow}>
                        {PAYMENT_METHODS.map((method) => (
                            <Pressable
                                key={method}
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
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[
                                    styles.paymentChipText,
                                    form.paymentMethod === method && styles.paymentChipTextActive,
                                ]}>
                                    {method.charAt(0).toUpperCase() + method.slice(1)}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Delivery Type Selector */}
                    <Text style={styles.fieldLabel}>Delivery Type</Text>
                    <View style={styles.paymentRow}>
                        {(['normal', 'express'] as const).map((type) => (
                            <Pressable
                                key={type}
                                style={[
                                    styles.paymentChip,
                                    form.deliveryType === type && styles.paymentChipActive,
                                    type === 'express' && form.deliveryType === 'express' && { backgroundColor: colors.warning, borderColor: colors.warning }
                                ]}
                                onPress={() => setForm(prev => ({ ...prev, deliveryType: type }))}
                            >
                                <Ionicons
                                    name={type === 'normal' ? 'bicycle-outline' : 'flash-outline'}
                                    size={16}
                                    color={form.deliveryType === type ? '#fff' : colors.textSecondary}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[
                                    styles.paymentChipText,
                                    form.deliveryType === type && styles.paymentChipTextActive,
                                ]}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)} {type === 'express' ? '(+50%)' : ''}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Branch Selection */}
                    <Text style={styles.sectionLabel}>Branch Assignment</Text>
                    <View style={styles.branchContainer}>
                        {branches && branches.length > 0 ? (
                            <View style={styles.branchGrid}>
                                {branches.map((branch) => (
                                    <Pressable
                                        key={branch._id}
                                        style={[
                                            styles.branchChip,
                                            form.branchId === branch._id && styles.branchChipActive,
                                            errors.branch && { borderColor: colors.error }
                                        ]}
                                        onPress={() => updateField('branchId', branch._id)}
                                    >
                                        <Ionicons
                                            name="business-outline"
                                            size={16}
                                            color={form.branchId === branch._id ? '#fff' : colors.textSecondary}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={[
                                            styles.branchChipText,
                                            form.branchId === branch._id && styles.branchChipTextActive
                                        ]}>
                                            {branch.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.emptyBranch}>
                                <Ionicons name="alert-circle-outline" size={20} color={colors.textMuted} />
                                <Text style={styles.emptyBranchText}>No branches available. Add a branch in dashboard first.</Text>
                            </View>
                        )}
                        {errors.branch && <Text style={styles.errorText}>{errors.branch}</Text>}
                    </View>

                    {/* Price Preview */}
                    {calculatedPrice !== null && (
                        <View style={styles.pricePreview}>
                            <Text style={styles.priceLabel}>Estimated Price</Text>
                            <Text style={styles.priceValue}>${calculatedPrice.toFixed(2)}</Text>
                            <Text style={styles.priceBreakdown}>
                                Base: $10 + Weight: ${((parseFloat(form.weight) || 0) * 5).toFixed(2)} + Distance: ${((parseFloat(form.distance) || 0) * 2).toFixed(2)}
                            </Text>
                        </View>
                    )}

                    <Pressable
                        style={({ pressed }) => [
                            styles.submitButton,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={handleSubmit}
                    >
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={globalStyles.buttonText}>Create Courier</Text>
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
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
        marginTop: spacing.md,
    },
    fieldLabel: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
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
        paddingVertical: spacing.sm + 2,
        borderRadius: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    paymentChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    paymentChipText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    paymentChipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    pricePreview: {
        backgroundColor: colors.success + '10',
        borderWidth: 1,
        borderColor: colors.success + '30',
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.lg,
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    priceValue: {
        fontSize: fontSize.xxl,
        fontWeight: '800',
        color: colors.success,
        marginVertical: spacing.xs,
    },
    priceBreakdown: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
    },
    branchContainer: {
        marginBottom: spacing.lg,
    },
    branchGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    branchChip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
    },
    branchChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    branchChipText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    branchChipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyBranch: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    emptyBranchText: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
        flex: 1,
    },
    submitButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginTop: spacing.sm,
    },
    buttonPressed: {
        opacity: 0.8,
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
        backgroundColor: colors.background,
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
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
    },
    errorText: {
        fontSize: fontSize.xs,
        color: colors.error,
        marginTop: spacing.xs,
        fontWeight: '500',
    },
});
