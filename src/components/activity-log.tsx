import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { colors, spacing, fontSize } from '../styles/theme';

interface ActivityLogProps {
    courierId: Id<'couriers'>;
}

export function ActivityLog({ courierId }: ActivityLogProps) {
    const logs = useQuery(api.couriers.getLogs, { courierId });

    if (logs === undefined) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    if (logs.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No activity recorded.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Activity Log</Text>
            <View style={styles.timeline}>
                {logs.map((log, index) => {
                    const date = new Date(log.timestamp);
                    const isLast = index === logs.length - 1;

                    return (
                        <View key={log._id} style={styles.logItem}>
                            <View style={styles.leftColumn}>
                                <View style={styles.circle} />
                                {!isLast && <View style={styles.line} />}
                            </View>
                            <View style={styles.rightColumn}>
                                <Text style={styles.description}>{log.description}</Text>
                                <Text style={styles.timestamp}>
                                    {date.toLocaleDateString()} {date.toLocaleTimeString()}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: spacing.xl,
        marginBottom: spacing.xxl,
    },
    loadingContainer: {
        marginTop: spacing.lg,
        alignItems: 'center',
    },
    emptyContainer: {
        marginTop: spacing.lg,
        padding: spacing.md,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: fontSize.sm,
    },
    title: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
    },
    timeline: {
        paddingLeft: spacing.xs,
    },
    logItem: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    leftColumn: {
        alignItems: 'center',
        width: 24,
        marginRight: spacing.sm,
    },
    circle: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
        marginTop: 6,
    },
    line: {
        width: 2,
        flex: 1,
        backgroundColor: colors.border,
        marginVertical: 4,
    },
    rightColumn: {
        flex: 1,
        paddingBottom: spacing.lg,
    },
    description: {
        fontSize: fontSize.md,
        color: colors.text,
        marginBottom: 2,
    },
    timestamp: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
    },
});
