import React from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export const generateAndShareInvoice = async (courier: any, invoiceNumber: string) => {
    const isExpress = courier.deliveryType === 'express';
    
    // MATCH BACKEND CONSTANTS
    const BASE_FARE = 50;
    const WEIGHT_RATE = 10;
    const DISTANCE_RATE = 5;

    const subtotal = (courier.weight || 0) * WEIGHT_RATE + (courier.distance || 0) * DISTANCE_RATE + BASE_FARE;
    const expressSurcharge = isExpress ? subtotal * 0.5 : 0;
    const calculatedTotal = subtotal + expressSurcharge;
    const paymentStatus = courier.paymentStatus === 'paid' ? 'PAID' : 'PENDING';

    const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
            .invoice-title { font-size: 32px; font-weight: bold; margin-top: 10px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .box { flex: 1; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background-color: #f8f9fa; font-weight: bold; }
            .total { text-align: right; font-size: 20px; font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
            .surcharge { color: #e67e22; font-weight: bold; }
            .status-box { font-weight: bold; padding: 5px; border: 1px solid #333; display: inline-block; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
            <div class="logo">COURIER MANAGER</div>
            <div class="invoice-title">INVOICE</div>
            <div>Invoice #: ${invoiceNumber}</div>
            <div>Date: ${new Date(courier.createdAt).toLocaleDateString()}</div>
            <div class="status-box">STATUS: ${paymentStatus}</div>
        </div>

        <div class="details">
            <div class="box">
                <strong>Bill To:</strong><br>
                ${courier.senderName}<br>
                ${courier.pickupAddress}
            </div>
            <div class="box" style="text-align: right;">
                <strong>Ship To:</strong><br>
                ${courier.receiverName}<br>
                ${courier.deliveryAddress}<br>
                Phone: ${courier.receiverPhone}
            </div>
        </div>

        <table class="table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Base Fare</td>
                    <td>₹${BASE_FARE.toFixed(2)}</td>
                    <td>₹${BASE_FARE.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Shipping Charges (Weight: ${courier.weight || 0}kg)</td>
                    <td>₹${WEIGHT_RATE.toFixed(2)}/kg</td>
                    <td>₹${((courier.weight || 0) * WEIGHT_RATE).toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Distance Charges (${Math.round(courier.distance || 0)}km)</td>
                    <td>₹${DISTANCE_RATE.toFixed(2)}/km</td>
                    <td>₹${((courier.distance || 0) * DISTANCE_RATE).toFixed(2)}</td>
                </tr>
                ${isExpress ? `
                <tr>
                    <td class="surcharge">Express Delivery Surcharge (50%)</td>
                    <td>-</td>
                    <td class="surcharge">₹${expressSurcharge.toFixed(2)}</td>
                </tr>
                ` : ''}
            </tbody>
        </table>

        <div class="total">
            Total: ₹${calculatedTotal.toFixed(2)}
        </div>

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>Tracking ID: ${courier.trackingId} | Payment Status: ${paymentStatus}</p>
        </div>
      </body>
    </html>
    `;

    try {
        const { uri } = await Print.printToFileAsync({ html });
        if (Platform.OS === 'web') {
            const pdfWindow = window.open(uri);
            if (!pdfWindow) {
                window.alert('Please allow popups to view the invoice.');
            }
        } else {
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        }
    } catch (error) {
        if (Platform.OS === 'web') window.alert('Failed to generate invoice');
        else Alert.alert('Error', 'Failed to generate invoice');
        console.error(error);
    }
};
