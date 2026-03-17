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
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    if (!courier) return <LoadingState message="Loading invoice..." />;

    // Pricing Constants (Should match convex/couriers.ts)
    const BASE_RATE = 100; 
    const WEIGHT_RATE = 10; 
    const DISTANCE_RATE = 3; 

    const weightCharge = (courier.weight || 0) * WEIGHT_RATE;
    const distanceCharge = (courier.distance || 0) * DISTANCE_RATE;
    const subtotal = BASE_RATE + weightCharge + distanceCharge;
    
    const isExpress = courier.deliveryType === 'express';
    const expressSurcharge = isExpress ? subtotal * 0.5 : 0;
    
    const taxableAmount = subtotal + expressSurcharge;
    const gstAmount = taxableAmount * 0.18; // 18% GST (Updated)
    const totalAmount = taxableAmount + gstAmount;

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
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; line-height: 1.4; }
                        .container { max-width: 800px; margin: 0 auto; background: #fff; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #f0f0f0; padding-bottom: 20px; }
                        .title-section h1 { font-size: 28px; font-weight: 800; margin: 0; color: #1a1a1a; letter-spacing: -0.5px; }
                        .status-badge { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
                        .paid { background: #e6fcf5; color: #0ca678; border: 1px solid #0ca678; }
                        .unpaid { background: #fff9db; color: #f08c00; border: 1px solid #f08c00; }
                        
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
                        .info-box h3 { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                        .info-box p { margin: 2px 0; font-size: 14px; font-weight: 500; }
                        
                        .tracking-banner { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e9ecef; }
                        .tracking-id { font-family: monospace; font-size: 18px; font-weight: bold; color: #228be6; }
                        
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th { text-align: left; padding: 12px; background: #1a1a1a; color: #fff; font-size: 13px; text-transform: uppercase; }
                        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
                        .text-right { text-align: right; }
                        
                        .summary-section { display: flex; justify-content: flex-end; }
                        .summary-table { width: 300px; }
                        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
                        .summary-row.total { border-top: 2px solid #1a1a1a; margin-top: 10px; padding-top: 15px; font-weight: 800; font-size: 20px; color: #1a1a1a; }
                        .gst-row { color: #666; font-style: italic; }
                        
                        .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #adb5bd; font-size: 11px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="title-section">
                                <h1>TAX INVOICE</h1>
                                <div class="status-badge ${isPaid ? 'paid' : 'unpaid'}">${(courier.paymentStatus || 'pending').toUpperCase()}</div>
                            </div>
                            <div style="text-align: right">
                                <h2 style="margin:0; font-size: 18px;">COURIER EXPRESS</h2>
                                <p style="margin:2px 0; font-size: 12px; color: #666;">Premium Logistics Solutions</p>
                                <p style="margin:2px 0; font-size: 12px; color: #666;">GSTIN: 27AAACC4119D1Z5</p>
                            </div>
                        </div>

                        <div class="tracking-banner">
                            <div>
                                <span style="font-size: 12px; color: #888; text-transform: uppercase; display: block;">Tracking Number</span>
                                <span class="tracking-id">${courier.trackingId}</span>
                            </div>
                            <div style="text-align: right">
                                <span style="font-size: 12px; color: #888; text-transform: uppercase; display: block;">Date of Booking</span>
                                <span style="font-weight: bold;">${new Date(courier.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                            </div>
                        </div>

                        <div class="info-grid">
                            <div class="info-box">
                                <h3>From (Consigner)</h3>
                                <p style="font-size: 16px; color: #1a1a1a;">${courier.senderName}</p>
                                <p>${courier.senderPhone}</p>
                                <p style="color: #666; font-weight: normal; margin-top: 5px;">${courier.pickupAddress}</p>
                            </div>
                            <div class="info-box">
                                <h3>To (Consignee)</h3>
                                <p style="font-size: 16px; color: #1a1a1a;">${courier.receiverName}</p>
                                <p>${courier.receiverPhone}</p>
                                <p style="color: #666; font-weight: normal; margin-top: 5px;">${courier.deliveryAddress}</p>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Service Description</th>
                                    <th class="text-right">Quantity</th>
                                    <th class="text-right">Unit Rate</th>
                                    <th class="text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Base Shipping Fee</td>
                                    <td class="text-right">1 Unit</td>
                                    <td class="text-right">₹${BASE_RATE.toFixed(2)}</td>
                                    <td class="text-right">₹${BASE_RATE.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td>Weight Charges (Slab: ₹${WEIGHT_RATE}/kg)</td>
                                    <td class="text-right">${courier.weight || 0} kg</td>
                                    <td class="text-right">₹${WEIGHT_RATE.toFixed(2)}</td>
                                    <td class="text-right">₹${weightCharge.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td>Distance Charges (Slab: ₹${DISTANCE_RATE}/km)</td>
                                    <td class="text-right">${courier.distance || 0} km</td>
                                    <td class="text-right">₹${DISTANCE_RATE.toFixed(2)}</td>
                                    <td class="text-right">₹${distanceCharge.toFixed(2)}</td>
                                </tr>
                                ${isExpress ? `
                                <tr>
                                    <td style="color: #e67e22; font-weight: bold;">Express Delivery Surcharge (Priority)</td>
                                    <td class="text-right">1</td>
                                    <td class="text-right">50%</td>
                                    <td class="text-right" style="color: #e67e22;">₹${expressSurcharge.toFixed(2)}</td>
                                </tr>
                                ` : ''}
                            </tbody>
                        </table>

                        <div class="summary-section">
                            <div class="summary-table">
                                <div class="summary-row">
                                    <span>Taxable Value</span>
                                    <span>₹${taxableAmount.toFixed(2)}</span>
                                </div>
                                <div class="summary-row gst-row">
                                    <span>GST (18%)</span>
                                    <span>₹${gstAmount.toFixed(2)}</span>
                                </div>
                                <div class="summary-row total">
                                    <span>Total Amount</span>
                                    <span>₹${totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div class="footer">
                            <p>This is a computer generated invoice and does not require a physical signature.</p>
                            <p>&copy; ${new Date().getFullYear()} Courier Express Inc. All rights reserved.</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
    };

    const handleShare = async () => {
        setIsSharing(true);
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
        } finally {
            setIsSharing(true);
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const html = generateHtml();
            const { uri } = await Print.printToFileAsync({ html });
            
            if (Platform.OS === 'android') {
                // @ts-ignore
                const saf = FileSystem.StorageAccessFramework;
                if (saf) {
                    const permissions = await saf.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                        const fileName = `Invoice-${courier.trackingId}.pdf`;
                        const savedUri = await saf.createFileAsync(
                            permissions.directoryUri, 
                            fileName, 
                            'application/pdf'
                        );
                        await FileSystem.writeAsStringAsync(savedUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                        Alert.alert('Success', `Invoice saved as ${fileName}`);
                    }
                } else {
                    // Fallback to sharing if SAF is unavailable
                    await Sharing.shareAsync(uri, {
                        UTI: '.pdf',
                        mimeType: 'application/pdf',
                        dialogTitle: `Download-Invoice-${courier.trackingId}`
                    });
                }
            } else if (Platform.OS === 'web') {
                await Print.printAsync({ html });
            } else {
                await Sharing.shareAsync(uri, {
                    UTI: '.pdf',
                    mimeType: 'application/pdf',
                    dialogTitle: `Download-Invoice-${courier.trackingId}`
                });
            }
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to process download');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={globalStyles.row}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                    <Text style={[globalStyles.subtitle, { marginLeft: spacing.sm }]}>Invoice</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Pressable onPress={handleDownload} disabled={isDownloading} style={[styles.actionButton, isDownloading && { opacity: 0.5 }]}>
                        <Ionicons name={isDownloading ? "hourglass-outline" : "cloud-download-outline"} size={22} color={colors.text} />
                    </Pressable>
                    <Pressable onPress={handleShare} disabled={isSharing} style={[styles.actionButton, isSharing && { opacity: 0.5 }]}>
                        <Ionicons name={isSharing ? "hourglass-outline" : "share-social"} size={22} color={colors.text} />
                    </Pressable>
                </View>
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.paper}>
                    <View style={globalStyles.spaceBetween}>
                        <View>
                            <Text style={styles.logoText}>TAX INVOICE</Text>
                            {isExpress && (
                                <View style={styles.expressBadge}>
                                    <Ionicons name="flash" size={10} color="#fff" />
                                    <Text style={styles.expressBadgeText}>EXPRESS SHIPMENT</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.mutedText}>INV-{courier.trackingId}</Text>
                            <Text style={[styles.mutedText, { fontSize: 10 }]}>{new Date(courier.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.grid2}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Consigner</Text>
                            <Text style={styles.val}>{courier.senderName}</Text>
                            <Text style={[styles.mutedText, { fontSize: 12 }]}>{courier.pickupAddress}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.label}>Consignee</Text>
                            <Text style={styles.val}>{courier.receiverName}</Text>
                            <Text style={[styles.mutedText, { fontSize: 12, textAlign: 'right' }]}>{courier.deliveryAddress}</Text>
                        </View>
                    </View>

                    <View style={styles.lineItems}>
                        <View style={styles.lineItem}>
                            <View>
                                <Text style={styles.itemDesc}>Base Fare</Text>
                                <Text style={styles.itemSubDesc}>Standard processing fee</Text>
                            </View>
                            <Text style={styles.itemPrice}>₹{BASE_RATE.toFixed(2)}</Text>
                        </View>
                        <View style={styles.lineItem}>
                            <View>
                                <Text style={styles.itemDesc}>Weight Charge</Text>
                                <Text style={styles.itemSubDesc}>{courier.weight || 0} kg × ₹{WEIGHT_RATE}</Text>
                            </View>
                            <Text style={styles.itemPrice}>₹{weightCharge.toFixed(2)}</Text>
                        </View>
                        <View style={styles.lineItem}>
                            <View>
                                <Text style={styles.itemDesc}>Distance Charge</Text>
                                <Text style={styles.itemSubDesc}>{courier.distance || 0} km × ₹{DISTANCE_RATE}</Text>
                            </View>
                            <Text style={styles.itemPrice}>₹{distanceCharge.toFixed(2)}</Text>
                        </View>
                        
                        {isExpress && (
                            <View style={[styles.lineItem, { borderBottomColor: colors.warning + '30' }]}>
                                <View>
                                    <Text style={[styles.itemDesc, { color: colors.warning, fontWeight: 'bold' }]}>Express Surcharge</Text>
                                    <Text style={styles.itemSubDesc}>50% Priority Handling</Text>
                                </View>
                                <Text style={[styles.itemPrice, { color: colors.warning }]}>₹{expressSurcharge.toFixed(2)}</Text>
                            </View>
                        )}

                        <View style={styles.summaryBox}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Taxable Amount</Text>
                                <Text style={styles.summaryValue}>₹{taxableAmount.toFixed(2)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>GST (18%)</Text>
                                <Text style={styles.summaryValue}>₹{gstAmount.toFixed(2)}</Text>
                            </View>
                            <View style={[styles.summaryRow, styles.totalRow]}>
                                <Text style={styles.totalLabel}>Total Payable</Text>
                                <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.paymentInfo}>
                        <View>
                            <Text style={styles.label}>Payment Status</Text>
                            <View style={[styles.statusChip, {
                                backgroundColor: courier.paymentStatus === 'paid' ? '#10B98120' : '#F59E0B20',
                            }]}>
                                <Text style={[styles.statusChipText, {
                                    color: courier.paymentStatus === 'paid' ? '#10B981' : '#F59E0B',
                                }]}>
                                    {(courier.paymentStatus || 'pending').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.label}>Payment Method</Text>
                            <Text style={styles.val}>{(courier.paymentMethod || 'cash').toUpperCase()}</Text>
                        </View>
                    </View>

                    {isAdmin && courier.paymentStatus !== 'paid' && (
                        <Pressable 
                            style={[styles.markAsPaidButton, isUpdating && { opacity: 0.6 }]} 
                            onPress={handleMarkAsPaid}
                            disabled={isUpdating}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.markAsPaidText}>{isUpdating ? 'Updating...' : 'Mark as Paid'}</Text>
                        </Pressable>
                    )}
                </View>
                <View style={{ height: 40 }} />
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
        borderRadius: 16,
        padding: spacing.xl,
        marginTop: spacing.sm,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    logoText: {
        color: '#1a1a1a',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    mutedText: {
        color: colors.textMuted,
        fontSize: fontSize.xs,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: spacing.xl,
    },
    grid2: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
        gap: spacing.md,
    },
    label: {
        color: colors.textMuted,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '700',
        marginBottom: 4,
    },
    val: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    lineItems: {
        marginTop: spacing.md,
    },
    lineItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f9fa',
    },
    itemDesc: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    itemSubDesc: {
        color: colors.textMuted,
        fontSize: 11,
        marginTop: 2,
    },
    itemPrice: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
    },
    summaryBox: {
        marginTop: spacing.xl,
        backgroundColor: '#f8f9fa',
        padding: spacing.lg,
        borderRadius: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    summaryLabel: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    summaryValue: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '600',
    },
    totalRow: {
        marginTop: spacing.sm,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: '#dee2e6',
        marginBottom: 0,
    },
    totalLabel: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    totalValue: {
        color: colors.primary,
        fontSize: 20,
        fontWeight: '900',
    },
    statusChip: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    statusChipText: {
        fontSize: 10,
        fontWeight: '800',
    },
    paymentInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.xl,
        paddingTop: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    expressBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginTop: 6,
        gap: 4,
        alignSelf: 'flex-start',
    },
    expressBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '900',
    },
    markAsPaidButton: {
        marginTop: spacing.xxl,
        backgroundColor: colors.success,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    markAsPaidText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 15,
    },
});

