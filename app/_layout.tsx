import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { colors } from '../src/styles/theme';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export default function RootLayout() {
    return (
        <ConvexProvider client={convex}>
            <SafeAreaProvider>
                <StatusBar style="light" />
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
                />
            </SafeAreaProvider>
        </ConvexProvider>
    );
}
