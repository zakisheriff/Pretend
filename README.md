# <div align="center">Pretend</div>

<div align="center">
<strong>The Ultimate Offline Party Game of Deception</strong>
</div>

<br />

<div align="center">

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<br />

<img src="assets/images/Neo-Logo.jpeg" width="160" height="160" style="border-radius: 25px;" />

<br />
<br />

**One Phone. Many Secrets. Endless Fun.**

*Pass the phone, reveal your role, and find out who among you is pretending!*

</div>

---

## 🎮 Game Modes

Pretend offers **4 unique game modes**, each with its own twist on social deduction:

### 🕵️ Classic Imposter
> *The original spy game experience*

- **Crewmates** receive the secret word
- **Imposter** only gets a clue/hint
- Discuss, deduce, and vote out the imposter!

### 🎬 Director's Cut
> *One knows the movie, others only get hints*

- **Director** knows the full movie title
- **Viewers** receive cryptic hints
- Ask yes/no questions to guess the movie and identify the Director!

### 🧠 Mind Sync
> *Are your answers in sync?*

- Everyone receives a question to answer
- **One player (Outlier)** has a slightly different question
- Compare answers and find who's out of sync!

### 🔍 Undercover
> *Everyone has a word... but one is different*

- All players receive a word from the same theme
- **One player** has a different (but related) word
- Describe your word without revealing it — spot the odd one out!

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **3-10 Players** | Perfect for small gatherings or big parties |
| **13+ Themes** | Movies, Actors, Foods, Places, Sports, and more |
| **Adjustable Difficulty** | Control hint levels (Low, Medium, High) |
| **Interactive Voting** | Smooth drag-and-tap voting system |
| **Victorian UI** | Elegant dark theme with candlelight accents |
| **Haptic Feedback** | Every action feels tactile and responsive |
| **Offline Play** | No internet required — perfect for anywhere |

---

## 🎨 Design Philosophy

<table>
<tr>
<td width="33%">

### 🌙 Dark Mode First
Sleek blacks and warm golds for a premium OLED-friendly experience

</td>
<td width="33%">

### ✨ Victorian Aesthetic
Elegant typography, parchment textures, and candlelight accents

</td>
<td width="33%">

### 🎯 Micro-Interactions
Smooth animations and haptic feedback make every action satisfying

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React Native** | Cross-platform mobile framework |
| **Expo** | Development platform & routing |
| **TypeScript** | Type-safe development |
| **Zustand** | Lightweight state management |
| **Reanimated** | Smooth 60fps animations |
| **Gesture Handler** | Native touch interactions |

---

## 📂 Project Structure

```
Pretend/
├── app/                    # Screens (Expo Router)
│   ├── index.tsx           # Home screen
│   ├── select-mode.tsx     # Game mode selection
│   ├── add-players.tsx     # Player management
│   ├── select-theme.tsx    # Theme selection
│   ├── game-settings.tsx   # Difficulty settings
│   ├── role-reveal.tsx     # Role reveal cards
│   ├── discussion.tsx      # Timer & discussion
│   ├── voting.tsx          # Voting interface
│   └── results.tsx         # Game results
├── components/
│   ├── game/               # Game-specific components
│   └── common/             # Reusable UI components
├── store/
│   └── gameStore.ts        # Zustand game state
├── data/
│   ├── themes/             # Word lists (13+ themes)
│   └── modes/              # Mode-specific data
├── constants/
│   └── colors.ts           # Victorian color palette
└── assets/
    └── images/             # Icons & graphics
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app on your phone

### Installation

```bash
# Clone the repository
git clone https://github.com/zakisheriff/Pretend.git
cd Pretend

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Play

1. Scan the QR code with Expo Go
2. Select a game mode
3. Add 3-10 players
4. Choose a theme
5. Pass the phone and start pretending!

---

## 🎯 How to Play

1. **Setup** — Add player names and choose a game mode
2. **Theme** — Select from categories like Movies, Food, or Places
3. **Reveal** — Each player secretly views their role by dragging the card
4. **Discuss** — Talk, question, and try to find the odd one out
5. **Vote** — Eliminate who you think is pretending
6. **Results** — See who won and play again!

---

## 📱 Screenshots

<div align="center">
<i>Coming soon...</i>
</div>

---

## 🗺️ Roadmap

- [ ] Online multiplayer support
- [ ] Custom word/theme creation
- [ ] Achievement system
- [ ] More game modes
- [ ] Localization (multiple languages)

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### 🎭 Trust No One. Pretend Everything.

<br />

Made with by **Zaki Sheriff**

<br />

[⭐ Star this repo](https://github.com/zakisheriff/Pretend) if you enjoyed playing!

</div>
