import { Alert, Platform } from 'react-native';

/**
 * Simulates sending real-world notifications (SMS/Email)
 * In a production app, this would call a backend service like Twilio or SendGrid.
 */
export const triggerMockNotification = (
    type: 'SMS' | 'EMAIL',
    recipient: string,
    message: string
) => {
    console.log(`[MOCK ${type}] To: ${recipient} | Msg: ${message}`);

    // Show a visual confirmation in the app
    if (Platform.OS !== 'web') {
        Alert.alert(
            `Mock ${type} Sent`,
            `To: ${recipient}\n\n"${message}"`,
            [{ text: "OK" }]
        );
    } else {
        console.log(`%c[MOCK ${type}] Sent to ${recipient}: ${message}`, 'color: #3498db; font-weight: bold;');
    }
};

export const notifyStatusChange = (
    trackingId: string,
    status: string,
    receiverPhone: string,
    senderName: string
) => {
    const statusText = status.replace(/_/g, ' ').toUpperCase();

    // Notify Receiver via SMS
    triggerMockNotification(
        'SMS',
        receiverPhone,
        `Hello! Your courier ${trackingId} from ${senderName} is now ${statusText}. Track it in the CMS app.`
    );

    // Notify Sender via Email (mock)
    triggerMockNotification(
        'EMAIL',
        'sender@example.com',
        `Update: Your parcel ${trackingId} status has been updated to ${statusText}.`
    );
};
