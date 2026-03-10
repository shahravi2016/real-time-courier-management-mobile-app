import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { colors, spacing, fontSize } from '../styles/theme';

interface DataPoint {
    label: string;
    value: number;
    color?: string;
}

interface ChartProps {
    title: string;
    data: DataPoint[];
    type?: 'bar' | 'horizontal-bar' | 'pie';
    suffix?: string;
}

export const AnalyticsChart: React.FC<ChartProps> = ({ title, data, type = 'bar', suffix = '' }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const totalValue = data.reduce((sum, d) => sum + d.value, 0);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            
            {data.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No data available for this period</Text>
                </View>
            ) : type === 'bar' ? (
                <View style={styles.barChart}>
                    {data.map((item, index) => (
                        <View key={index} style={styles.barContainer}>
                            <View style={styles.barWrapper}>
                                <View 
                                    style={[
                                        styles.bar, 
                                        { 
                                            height: `${Math.max((item.value / maxValue) * 100, 2)}%`, // Min 2% visibility
                                            backgroundColor: item.color || colors.primary
                                        }
                                    ]} 
                                />
                            </View>
                            <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
                        </View>
                    ))}
                </View>
            ) : type === 'horizontal-bar' ? (
                <View style={styles.horizontalChart}>
                    {data.map((item, index) => (
                        <View key={index} style={styles.hBarRow}>
                            <View style={styles.hBarLabelContainer}>
                                <Text style={styles.hBarLabel}>{item.label}</Text>
                                <Text style={styles.hBarValue}>{item.value}{suffix}</Text>
                            </View>
                            <View style={styles.hBarBg}>
                                <View 
                                    style={[
                                        styles.hBarFill, 
                                        { 
                                            width: `${Math.max((item.value / maxValue) * 100, 2)}%`,
                                            backgroundColor: item.color || colors.primary
                                        }
                                    ]} 
                                />
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                /* Pie Chart Alternative: Segmented Contribution Bar */
                <View style={styles.pieContainer}>
                    <View style={styles.segmentedBar}>
                        {data.map((item, index) => (
                            <View 
                                key={index} 
                                style={[
                                    styles.segment, 
                                    { 
                                        flex: item.value || 0.0001, 
                                        backgroundColor: item.color || (index === 0 ? colors.primary : index === 1 ? colors.success : colors.warning) 
                                    }
                                ]} 
                            />
                        ))}
                    </View>
                    <View style={styles.legendContainer}>
                        {data.map((item, index) => (
                            <View key={index} style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: item.color || (index === 0 ? colors.primary : index === 1 ? colors.success : colors.warning) }]} />
                                <Text style={styles.legendLabel}>{item.label}</Text>
                                <Text style={styles.legendValue}>
                                    {suffix}{item.value} ({totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0}%)
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.md,
        marginVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        minWidth: 200,
    },
    title: {
        fontSize: fontSize.md,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.lg,
    },
    barChart: {
        flexDirection: 'row',
        height: 180, // Increased height to accommodate labels
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        paddingBottom: 30, // More padding for bottom labels
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
        height: '100%',
    },
    barWrapper: {
        height: '80%', // Limit height to leave room for labels
        width: 12,
        backgroundColor: colors.border + '50',
        borderRadius: 6,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    bar: {
        width: '100%',
        borderRadius: 6,
    },
    barLabel: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 8,
        textAlign: 'center',
        width: '100%',
    },
    horizontalChart: {
        gap: spacing.md,
    },
    hBarRow: {
        gap: 6,
    },
    hBarLabelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    hBarLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    hBarValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.primary,
    },
    hBarBg: {
        height: 8,
        backgroundColor: colors.border + '50',
        borderRadius: 4,
        overflow: 'hidden',
    },
    hBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    pieContainer: {
        gap: spacing.lg,
    },
    segmentedBar: {
        height: 24,
        flexDirection: 'row',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: colors.border + '30',
    },
    segment: {
        height: '100%',
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendColor: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    legendValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.text,
        marginLeft: 2,
    },
    emptyContainer: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        borderRadius: 12,
        backgroundColor: colors.surfaceHighlight + '50',
    },
    emptyText: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
});
