import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { LoadingState, ErrorState } from '../../../src/components';
import { colors, spacing, fontSize, globalStyles } from '../../../src/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/components/auth-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function InvoiceScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const courier = useQuery(api.couriers.getById, { 
        id: id as Id<'couriers'>,
        userId: user?._id as string
    });
    const markAsPaid = useMutation(api.couriers.markAsPaid);
    const [isUpdating, setIsUpdating] = useState(false);

    if (!courier) return <LoadingState message="Loading invoice..." />;

    const isExpress = courier.deliveryType === 'express';
    const subtotal = (courier.weight || 0) * 5 + (courier.distance || 0) * 2 + 10;
    const expressSurcharge = isExpress ? subtotal * 0.5 : 0;

    const handleMarkAsPaid = async () => {
        setIsUpdating(true);
        try {
            await markAsPaid({ id: courier._id });
            Alert.alert('Success', 'Payment status updated to PAID.');
        } catch (error) {
            Alert.alert('Error', 'Failed to update payment status.');
        } finally {
            setIsUpdating(false);
        }
    };

    // Generate HTML for printing
    const generateHtml = () => {
        const isPaid = courier.paymentStatus === 'paid';
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
                        .surcharge { color: #e67e22; font-weight: bold; }
                        .status-paid { color: #10b981; font-weight: bold; border: 2px solid #10b981; padding: 5px 10px; display: inline-block; margin-top: 10px; }
                        .status-unpaid { color: #f59e0b; font-weight: bold; border: 2px solid #f59e0b; padding: 5px 10px; display: inline-block; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">INVOICE</div>
                        <div class="company">
                            <strong>Courier Manager</strong><br>
                            Logistics Way<br>
                            support@courier.com
                        </div>
                    </div>

                    <div class="details">
                        <div class="row"><span class="label">Invoice No:</span> INV-${courier.trackingId}</div>
                        <div class="row"><span class="label">Date:</span> ${new Date(courier.createdAt).toLocaleDateString()}</div>
                        <div class="row"><span class="label">Tracking ID:</span> ${courier.trackingId}</div>
                        <div class="${isPaid ? 'status-paid' : 'status-unpaid'}">
                            ${(courier.paymentStatus || 'pending').toUpperCase()}
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 30px; margin-top: 20px;">
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
                                <td>₹5.00/kg</td>
                                <td>₹${((courier.weight || 0) * 5).toFixed(2)}</td>
                            </tr>
                             <tr>
                                <td>Distance Charges (${courier.distance}km)</td>
                                <td>1</td>
                                <td>₹2.00/km</td>
                                <td>₹${((courier.distance || 0) * 2).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Base Fee</td>
                                <td>1</td>
                                <td>₹10.00</td>
                                <td>₹10.00</td>
                            </tr>
                            ${isExpress ? `
                            <tr>
                                <td class="surcharge">Express Delivery Surcharge (50%)</td>
                                <td>1</td>
                                <td>-</td>
                                <td class="surcharge">₹${expressSurcharge.toFixed(2)}</td>
                            </tr>
                            ` : ''}
                        </tbody>
                    </table>

                    <div class="total">
                        Total: ₹${(courier.price || 0).toFixed(2)}
                    </div>

                    <div class="footer">
                        Thank you for your business! | Mode: ${(courier.paymentMethod || 'cash').toUpperCase()}
                    </div>
                </body>
            </html>
        `;
    };

    const handleShare = async () => {
        try {
            const html = generateHtml();
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { 
                UTI: '.pdf', 
                mimeType: 'application/pdf',
                dialogTitle: `Invoice-${courier.trackingId}` 
            });
        } catch (error) {
            console.error('Share error:', error);
            Alert.alert('Error', 'Failed to share invoice');
        }
    };

    const handleDownload = async () => {
        try {
            const html = generateHtml();
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, {
                UTI: '.pdf',
                mimeType: 'application/pdf',
                dialogTitle: `Download-Invoice-${courier.trackingId}`
            });
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to prepare download');
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
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Pressable onPress={handleDownload} style={styles.actionButton}>
                        <Ionicons name="download-outline" size={22} color={colors.text} />
                    </Pressable>
                    <Pressable onPress={handleShare} style={styles.actionButton}>
                        <Ionicons name="share-outline" size={22} color={colors.text} />
                    </Pressable>
                </View>
            </View>

            <ScrollView style={styles.container}>
                <View style={styles.paper}>
                    <View style={globalStyles.spaceBetween}>
                        <View>
                            <Text style={styles.logoText}>INVOICE</Text>
                            {isExpress && (
                                <View style={styles.expressBadge}>
                                    <Ionicons name="flash" size={10} color="#fff" />
                                    <Text style={styles.expressBadgeText}>EXPRESS SHIPMENT</Text>
                                </View>
                            )}
                        </View>
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
                            <Text style={styles.itemPrice}>₹10.00</Text>
                        </View>
                        <View style={styles.lineItem}>
                            <Text style={styles.itemDesc}>Weight Charge ({courier.weight || 0}kg × ₹5)</Text>
                            <Text style={styles.itemPrice}>₹{((courier.weight || 0) * 5).toFixed(2)}</Text>
                        </View>
                        <View style={styles.lineItem}>
                            <Text style={styles.itemDesc}>Distance Charge ({courier.distance || 0}km × ₹2)</Text>
                            <Text style={styles.itemPrice}>₹{((courier.distance || 0) * 2).toFixed(2)}</Text>
                        </View>
                        
                        {isExpress && (
                            <View style={[styles.lineItem, { borderBottomColor: colors.warning + '30' }]}>
                                <Text style={[styles.itemDesc, { color: colors.warning, fontWeight: 'bold' }]}>Express Surcharge (50%)</Text>
                                <Text style={[styles.itemPrice, { color: colors.warning }]}>₹{expressSurcharge.toFixed(2)}</Text>
                            </View>
                        )}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>₹{(courier.price || 0).toFixed(2)}</Text>
                        </View>
                    </View>

                    {isAdmin && courier.paymentStatus !== 'paid' && (
                        <Pressable 
                            style={[styles.markAsPaidButton, isUpdating && { opacity: 0.6 }]} 
                            onPress={handleMarkAsPaid}
                            disabled={isUpdating}
                        >
                            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                            <Text style={styles.markAsPaidText}>{isUpdating ? 'Updating...' : 'Mark as Paid'}</Text>
                        </Pressable>
                    )}
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
    actionButton: {
        padding: spacing.sm,
        backgroundColor: colors.surfaceElevated,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
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
    expressBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
        gap: 4,
    },
    expressBadgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    },
    markAsPaidButton: {
        marginTop: spacing.xxl,
        backgroundColor: colors.success,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    markAsPaidText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
