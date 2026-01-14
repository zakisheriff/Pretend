import { useGameStore } from '@/store/gameStore';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

const isHapticsEnabled = () => {
    try {
        return useGameStore.getState().settings.hapticsEnabled;
    } catch (e) {
        return true; // Fallback if store not ready
    }
};

export const haptics = {
    // Light feedback for subtle interactions
    // On Android, use selection feedback for crisp "dip" feel (like keyboard taps)
    light: () => {
        if (!isHapticsEnabled()) return;
        if (isAndroid) {
            return Haptics.selectionAsync();
        }
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },

    // Medium feedback for selections
    // On Android, use selection for cleaner feel
    medium: () => {
        if (!isHapticsEnabled()) return;
        if (isAndroid) {
            return Haptics.selectionAsync();
        }
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },

    // Heavy feedback for important actions
    // On Android, use soft impact to avoid buzzy feel
    heavy: () => {
        if (!isHapticsEnabled()) return;
        if (isAndroid) {
            return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },

    // Notification feedbacks - these work well on both platforms
    warning: () => {
        if (!isHapticsEnabled()) return;
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    success: () => {
        if (!isHapticsEnabled()) return;
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    error: () => {
        if (!isHapticsEnabled()) return;
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },

    // Selection feedback - already optimal for Android (like keyboard taps)
    selection: () => {
        if (!isHapticsEnabled()) return;
        return Haptics.selectionAsync();
    },

    // Custom patterns - optimized for each platform
    imposterReveal: async () => {
        if (!isHapticsEnabled()) return;
        if (isAndroid) {
            // Quick crisp taps on Android
            await Haptics.selectionAsync();
            await new Promise(resolve => setTimeout(resolve, 80));
            await Haptics.selectionAsync();
            await new Promise(resolve => setTimeout(resolve, 80));
            await Haptics.selectionAsync();
        } else {
            // Dramatic reveal on iOS
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(resolve => setTimeout(resolve, 100));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await new Promise(resolve => setTimeout(resolve, 100));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
    },

    countdown: async () => {
        if (!isHapticsEnabled()) return;
        // Crisp tick on both platforms
        if (isAndroid) {
            await Haptics.selectionAsync();
        } else {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    },

    gameStart: async () => {
        if (!isHapticsEnabled()) return;
        if (isAndroid) {
            // Quick sequence on Android
            await Haptics.selectionAsync();
            await new Promise(resolve => setTimeout(resolve, 100));
            await Haptics.selectionAsync();
            await new Promise(resolve => setTimeout(resolve, 100));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            // Full fanfare on iOS
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(resolve => setTimeout(resolve, 150));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(resolve => setTimeout(resolve, 150));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    },
};
