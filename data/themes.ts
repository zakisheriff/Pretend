import { Theme } from '@/types/game';

import actors from './themes/actors.json';
import animals from './themes/animals.json';
import brands from './themes/brands.json';
import cars from './themes/cars.json';
import directors from './themes/directors.json';
import festivals from './themes/festivals.json';
import foods from './themes/foods.json';
import fruits from './themes/fruits.json';
import objects from './themes/objects.json';
import places from './themes/places.json';
import songs from './themes/songs.json';
import sports from './themes/sports.json';
import tamilMovies from './themes/tamil-movies.json';

export const themes: Theme[] = [
    tamilMovies,
    actors,
    objects,
    places,
    songs,
    foods,
    festivals,
    directors,
    fruits,
    cars,
    brands,
    sports,
    animals,
] as Theme[];

export const getThemeById = (id: string): Theme | undefined => {
    return themes.find(theme => theme.id === id);
};

export const getRandomWord = (theme: Theme): typeof theme.words[0] | null => {
    if (theme.words.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * theme.words.length);
    return theme.words[randomIndex];
};
