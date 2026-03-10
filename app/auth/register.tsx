import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { FormInput } from '../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { validateEmail, validateName, validatePhone } from '../../src/utils/validation';

const ROLES = [
    { label: 'Customer', value: 'customer' },
] as const;

export default function RegisterScreen() {
    const router = useRouter();
    const register = useMutation(api.auth.register);

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'customer' as 'customer',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateField = (field: string, value: string) => {
        setForm(f => ({ ...f, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[field];
                return newErrs;
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        
        const nameV = validateName(form.name, 'Full Name');
        if (!nameV.isValid) newErrors.name = nameV.message!;

        const emailV = validateEmail(form.email);
        if (!emailV.isValid) newErrors.email = emailV.message!;

        if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

        if (form.phone.trim()) {
            const phoneV = validatePhone(form.phone);
            if (!phoneV.isValid) newErrors.phone = phoneV.message!;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await register({
                ...form,
                email: form.email.trim().toLowerCase(),
                name: form.name.trim(),
                phone: form.phone.trim() || undefined
            });
            Alert.alert('Success', 'Account created! You can now sign in.', [
                { text: 'OK', onPress: () => router.replace('/auth/login') }
            ]);
        } catch (error: any) {
            // Check if error is specifically about the email
            if (error.message.includes('Email already registered')) {
                setErrors(prev => ({ ...prev, email: 'This email is already in use.' }));
            } else {
                Alert.alert('Registration Failed', error.message || 'Check your internet connection.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/auth/login')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Create Account</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    <View style={styles.form}>
                        <FormInput
                            label="Full Name"
                            placeholder="John Doe"
                            value={form.name}
                            onChangeText={(v) => updateField('name', v)}
                            error={errors.name}
                        />

                        <FormInput
                            label="Email Address"
                            placeholder="john@example.com"
                            value={form.email}
                            onChangeText={(v) => updateField('email', v)}
                            keyboardType="email-address"
                            error={errors.email}
                        />

                        <FormInput
                            label="Password"
                            placeholder="••••••••"
                            value={form.password}
                            onChangeText={(v) => updateField('password', v)}
                            secureTextEntry
                            error={errors.password}
                        />

                        <FormInput
                            label="Phone Number"
                            placeholder="10-digit number"
                            value={form.phone}
                            onChangeText={(v) => updateField('phone', v.replace(/[^0-9]/g, ''))}
                            keyboardType="phone-pad"
                            maxLength={10}
                            error={errors.phone}
                        />

                        <Text style={styles.sectionLabel}>Account Role</Text>
                        <View style={styles.roleContainer}>
                            {ROLES.map((r) => (
                                <Pressable
                                    key={r.value}
                                    style={[
                                        styles.roleChip,
                                        form.role === r.value && styles.roleChipActive
                                    ]}
                                    onPress={() => setForm(f => ({ ...f, role: r.value }))}
                                >
                                    <Text style={[
                                        styles.roleChipText,
                                        form.role === r.value && styles.roleChipTextActive
                                    ]}>
                                        {r.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable
                            style={({ pressed }) => [
                                styles.submitButton,
                                pressed && { opacity: 0.8 },
                                isSubmitting && { opacity: 0.6 }
                            ]}
                            onPress={handleRegister}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.submitButtonText}>Register Now</Text>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: spacing.lg,
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
    backButton: {
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
        fontWeight: 'bold',
        color: colors.text,
    },
    form: {
        gap: spacing.xs,
    },
    sectionLabel: {
        fontSize: fontSize.xs,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        letterSpacing: 1,
    },
    roleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    roleChip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    roleChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    roleChipText: {
        color: colors.textSecondary,
        fontSize: fontSize.sm,
        fontWeight: '500',
    },
    roleChipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: fontSize.md,
    },
});
