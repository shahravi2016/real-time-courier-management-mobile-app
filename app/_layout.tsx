import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { colors } from '../src/styles/theme';
import { AuthProvider, useAuth } from '../src/components/auth-context';
import { LoadingState } from '../src/components';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

function RootNavigator() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        // Wait for auth to finish loading before deciding where to go
        if (isLoading) return;

        const inAuthGroup = segments[0] === 'auth';

        if (!user && !inAuthGroup) {
            // No user and not in auth screen? Redirect to Login
            router.replace('/auth/login');
        } else if (user && inAuthGroup) {
            // Have user but in login/register? Redirect to Dashboard
            router.replace('/');
        }
    }, [user, segments, isLoading]);

    if (isLoading) {
        return <LoadingState message="Restoring session..." />;
    }

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerTintColor: colors.text,
                headerTitleStyle: {
                    fontWeight: '600',
                },
                contentStyle: {
                    backgroundColor: colors.background,
                },
                animation: 'slide_from_right',
            }}
        >
            {/* The index route represents the Dashboard */}
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="couriers/index" options={{ headerShown: false }} />
            <Stack.Screen name="couriers/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="couriers/add" options={{ headerShown: false }} />
            <Stack.Screen name="couriers/[id]/invoice" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="auth/register" options={{ headerShown: false }} />
            <Stack.Screen name="settings/index" options={{ headerShown: false }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <ConvexProvider client={convex}>
            <SafeAreaProvider>
                <AuthProvider>
                    <StatusBar style="light" />
                    <RootNavigator />
                </AuthProvider>
            </SafeAreaProvider>
        </ConvexProvider>
    );
}
