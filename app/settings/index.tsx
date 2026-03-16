import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { FormInput } from '../../src/components';
import { validateName, validatePhone } from '../../src/utils/validation';
import { colors, spacing, globalStyles, fontSize } from '../../src/styles/theme';
import { useAuth } from '../../src/components/auth-context';
import { useSafeNavigation } from '../../src/utils/navigation';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
    const router = useSafeNavigation();
    const { user, updateUser } = useAuth();

    if (!user) return null;

    const isRestricted = user.role === 'agent' || user.role === 'branch_manager';

    const updateProfile = useMutation(api.users.updateProfile);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: user.name || '',
        phone: user.phone || '',
        password: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setForm({
            name: user.name || '',
            phone: user.phone || '',
            password: '',
        });
    }, [user.name, user.phone]);

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrs = { ...prev };
                delete newErrs[field];
                return newErrs;
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        
        if (!form.name.trim() || form.name.length < 3) {
            newErrors.name = 'Full name must be at least 3 characters';
        }

        const phoneValid = validatePhone(form.phone);
        if (!phoneValid.isValid) {
            newErrors.phone = phoneValid.message!;
        }

        if (form.password && form.password.length < 6) {
            newErrors.password = 'New password must be at least 6 characters';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            const updatedName = form.name.trim();
            const updatedPhone = form.phone.trim();

            await updateProfile({
                id: user._id as Id<'users'>,
                name: updatedName,
                phone: updatedPhone,
                password: form.password ? form.password : undefined,
                callerId: user._id as Id<'users'>,
            });

            await updateUser({
                name: updatedName,
                phone: updatedPhone,
            });

            Alert.alert('Success', 'Profile updated successfully', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile.');
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
                <Text style={styles.headerTitle}>Profile Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    style={styles.container} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.card}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {form.name ? form.name.charAt(0).toUpperCase() : '?'}
                                </Text>
                            </View>
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleBadgeText}>
                                    {user.role.replace('_', ' ').toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Account Details</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <View style={[styles.readOnlyInput, isRestricted && styles.lockedInput]}>
                                <Text style={styles.readOnlyText}>{user.email}</Text>
                                {isRestricted && <Ionicons name="lock-closed" size={16} color={colors.textMuted} />}
                            </View>
                            {isRestricted && (
                                <Text style={styles.helperText}>Contact Admin to change email address.</Text>
                            )}
                        </View>

                        <FormInput
                            label="Full Name"
                            value={form.name}
                            onChangeText={(val) => updateField('name', val)}
                            placeholder="Enter your full name"
                            error={errors.name}
                        />

                        <FormInput
                            label="Phone Number"
                            value={form.phone}
                            onChangeText={(val) => {
                                const numericValue = val.replace(/[^0-9]/g, '');
                                if (numericValue.length <= 10) {
                                    updateField('phone', numericValue);
                                }
                            }}
                            placeholder="10-digit phone number"
                            keyboardType="phone-pad"
                            error={errors.phone}
                            maxLength={10}
                        />

                        <FormInput
                            label="Change Password"
                            value={form.password}
                            onChangeText={(val) => updateField('password', val)}
                            placeholder="Leave blank to keep current"
                            secureTextEntry
                            error={errors.password}
                        />
                        <Text style={styles.helperText}>Password must be at least 6 characters.</Text>

                        <Pressable
                            style={({ pressed }) => [
                                styles.saveButton,
                                pressed && styles.saveButtonPressed,
                                isSubmitting && styles.saveButtonDisabled
                            ]}
                            onPress={handleSave}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.saveButtonText}>
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: spacing.sm },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xxl },
    avatarContainer: { alignItems: 'center', marginBottom: spacing.xl },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
    roleBadge: { backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    roleBadgeText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.lg, marginTop: spacing.md },
    inputContainer: { marginBottom: spacing.lg },
    inputLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 8, fontWeight: '500' },
    readOnlyInput: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lockedInput: { opacity: 0.9 },
    readOnlyText: { color: colors.textMuted, fontSize: 16 },
    helperText: { fontSize: 12, color: colors.primary, marginTop: 6, fontStyle: 'italic' },
    saveButton: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: 8, alignItems: 'center', marginTop: spacing.lg },
    saveButtonPressed: { opacity: 0.8 },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
