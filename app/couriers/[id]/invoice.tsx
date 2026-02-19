import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { LoadingState, ErrorState } from '../../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../../src/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function InvoiceScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const courier = useQuery(api.couriers.getById, { id: id as Id<'couriers'> });

    if (!courier) return <LoadingState message="Loading invoice..." />;

    // Generate HTML for printing
    const generateHtml = () => {
        return `
            <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #111; }
                        .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
                        .title { font-size: 32px; font-weight: bold; color: #333; }
                        .company { text-align: right; }
                        .details { margin-bottom: 30px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                        .label { font-weight: bold; color: #666; width: 150px; }
                        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        .table th { background-color: #f8f8f8; }
                        .total { text-align: right; margin-top: 20px; font-size: 24px; font-weight: bold; }
                        .footer { margin-top: 50px; text-align: center; color: #888; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">INVOICE</div>
                        <div class="company">
                            <strong>Courier Manager Inc.</strong><br>
                            123 Logistics Way<br>
                            support@courier.com
                        </div>
                    </div>

                    <div class="details">
                        <div class="row"><span class="label">Invoice No:</span> INV-${courier.trackingId}</div>
                        <div class="row"><span class="label">Date:</span> ${new Date(courier.createdAt).toLocaleDateString()}</div>
                        <div class="row"><span class="label">Tracking ID:</span> ${courier.trackingId}</div>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                        <div>
                            <strong>Bill To:</strong><br>
                            ${courier.senderName}<br>
                            (Sender)
                        </div>
                        <div>
                            <strong>Ship To:</strong><br>
                            ${courier.receiverName}<br>
                            ${courier.deliveryAddress}
                        </div>
                    </div>

                    <table class="table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Rate</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Shipping Charges (Weight: ${courier.weight}kg)</td>
                                <td>1</td>
                                <td>$5.00/kg</td>
                                <td>$${(courier.weight || 0) * 5}</td>
                            </tr>
                             <tr>
                                <td>Distance Charges (${courier.distance}km)</td>
                                <td>1</td>
                                <td>$2.00/km</td>
                                <td>$${(courier.distance || 0) * 2}</td>
                            </tr>
                            <tr>
                                <td>Base Fee</td>
                                <td>1</td>
                                <td>$10.00</td>
                                <td>$10.00</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="total">
                        Total: $${(courier.price || 0).toFixed(2)}
                    </div>

                    <div class="footer">
                        Thank you for your business! | Payment Status: ${courier.paymentStatus || 'Pending'}
                    </div>
                </body>
            </html>
        `;
    };

    const handlePrint = async () => {
        try {
            const html = generateHtml();
            if (Platform.OS === 'web') {
                const printWindow = window.open('', '', 'height=600,width=800');
                if (printWindow) {
                    printWindow.document.write(html);
                    printWindow.document.close();
                    printWindow.print();
                }
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error('Print error:', error);
        }
    };

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={globalStyles.row}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                    <Text style={[globalStyles.subtitle, { marginLeft: spacing.sm }]}>Invoice</Text>
                </Pressable>
                <Pressable onPress={handlePrint} style={styles.printButton}>
                    <Ionicons name="print-outline" size={24} color={colors.text} />
                </Pressable>
            </View>

            <ScrollView style={styles.container}>
                <View style={styles.paper}>
                    <View style={globalStyles.spaceBetween}>
                        <Text style={styles.logoText}>INVOICE</Text>
                        <Text style={styles.mutedText}>INV-{courier.trackingId}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.grid2}>
                        <View>
                            <Text style={styles.label}>Billed To</Text>
                            <Text style={styles.val}>{courier.senderName}</Text>
                            <Text style={styles.mutedText}>{courier.pickupAddress}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.label}>Date</Text>
                            <Text style={styles.val}>{new Date(courier.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>

                    <View style={styles.grid2}>
                        <View>
                            <Text style={styles.label}>Ship To</Text>
                            <Text style={styles.val}>{courier.receiverName}</Text>
                            <Text style={styles.mutedText}>{courier.deliveryAddress}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.label}>Payment</Text>
                            <View style={[styles.statusChip, {
                                backgroundColor: courier.paymentStatus === 'paid' ? '#10B98120' : '#F59E0B20',
                            }]}>
                                <Text style={[styles.statusChipText, {
                                    color: courier.paymentStatus === 'paid' ? '#10B981' : '#F59E0B',
                                }]}>
                                    {(courier.paymentStatus || 'pending').toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[styles.mutedText, { marginTop: 4 }]}>
                                {(courier.paymentMethod || 'cash').charAt(0).toUpperCase() + (courier.paymentMethod || 'cash').slice(1)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.lineItems}>
                        <View style={styles.lineItem}>
                            <Text style={styles.itemDesc}>Base Fare</Text>
                            <Text style={styles.itemPrice}>$10.00</Text>
                        </View>
                        <View style={styles.lineItem}>
                            <Text style={styles.itemDesc}>Weight Charge ({courier.weight || 0}kg × $5)</Text>
                            <Text style={styles.itemPrice}>${((courier.weight || 0) * 5).toFixed(2)}</Text>
                        </View>
                        <View style={styles.lineItem}>
                            <Text style={styles.itemDesc}>Distance Charge ({courier.distance || 0}km × $2)</Text>
                            <Text style={styles.itemPrice}>${((courier.distance || 0) * 2).toFixed(2)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>${(courier.price || 0).toFixed(2)}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    printButton: {
        padding: spacing.sm,
        backgroundColor: colors.surfaceElevated,
        borderRadius: 8,
    },
    paper: {
        backgroundColor: 'white',
        borderRadius: 4,
        padding: spacing.xl,
        marginTop: spacing.sm,
        minHeight: 400,
    },
    logoText: {
        color: '#111',
        fontSize: fontSize.xl,
        fontWeight: '800',
        letterSpacing: 2,
    },
    mutedText: {
        color: '#666',
        fontSize: fontSize.sm,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: spacing.xl,
    },
    grid2: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    label: {
        color: '#888',
        fontSize: fontSize.xs,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    val: {
        color: '#111',
        fontSize: fontSize.md,
        fontWeight: '600',
    },
    lineItems: {
        marginTop: spacing.lg,
    },
    lineItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    itemDesc: {
        color: '#333',
    },
    itemPrice: {
        color: '#111',
        fontWeight: '500',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 2,
        borderTopColor: '#111',
    },
    totalLabel: {
        color: '#111',
        fontSize: fontSize.lg,
        fontWeight: 'bold',
    },
    totalValue: {
        color: '#111',
        fontSize: fontSize.xl,
        fontWeight: '800',
    },
    statusChip: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 6,
        marginTop: 4,
    },
    statusChipText: {
        fontSize: fontSize.xs,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
