import React, { useRef } from 'react';
import { View, StyleSheet, Button } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { colors, borderRadius } from '../styles/theme';

interface SignaturePadProps {
    onOK: (signature: string) => void;
    onEmpty: () => void;
}

export const SignaturePad = ({ onOK, onEmpty }: SignaturePadProps) => {
    const ref = useRef<SignatureViewRef>(null);

    const handleOK = (signature: string) => {
        onOK(signature); // Base64 string
    };

    const handleEmpty = () => {
        onEmpty();
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
                    descriptionText="Sign above"
                    clearText="Clear"
                    confirmText="Confirm"
                    webStyle={`
                        .m-signature-pad { box-shadow: none; border: none; } 
                        .m-signature-pad--body { border: none; }
                        .m-signature-pad--footer { display: none; margin: 0px; }
                        body,html { width: 100%; height: 100%; }
                    `}
                    autoClear={true}
                    imageType="image/png"
                />
            </View>
            <View style={styles.actions}>
                <Button title="Clear" onPress={handleClear} color={colors.error} />
                <Button title="Confirm Signature" onPress={handleConfirm} color={colors.primary} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 250,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    pad: {
        flex: 1,
        backgroundColor: 'white', // Signature canvas needs white background usually
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderColor: colors.border,
    },
});
