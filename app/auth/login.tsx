import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';
import { useAuth } from '../../src/components/auth-context';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const convex = useConvex();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setIsSubmitting(true);
        try {
            const user = await convex.query(api.auth.login, { email, password });

            if (user) {
                await login(user as any);
            } else {
                Alert.alert('Error', 'Invalid credentials');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>
                {/* Logo Area */}
                <View style={styles.logoArea}>
                    <View style={styles.logoIcon}>
                        <Ionicons name="cube-outline" size={40} color={colors.primary} />
                    </View>
                    <Text style={styles.logoText}>Courier Manager</Text>
                </View>

                <View style={styles.header}>
                    <Text style={globalStyles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to your account</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={globalStyles.label}>Email</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="you@example.com"
                                placeholderTextColor={colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={globalStyles.label}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={colors.textMuted}
                                />
                            </Pressable>
                        </View>
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.loginButton,
                            pressed && { opacity: 0.85 },
                            isSubmitting && { opacity: 0.5 }
                        ]}
                        onPress={handleLogin}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        )}
                    </Pressable>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? Contact Admin.</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
    },
    logoArea: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    logoIcon: {
        width: 72,
        height: 72,
        borderRadius: 18,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    logoText: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    header: {
        marginBottom: spacing.xl,
    },
    subtitle: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    form: {
        gap: spacing.lg,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: spacing.md,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    inputField: {
        flex: 1,
        paddingVertical: spacing.md,
        fontSize: fontSize.md,
        color: colors.text,
    },
    eyeButton: {
        padding: spacing.xs,
    },
    loginButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md + 2,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: fontSize.md,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    footer: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    footerText: {
        color: colors.textMuted,
        fontSize: fontSize.sm,
    },
});
