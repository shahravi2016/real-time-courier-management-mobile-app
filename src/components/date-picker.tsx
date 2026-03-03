import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (date: string) => void;
    currentDate?: string;
}

export function DatePicker({ visible, onClose, onSelect, currentDate }: DatePickerProps) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const [viewDate, setViewDate] = useState(new Date(currentDate || tomorrow));

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());

    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleSelectDay = (day: number) => {
        const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        if (selectedDate < tomorrow) return;

        const formattedDate = selectedDate.toISOString().split('T')[0];
        onSelect(formattedDate);
        onClose();
    };

    const days = [];
    // Padding for first week
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), i);
        const isPast = date < tomorrow;
        const isSelected = currentDate === date.toISOString().split('T')[0];

        days.push(
            <Pressable
                key={i}
                style={[
                    styles.dayCell,
                    isSelected && styles.selectedDay,
                    isPast && styles.pastDay
                ]}
                onPress={() => !isPast && handleSelectDay(i)}
                disabled={isPast}
            >
                <Text style={[
                    styles.dayText,
                    isSelected && styles.selectedDayText,
                    isPast && styles.pastDayText
                ]}>
                    {i}
                </Text>
            </Pressable>
        );
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Pressable onPress={prevMonth} style={styles.navButton}>
                            <Ionicons name="chevron-back" size={24} color={colors.primary} />
                        </Pressable>
                        <Text style={styles.monthTitle}>
                            {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </Text>
                        <Pressable onPress={nextMonth} style={styles.navButton}>
                            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                        </Pressable>
                    </View>

                    <View style={styles.weekDays}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <Text key={i} style={styles.weekDayText}>{d}</Text>
                        ))}
                    </View>

                    <View style={styles.daysGrid}>
                        {days}
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.hintText}>* Dates can only be tomorrow or later</Text>
                        <Pressable style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    content: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    navButton: {
        padding: spacing.sm,
    },
    monthTitle: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.text,
    },
    weekDays: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    weekDayText: {
        flex: 1,
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: fontSize.xs,
        fontWeight: 'bold',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.sm,
    },
    dayText: {
        color: colors.text,
        fontSize: fontSize.md,
    },
    pastDay: {
        opacity: 0.3,
    },
    pastDayText: {
        color: colors.textMuted,
        textDecorationLine: 'line-through',
    },
    selectedDay: {
        backgroundColor: colors.primary,
    },
    selectedDayText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    footer: {
        marginTop: spacing.lg,
        alignItems: 'center',
    },
    hintText: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
        marginBottom: spacing.md,
    },
    closeButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    closeButtonText: {
        color: colors.error,
        fontWeight: '600',
    }
});
