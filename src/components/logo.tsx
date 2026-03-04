import React from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { colors, spacing, fontSize } from '../styles/theme';

interface LogoProps {
    size?: number;
    showText?: boolean;
}

export function Logo({ size = 48, showText = false }: LogoProps) {
    return (
        <View style={styles.container}>
            <View style={[styles.logoContainer, { width: size, height: size, borderRadius: size / 4 }]}>
                <Image 
                    source={require('../../assets/icon.png')} 
                    style={{ width: size, height: size, borderRadius: size / 4 }}
                    resizeMode="cover"
                />
            </View>

            {showText && (
                <View style={styles.textContainer}>
                    <Text style={styles.brandTitle}>COURIER</Text>
                    <Text style={styles.brandSubtitle}>MANAGER</Text>
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
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        // Elevation for Android
        elevation: 8,
        // Shadow for iOS
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
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
