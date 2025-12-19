# IMPOSTER - The Game

> **"One phone. Many secrets."**

Imposter is a high-stakes local multiplayer party game of deduction, deception, and trust. Gather your friends, pass the phone, and find out who among you is lying!

![Imposter Banner](assets/images/icon.png)

## 🎮 How to Play

1.  **Gather Players:** 3 to 10 players needed.
2.  **Pass the Phone:** Each player secretly sees their role.
    *   **Crewmates** see the secret word.
    *   **Imposter(s)** see nothing (or a tricky hint!).
3.  **Discussion:** A timer starts. Ask questions, describe the word, but don't give it away!
4.  **Voting:** Time's up! clear the room and vote for who you think the Imposter is.
5.  **Results:** Did the Crewmates win? Or did the Imposter blend in?

## ✨ Features

*   **📱 Single Device Multiplayer:** Seamless pass-and-play flow.
*   **🎨 Dynamic Themes:** Choose from categories like Food, Places, Tech, and more.
*   **⚙️ Custom Game Settings:**
    *   Adjust **Imposter Count**.
    *   Set **Discussion Time**.
    *   **Hint Difficulty:** Give Imposters no help (Hard) or a subtle clue (Easy).
*   **🗳️ Interactive Voting:** Drag-and-tap voting system.
*   **⚡ Smooth Animations:** Built with Reanimated for a premium feel.
*   **💾 Auto-Save:** Players are saved between rounds for quick replays.

## 🛠️ Tech Stack

*   **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (Expo Router).
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand) for robust game logic.
*   **Animations:** [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/).
*   **Gestures:** [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/).
*   **Design:** Custom component library with a dark, cinematic UI.

## 🚀 Getting Started

1.  **Clone the repo:**
    ```bash
    git clone https://github.com/zakisheriff/Imposter.git
    cd Imposter
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the app:**
    ```bash
    npx expo start
    ```

4.  **Scan & Play:** Scan the QR code with the Expo Go app on your phone (Android/iOS).

## 📂 Project Structure

*   `app/`: Screens and navigation (Expo Router).
*   `components/game/`: Reusable UI components (PlayerCard, Timer, etc.).
*   `store/`: Zustand store (`gameStore.ts`) managing game state.
*   `data/`: Word lists and theme data.
*   `constants/`: App-wide styles and colors.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

---

Made with ❤️ by [Zaki Sheriff](https://github.com/zakisheriff)
