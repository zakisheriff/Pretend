import { GenericModal } from '@/components/common/GenericModal';
import React, { useCallback, useState } from 'react';
import { Alert, AlertButton, Platform } from 'react-native';

interface AlertState {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    isDestructive: boolean;
}

export const useCustomAlert = () => {
    const [alertState, setAlertState] = useState<AlertState>({
        visible: false,
        title: '',
        message: '',
        confirmLabel: 'OK',
        onConfirm: () => { },
        isDestructive: false,
    });

    const hideAlert = useCallback(() => {
        setAlertState(prev => ({ ...prev, visible: false }));
    }, []);

    const showAlert = useCallback((
        title: string,
        message: string,
        buttons?: AlertButton[]
    ) => {
        if (Platform.OS === 'ios') {
            Alert.alert(title, message, buttons);
            return;
        }

        // Map standard Alert buttons to GenericModal props
        if (!buttons || buttons.length === 0) {
            // Default single OK button
            setAlertState({
                visible: true,
                title,
                message,
                confirmLabel: 'OK',
                onConfirm: hideAlert,
                isDestructive: false,
            });
            return;
        }

        if (buttons.length === 1) {
            // Single button -> Confirm
            const btn = buttons[0];
            setAlertState({
                visible: true,
                title,
                message,
                confirmLabel: btn.text || 'OK',
                onConfirm: () => {
                    btn.onPress?.();
                    hideAlert();
                },
                isDestructive: btn.style === 'destructive',
            });
        } else {
            // Two or more buttons -> Assume [Cancel, Confirm] pattern common in RN
            // Find cancel/destructive buttons
            const cancelBtn = buttons.find(b => b.style === 'cancel') || buttons[0];
            const confirmBtn = buttons.find(b => b.style !== 'cancel') || buttons[1] || buttons[0];

            setAlertState({
                visible: true,
                title,
                message,
                confirmLabel: confirmBtn.text || 'Confirm',
                cancelLabel: cancelBtn.text || 'Cancel',
                onConfirm: () => {
                    confirmBtn.onPress?.();
                    hideAlert();
                },
                onCancel: () => {
                    cancelBtn.onPress?.();
                    hideAlert();
                },
                isDestructive: confirmBtn.style === 'destructive',
            });
        }
    }, [hideAlert]);

    const AlertComponent = () => (
        <GenericModal
            visible={alertState.visible}
            title={alertState.title}
            message={alertState.message}
            confirmLabel={alertState.confirmLabel}
            cancelLabel={alertState.cancelLabel}
            onConfirm={alertState.onConfirm}
            onCancel={alertState.onCancel}
            isDestructive={alertState.isDestructive}
        />
    );

    return { showAlert, AlertComponent };
};
