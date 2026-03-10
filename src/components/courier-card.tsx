import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, fontSize } from '../styles/theme';
import { StatusBadge } from './status-badge';
import { Id } from '../../convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';

type CourierStatus =
    | 'booked'
    | 'pending'
    | 'picked_up'
    | 'dispatched'
    | 'in_transit'
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
    onLongPress?: () => void;
    isSelected?: boolean;
    isSelectionMode?: boolean;
}

export function CourierCard({ 
    courier, 
    onPress, 
    onLongPress, 
    isSelected = false, 
    isSelectionMode = false 
}: CourierCardProps) {
    const formattedDate = new Date(courier.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={500}
            style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
                isSelected && styles.cardSelected,
            ]}
        >
            <View style={styles.header}>
                <View style={styles.idContainer}>
                    {isSelectionMode && (
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                    )}
                    <Text style={[styles.trackingId, isSelected && { color: colors.primary }]}>{courier.trackingId}</Text>
                </View>
                <StatusBadge status={courier.currentStatus} size="small" />
            </View>

            <View style={styles.content}>
                <View style={styles.row}>
                    <Ionicons name="person-outline" size={14} color={isSelected ? colors.primary : colors.textSecondary} style={styles.icon} />
                    <Text style={styles.receiverName}>{courier.receiverName}</Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="call-outline" size={14} color={isSelected ? colors.primary : colors.textSecondary} style={styles.icon} />
                    <Text style={styles.phone}>{courier.receiverPhone}</Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="location-outline" size={14} color={isSelected ? colors.primary : colors.textSecondary} style={styles.icon} />
                    <Text style={styles.address} numberOfLines={1}>
                        {courier.deliveryAddress}
                    </Text>
                </View>
            </View>

            <View style={globalStyles.spaceBetween}>
                <Text style={styles.date}>{formattedDate}</Text>
                {isSelected && (
                    <View style={styles.selectionIndicator}>
                        <Text style={styles.selectionIndicatorText}>SELECTED</Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardPressed: {
        backgroundColor: colors.surfaceElevated,
        transform: [{ scale: 0.99 }],
    },
    cardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '08',
        borderWidth: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    idContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    checkboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    trackingId: {
        fontSize: fontSize.md,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.5,
    },
    content: {
        gap: spacing.xs + 2,
        marginBottom: spacing.sm,
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
        fontWeight: '600',
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
        fontSize: 10,
        color: colors.textMuted,
        fontWeight: '600',
    },
    selectionIndicator: {
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    selectionIndicatorText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    },
});

const globalStyles = StyleSheet.create({
    spaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    }
});
