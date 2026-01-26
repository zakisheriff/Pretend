import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

interface GenericModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    isDestructive?: boolean;
}

export const GenericModal: React.FC<GenericModalProps> = ({
    visible,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    isDestructive = false
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Ionicons
                            name={isDestructive ? "alert-circle" : "information-circle"}
                            size={32}
                            color={isDestructive ? Colors.suspect : Colors.candlelight}
                        />
                        <Text style={styles.title}>{title}</Text>
                    </View>

                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.actions}>
                        {onCancel && (
                            <Button
                                title={cancelLabel}
                                onPress={onCancel}
                                variant="outline"
                                size="small"
                                style={styles.cancelBtn}
                            />
                        )}
                        <Button
                            title={confirmLabel}
                            onPress={onConfirm}
                            variant="primary"
                            size="small"
                            style={[
                                styles.confirmBtn,
                                isDestructive && { backgroundColor: Colors.suspect, borderColor: Colors.suspect }
                            ]}
                            textStyle={isDestructive ? { color: Colors.parchment } : undefined}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: Colors.grayDark,
        borderRadius: 25,
        padding: 24,
        borderWidth: 2,
        borderColor: Colors.grayMedium,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.parchment,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 15,
        color: Colors.candlelight,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
    },
    confirmBtn: {
        flex: 1,
    },
});
