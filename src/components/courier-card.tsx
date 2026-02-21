import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, fontSize } from '../styles/theme';
import { StatusBadge } from './status-badge';
import { Id } from '../../convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';

type CourierStatus =
    | 'booked'
    | 'picked_up'
    | 'dispatched'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';

interface Courier {
    _id: Id<'couriers'>;
    trackingId: string;
    receiverName: string;
    receiverPhone: string;
    deliveryAddress: string;
    currentStatus: CourierStatus;
    createdAt: number;
}

interface CourierCardProps {
    courier: Courier;
    onPress: () => void;
}

export function CourierCard({ courier, onPress }: CourierCardProps) {
    const formattedDate = new Date(courier.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
            ]}
        >
            <View style={styles.header}>
                <Text style={styles.trackingId}>{courier.trackingId}</Text>
                <StatusBadge status={courier.currentStatus} size="small" />
            </View>

            <View style={styles.content}>
                <View style={styles.row}>
                    <Ionicons name="person-outline" size={14} color={colors.textSecondary} style={styles.icon} />
                    <Text style={styles.receiverName}>{courier.receiverName}</Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="call-outline" size={14} color={colors.textSecondary} style={styles.icon} />
                    <Text style={styles.phone}>{courier.receiverPhone}</Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={styles.icon} />
                    <Text style={styles.address} numberOfLines={1}>
                        {courier.deliveryAddress}
                    </Text>
                </View>
            </View>

            <Text style={styles.date}>{formattedDate}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardPressed: {
        backgroundColor: colors.surfaceElevated,
        transform: [{ scale: 0.98 }],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    trackingId: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: 0.5,
    },
    content: {
        gap: spacing.xs + 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: spacing.sm,
        width: 18,
    },
    receiverName: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.text,
    },
    phone: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    address: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        flex: 1,
    },
    date: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
        marginTop: spacing.sm,
        textAlign: 'right',
    },
});
