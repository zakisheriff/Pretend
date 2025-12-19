import * as Haptics from 'expo-haptics';

export const haptics = {
    // Light feedback for subtle interactions
    light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

    // Medium feedback for selections
    medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

    // Heavy feedback for important actions
    heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

    // Notification feedbacks
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

    // Selection feedback
    selection: () => Haptics.selectionAsync(),

    // Custom patterns
    imposterReveal: async () => {
        // Dramatic reveal for imposter
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await new Promise(resolve => setTimeout(resolve, 100));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await new Promise(resolve => setTimeout(resolve, 100));
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },

    countdown: async () => {
        // Countdown tick
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },

    gameStart: async () => {
        // Game start fanfare
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await new Promise(resolve => setTimeout(resolve, 150));
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await new Promise(resolve => setTimeout(resolve, 150));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
};
