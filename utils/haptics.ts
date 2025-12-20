import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

export const haptics = {
    // Light feedback for subtle interactions
    // On Android, use selection feedback for crisp "dip" feel (like keyboard taps)
    light: () => {
        if (isAndroid) {
            return Haptics.selectionAsync();
        }
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },

    // Medium feedback for selections
    // On Android, use selection for cleaner feel
    medium: () => {
        if (isAndroid) {
            return Haptics.selectionAsync();
        }
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },

    // Heavy feedback for important actions
    // On Android, use soft impact to avoid buzzy feel
    heavy: () => {
        if (isAndroid) {
            return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },

    // Notification feedbacks - these work well on both platforms
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

    // Selection feedback - already optimal for Android (like keyboard taps)
    selection: () => Haptics.selectionAsync(),

    // Custom patterns - optimized for each platform
    imposterReveal: async () => {
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
        // Crisp tick on both platforms
        if (isAndroid) {
            await Haptics.selectionAsync();
        } else {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    },

    gameStart: async () => {
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
