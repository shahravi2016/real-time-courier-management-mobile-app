import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing } from '../styles/theme';

export const CourierSkeleton = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <Animated.View style={[styles.trackingId, { opacity }]} />
                <Animated.View style={[styles.badge, { opacity }]} />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
                <View style={styles.flex1}>
                    <Animated.View style={[styles.label, { opacity }]} />
                    <Animated.View style={[styles.value, { opacity }]} />
                </View>
                <View style={styles.flex1}>
                    <Animated.View style={[styles.label, { opacity }]} />
                    <Animated.View style={[styles.value, { opacity }]} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    trackingId: {
        height: 20,
        width: 120,
        backgroundColor: colors.border,
        borderRadius: 4,
    },
    badge: {
        height: 24,
        width: 80,
        backgroundColor: colors.border,
        borderRadius: 12,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    },
    flex1: {
        flex: 1,
    },
    label: {
        height: 12,
        width: 60,
        backgroundColor: colors.border,
        borderRadius: 3,
        marginBottom: 8,
    },
    value: {
        height: 16,
        width: 100,
        backgroundColor: colors.border,
        borderRadius: 4,
    },
});
