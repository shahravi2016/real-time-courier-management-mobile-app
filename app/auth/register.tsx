import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';
import { Ionicons } from '@expo/vector-icons';

const ROLES = [
    { label: 'Admin', value: 'admin' },
    { label: 'Agent (Delivery)', value: 'agent' },
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
        role: 'agent' as 'admin' | 'agent' | 'customer',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRegister = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.password) {
            Alert.alert('Required Fields', 'Name, Email, and Password are mandatory.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email.trim())) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        if (form.password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
            return;
        }

        if (form.phone) {
            const digits = form.phone.replace(/\D/g, '');
            if (digits.length > 0 && digits.length !== 10) {
                Alert.alert('Invalid Phone', 'Phone number must be 10 digits.');
                return;
            }
        }

        if (form.name.trim().length < 3) {
            Alert.alert('Invalid Name', 'Full name must be at least 3 characters.');
            return;
        }

        setIsSubmitting(true);
        try {
            await register({
                ...form,
                email: form.email.trim(),
                name: form.name.trim(),
                phone: form.phone.trim() || undefined
            });
            Alert.alert('Success', 'Account created! You can now sign in.', [
                { text: 'OK', onPress: () => router.replace('/auth/login') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
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
                        <View style={styles.inputGroup}>
                            <Text style={globalStyles.label}>Full Name</Text>
                            <TextInput
                                style={globalStyles.input}
                                placeholder="John Doe"
                                placeholderTextColor={colors.textMuted}
                                value={form.name}
                                onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={globalStyles.label}>Email Address</Text>
                            <TextInput
                                style={globalStyles.input}
                                placeholder="john@example.com"
                                placeholderTextColor={colors.textMuted}
                                value={form.email}
                                onChangeText={(v) => setForm(f => ({ ...f, email: v }))}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={globalStyles.label}>Password</Text>
                            <TextInput
                                style={globalStyles.input}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textMuted}
                                value={form.password}
                                onChangeText={(v) => setForm(f => ({ ...f, password: v }))}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={globalStyles.label}>Phone Number</Text>
                            <TextInput
                                style={globalStyles.input}
                                placeholder="1234567890"
                                placeholderTextColor={colors.textMuted}
                                value={form.phone}
                                onChangeText={(v) => setForm(f => ({ ...f, phone: v }))}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <Text style={globalStyles.label}>Account Role</Text>
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
                                <Text style={styles.submitButtonText}>Create Account</Text>
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
        gap: spacing.lg,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    roleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
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
        marginTop: spacing.md,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: fontSize.md,
    },
});
