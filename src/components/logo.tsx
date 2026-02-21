import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../styles/theme';

interface LogoProps {
    size?: number;
    showText?: boolean;
}

export function Logo({ size = 48, showText = false }: LogoProps) {
    const iconSize = size * 0.6;

    return (
        <View style={styles.container}>
            <View style={[styles.logoContainer, { width: size, height: size, borderRadius: size / 4 }]}>
                {/* Outer Ring Effect */}
                <View style={[styles.outerRing, { borderRadius: size / 4 + 4 }]} />

                {/* Main Icon */}
                <Ionicons name="cube" size={iconSize} color="#fff" />

                {/* Sparkle Detail */}
                <View style={[styles.sparkle, { top: size * 0.15, right: size * 0.15 }]} />
            </View>

            {showText && (
                <View style={styles.textContainer}>
                    <Text style={styles.brandTitle}>COURIER</Text>
                    <Text style={styles.brandSubtitle}>EXPRESS</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    logoContainer: {
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        // Elevation for Android
        elevation: 8,
        // Shadow for iOS
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    outerRing: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderWidth: 1.5,
        borderColor: colors.primary + '40',
    },
    sparkle: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
        opacity: 0.8,
    },
    textContainer: {
        justifyContent: 'center',
    },
    brandTitle: {
        fontSize: fontSize.lg,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: 2,
    },
    brandSubtitle: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 4,
        marginTop: -4,
    },
});
