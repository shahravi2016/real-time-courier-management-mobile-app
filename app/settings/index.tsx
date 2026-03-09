import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { FormInput } from '../../src/components';
import { validateName, validatePhone, showAlert } from '../../src/utils/validation';
import { colors, spacing, globalStyles } from '../../src/styles/theme';
import { useAuth } from '../../src/components/auth-context';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
    const router = useRouter();
    const { user, updateUser } = useAuth();

    // Safety check in case auth hasn't loaded 
    if (!user) {
        return null;
    }

    const isAdmin = user.role === 'admin';
    const isRestricted = user.role === 'agent' || user.role === 'branch_manager';

    const updateProfile = useMutation(api.users.updateProfile);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({
        name: user.name || '',
        phone: user.phone || '',
        password: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Keep form sync'd if user context updates
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
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validate = () => {
        const nameValid = validateName(form.name, 'Full Name');
        if (!nameValid.isValid) {
            showAlert('Validation Error', nameValid.message!);
            return false;
        }

        const phoneValid = validatePhone(form.phone, true);
        if (!phoneValid.isValid) {
            showAlert('Validation Error', phoneValid.message!);
            return false;
        }

        if (isAdmin && form.password) {
            if (form.password.length < 6) {
                showAlert('Security Error', 'New password must be at least 6 characters.');
                return false;
            }
        }
        
        return true;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            const updatedName = form.name.trim();
            const updatedPhone = form.phone.trim() || undefined;

            await updateProfile({
                id: user._id as Id<'users'>,
                name: updatedName,
                phone: updatedPhone,
                password: (isAdmin && form.password) ? form.password : undefined,
            });

            // Update local state and AsyncStorage for immediate real-time reflection across the app
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
            {/* Header */}
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
                <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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

                        {!isAdmin && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Your Password</Text>
                                <View style={[styles.readOnlyInput, styles.lockedInput]}>
                                    <Text style={styles.readOnlyText}>
                                        {showPassword ? (user.password || 'N/A') : '••••••••••••'}
                                    </Text>
                                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                                        <Ionicons 
                                            name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                            size={20} 
                                            color={colors.primary} 
                                        />
                                    </Pressable>
                                </View>
                                <Text style={styles.helperText}>Only Admin can reset this password.</Text>
                            </View>
                        )}

                        {isAdmin && (
                            <FormInput
                                label="Update Password (Optional)"
                                value={form.password}
                                onChangeText={(val) => updateField('password', val)}
                                placeholder="Enter new password"
                                secureTextEntry
                                error={errors.password}
                            />
                        )}

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
    container: {
        flex: 1,
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
        padding: spacing.sm,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.xxl,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    roleBadge: {
        backgroundColor: colors.border,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleBadgeText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.lg,
        marginTop: spacing.md,
    },
    inputContainer: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
        fontWeight: '500',
    },
    readOnlyInput: {
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lockedInput: {
        opacity: 0.9,
    },
    readOnlyText: {
        color: colors.textMuted,
        fontSize: 16,
    },
    helperText: {
        fontSize: 12,
        color: colors.primary,
        marginTop: 6,
        fontStyle: 'italic',
    },
    saveButton: {
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    saveButtonPressed: {
        opacity: 0.8,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
