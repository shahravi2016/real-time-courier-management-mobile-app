import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { FormInput, LoadingState } from '../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';
import { Ionicons } from '@expo/vector-icons';

const PAYMENT_METHODS = ['cash', 'card', 'prepaid'] as const;

export default function AddCourierScreen() {
    const router = useRouter();
    const createCourier = useMutation(api.couriers.create);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        senderName: '',
        receiverName: '',
        receiverPhone: '',
        pickupAddress: '',
        deliveryAddress: '',
        notes: '',
        weight: '',
        distance: '',
        expectedDeliveryDate: '',
        paymentMethod: 'cash' as 'cash' | 'card' | 'prepaid',
    });
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
        return w * 5 + d * 2 + 10;
    })();

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!form.senderName.trim()) newErrors.senderName = 'Sender name is required';
        if (!form.receiverName.trim()) newErrors.receiverName = 'Receiver name is required';

        if (!form.receiverPhone.trim()) {
            newErrors.receiverPhone = 'Phone number is required';
        } else {
            const digits = form.receiverPhone.replace(/\D/g, '');
            if (digits.length !== 10) {
                newErrors.receiverPhone = 'Phone number must be exactly 10 digits';
            }
        }

        if (!form.pickupAddress.trim()) newErrors.pickupAddress = 'Pickup address is required';
        if (!form.deliveryAddress.trim()) newErrors.deliveryAddress = 'Delivery address is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            const w = parseFloat(form.weight) || undefined;
            const d = parseFloat(form.distance) || undefined;

            await createCourier({
                senderName: form.senderName.trim(),
                receiverName: form.receiverName.trim(),
                receiverPhone: form.receiverPhone.trim(),
                pickupAddress: form.pickupAddress.trim(),
                deliveryAddress: form.deliveryAddress.trim(),
                notes: form.notes.trim() || undefined,
                weight: w,
                distance: d,
                price: calculatedPrice || undefined,
                paymentMethod: form.paymentMethod,
                expectedDeliveryDate: form.expectedDeliveryDate.trim() || undefined,
            });

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
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>New Courier</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={100}
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
                            />
                        </View>
                    </View>

                    {/* Payment Method Selector */}
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
    backButton: {
        padding: spacing.xs,
        marginLeft: -spacing.xs,
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
    },
});
