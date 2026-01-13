# <div align="center">Pretend</div>

<div align="center">
<strong>The Ultimate Offline Party Game of Deception</strong>
<br />
<i>Find the odd one out. Trust no one.</i>
</div>

<br />

<div align="center">

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white)

<br />

<img src="assets/images/Neo-Logo.jpeg" width="180" height="180" />

<br />
<br />

**One Phone. Many Secrets. Endless Fun.**
<br />
*A Premium Social Deduction Experience with High-Contrast Neo Noir Aesthetics.*

</div>

---

## 🎮 Game Modes

Pretend features **4 distinct ways to play**, all optimized for a single-phone "pass and play" experience:

### 🕵️‍♂️ Classic Imposter
The classic spy game. Crewmates receive a secret word, while the Imposter only gets a vague clue.
- **Goal**: Crewmates must find the imposter; Imposter must blend in using the clue.

### 🔍 Undercover
Everyone receives a word from a shared theme, but one player has a slightly different word.
- **Goal**: Find the player whose word doesn't quite match the group's descriptions.

### 🎬 Director's Cut
One player is the Director who knows the movie title. Everyone else gets cryptic hints.
- **Goal**: Viewers ask yes/no questions to guess the movie and identify the Director.

### 🧠 Mind Sync
Everyone answers a question, but one player received a slightly different question.
- **Goal**: Compare answers to spot the inconsistency and find the outlier.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Neo Noir UI** | Sleek black-and-white design with elegant candlelight gold accents. |
| **Pass & Play** | Designed for 3-10 players on a single device — no internet required. |
| **Multi-Round Logic** | Modern "Among Us" style elimination. Play until a team actually wins. |
| **Smart Instructions** | Simplified mode selection with on-demand "How to Play" overlays. |
| **Extensive Themes** | 13+ curated categories including Movies, Food, Sports, and more. |
| **Haptic Immersion** | Tactile feedback for every interaction, from reveals to votes. |

---

## 🛠️ Technical Prowess

This app is built with performance and elegance in mind:

- **React Native & Expo**: Cross-platform core with native speed.
- **Zustand State**: Lightweight and predictable game logic management.
- **Reanimated**: Fluid 60fps transitions and interactive reveal animations.
- **Dynamic Themes**: Scalable JSON-based word pairing system.

---

## 📂 Project Structure

```bash
Pretend/
├── app/                    # Expo Router Screens (Navigation Layer)
│   ├── index.tsx           # Premium Home Screen
│   ├── select-mode.tsx     # Simplified Mode Selection
│   ├── add-players.tsx     # Player & Order Management
│   └── results.tsx         # Multi-round Win Conditions
├── store/                  # Game Engine (Zustand)
│   └── gameStore.ts        # Assignment & Evaluation Logic
├── data/
│   ├── themes/             # Classic Mode Word Lists
│   └── undercover/         # Paired Word Data (Undercover Mode)
├── components/             # Atomic UI Components
└── assets/                 # Neo Noir Brand Assets
```

---

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/zakisheriff/Pretend.git

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

### How to Start a Match
1. **Choose Mode**: Pick from the 4 available game styles.
2. **Setup Players**: Add 3-10 player names (ordering matters for the pass!).
3. **Select Theme**: Pick a category or randomize.
4. **Pass & Reveal**: Each player drags up to see their secret role.
5. **Deduce & Vote**: Use the built-in timer to discuss and cast your votes.

---

<div align="center">

### 🎭 Trust No One. Pretend Everything.

Made by **Zaki Sheriff**

[⭐ Star this repo](https://github.com/zakisheriff/Pretend) if you're ready to find the imposter!

</div>
