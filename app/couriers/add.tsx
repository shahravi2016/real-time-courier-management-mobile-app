import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { FormInput, LoadingState } from '../../src/components';
import { colors, spacing, globalStyles } from '../../src/styles/theme';

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
        if (!form.receiverPhone.trim()) newErrors.receiverPhone = 'Phone number is required';
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
                { text: 'OK', onPress: () => router.back() },
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
        <SafeAreaView style={globalStyles.safeArea} edges={['bottom']}>
            <Stack.Screen options={{ title: 'Add Courier' }} />

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
                    onChangeText={(v) => updateField('receiverPhone', v)}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    error={errors.receiverPhone}
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
});
