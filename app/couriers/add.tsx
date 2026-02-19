import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { FormInput, LoadingState } from '../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';

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
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

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
            await createCourier({
                senderName: form.senderName.trim(),
                receiverName: form.receiverName.trim(),
                receiverPhone: form.receiverPhone.trim(),
                pickupAddress: form.pickupAddress.trim(),
                deliveryAddress: form.deliveryAddress.trim(),
                notes: form.notes.trim() || undefined,
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
                    <Text style={styles.headerBackText}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Add Courier</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={100}
            >
                <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
                            // Only allow digits
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
                        label="Notes (Optional)"
                        value={form.notes}
                        onChangeText={(v) => updateField('notes', v)}
                        placeholder="Any additional notes"
                        multiline
                    />

                    <Pressable
                        style={({ pressed }) => [
                            globalStyles.button,
                            pressed && styles.buttonPressed,
                            styles.submitButton,
                        ]}
                        onPress={handleSubmit}
                    >
                        <Text style={globalStyles.buttonText}>Create Courier</Text>
                    </Pressable>
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
    submitButton: {
        marginTop: spacing.md,
        marginBottom: spacing.xl,
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
    headerBackText: {
        fontSize: fontSize.xl,
        color: colors.text,
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
    },
});
