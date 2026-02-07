import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../styles/theme';

type CourierStatus =
    | 'pending'
    | 'picked_up'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';

interface StatusBadgeProps {
    status: CourierStatus;
    size?: 'small' | 'medium';
}

const statusConfig: Record<CourierStatus, { label: string; color: string }> = {
    pending: { label: 'Pending', color: colors.pending },
    picked_up: { label: 'Picked Up', color: colors.pickedUp },
    in_transit: { label: 'In Transit', color: colors.inTransit },
    out_for_delivery: { label: 'Out for Delivery', color: colors.outForDelivery },
    delivered: { label: 'Delivered', color: colors.delivered },
    cancelled: { label: 'Cancelled', color: colors.cancelled },
};

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
    const config = statusConfig[status];
    const isSmall = size === 'small';

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: config.color + '20' },
                isSmall && styles.badgeSmall,
            ]}
        >
            <View style={[styles.dot, { backgroundColor: config.color }]} />
            <Text
                style={[
                    styles.label,
                    { color: config.color },
                    isSmall && styles.labelSmall,
                ]}
            >
                {config.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs + 2,
        paddingHorizontal: spacing.sm + 2,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    badgeSmall: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: spacing.xs + 2,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: '600',
    },
    labelSmall: {
        fontSize: fontSize.xs,
    },
});
