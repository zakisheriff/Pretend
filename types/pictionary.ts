export interface PictionaryData {
    round: number;
    drawerId: string;
    word: string | null;  // Null until selected
    wordOptions: string[];
    turnEndTime: number;
    correctGuessers: string[]; // IDs of players who guessed correctly
}

export interface PictionaryPathPoint {
    x: number;
    y: number;
}

export interface PictionaryPath {
    id: string;
    points: PictionaryPathPoint[];
    color: string;
    width: number;
}
