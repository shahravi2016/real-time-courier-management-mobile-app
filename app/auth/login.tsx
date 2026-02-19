import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors, spacing, fontSize, globalStyles } from '../../src/styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
    const router = useRouter();
    const convex = useConvex();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setIsSubmitting(true);
        try {
            const user = await convex.query(api.auth.login, { email, password });

            if (user) {
                // Store session
                await AsyncStorage.setItem('user_session', JSON.stringify(user));
                router.replace('/');
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
                <View style={styles.header}>
                    <Text style={globalStyles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={globalStyles.label}>Email Address</Text>
                        <TextInput
                            style={globalStyles.input}
                            placeholder="agent@courier.com"
                            placeholderTextColor={colors.textMuted}
                            value={email}
                            onChangeText={setEmail}
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
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            globalStyles.button,
                            pressed && { opacity: 0.8 },
                            styles.loginButton,
                            isSubmitting && { opacity: 0.5 }
                        ]}
                        onPress={handleLogin}
                        disabled={isSubmitting}
                    >
                        <Text style={globalStyles.buttonText}>
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                        </Text>
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
    header: {
        marginBottom: spacing.xxl,
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
    loginButton: {
        marginTop: spacing.md,
    },
    footer: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    footerText: {
        color: colors.textMuted,
        fontSize: fontSize.sm,
    }
});
