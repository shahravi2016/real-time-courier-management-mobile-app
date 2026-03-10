import React, { useRef } from 'react';
import { View, StyleSheet, Button, Pressable, Text } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { colors, borderRadius } from '../styles/theme';

interface SignaturePadProps {
    onOK: (signature: string) => void;
    onEmpty?: () => void;
}

export const SignaturePad = ({ onOK, onEmpty }: SignaturePadProps) => {
    const ref = useRef<SignatureViewRef>(null);

    const handleOK = (signature: string) => {
        onOK(signature); // Base64 string
    };

    const handleEmpty = () => {
        if (onEmpty) onEmpty();
    };

    const handleClear = () => {
        ref.current?.clearSignature();
    };

    const handleConfirm = () => {
        ref.current?.readSignature();
    };

    return (
        <View style={styles.container}>
            <View style={styles.pad}>
                <SignatureScreen
                    ref={ref}
                    onOK={handleOK}
                    onEmpty={handleEmpty}
                    autoClear={false}
                    imageType="image/png"
                    backgroundColor="#FFFFFF"
                    penColor="#000000"
                    minWidth={2}
                    maxWidth={4}
                    style={{ backgroundColor: '#FFFFFF', flex: 1 }}
                    containerStyle={{ backgroundColor: '#FFFFFF', flex: 1 }}
                    webStyle={`
                        .m-signature-pad { background-color: #FFFFFF !important; border: none !important; box-shadow: none !important; }
                        .m-signature-pad--body { background-color: #FFFFFF !important; border: none !important; }
                        canvas { background-color: #FFFFFF !important; }
                        .m-signature-pad--footer { display: none !important; }
                        body, html { background-color: #FFFFFF !important; }
                    `}
                />
            </View>
            <View style={styles.actions}>
                <Pressable style={styles.clearBtn} onPress={handleClear}>
                    <Text style={styles.clearBtnText}>CLEAR PAD</Text>
                </Pressable>
                <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
                    <Text style={styles.confirmBtnText}>USE SIGNATURE</Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 350,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.border,
        marginVertical: 12,
    },
    pad: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    actions: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#F1F5F9',
        gap: 12,
    },
    clearBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.error,
    },
    clearBtnText: {
        color: colors.error,
        fontWeight: 'bold',
        fontSize: 12,
    },
    confirmBtn: {
        flex: 2,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
});
