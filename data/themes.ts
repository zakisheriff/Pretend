import { Theme, ThemeCategory, UndercoverCategory, UndercoverTheme } from '@/types/game';

// Imposter Mode Themes
import actors from './themes/actors.json';
import actresses from './themes/actresses.json';
import animals from './themes/animals.json';
import brands from './themes/brands.json';
import cars from './themes/cars.json';
import directors from './themes/directors.json';
import festivals from './themes/festivals.json';
import foods from './themes/foods.json';
import fruits from './themes/fruits.json';
import hindiMovies from './themes/hindi-movies.json';
import hollywoodMovies from './themes/hollywood-movies.json';
import objects from './themes/objects.json';
import places from './themes/places.json';
import professions from './themes/professions.json';
import songs from './themes/songs.json';
import sports from './themes/sports.json';
import superheroes from './themes/superheroes.json';
import tamilMovies from './themes/tamil-movies.json';
import youtubers from './themes/youtubers.json';


// Undercover Mode Themes (Paired)
import uActors from './undercover/actors.json';
import uActresses from './undercover/actresses.json';
import uAnimals from './undercover/animals.json';
import uBrands from './undercover/brands.json';
import uCars from './undercover/cars.json';
import uDirectors from './undercover/directors.json';
import uFestivals from './undercover/festivals.json';
import uFoods from './undercover/foods.json';
import uFruits from './undercover/fruits.json';
import uGeneral from './undercover/general.json';
import uHindiMovies from './undercover/hindi-movies.json';
import uHollywoodMovies from './undercover/hollywood-movies.json';
import uLifestyle from './undercover/lifestyle.json';
import uObjects from './undercover/objects.json';
import uPlaces from './undercover/places.json';
import uSongs from './undercover/songs.json';
import uSports from './undercover/sports.json';
import uTamilMovies from './undercover/tamil-movies.json';
import uYoutubers from './undercover/youtubers.json';

export const categories: ThemeCategory[] = [
    {
        id: 'movies',
        name: 'Movies',
        icon: 'videocam-outline',
        themes: [tamilMovies, hindiMovies, hollywoodMovies, directors, superheroes] as Theme[]
    },
    {
        id: 'celebrities',
        name: 'Celebrities',
        icon: 'people-outline',
        themes: [youtubers, actors, actresses] as Theme[]
    },
    {
        id: 'lifestyle',
        name: 'Lifestyle',
        icon: 'cafe-outline',
        themes: [foods, fruits, festivals, songs, professions] as Theme[]
    },
    {
        id: 'general',
        name: 'General',
        icon: 'grid-outline',
        themes: [animals, places, objects, brands, sports, cars] as Theme[]
    }
];

export const undercoverCategories: UndercoverCategory[] = [
    {
        id: 'movies',
        name: 'Movies',
        icon: 'videocam-outline',
        themes: [uTamilMovies, uHindiMovies, uHollywoodMovies, uDirectors] as UndercoverTheme[]
    },
    {
        id: 'celebrities',
        name: 'Celebrities',
        icon: 'people-outline',
        themes: [uYoutubers, uActors, uActresses] as UndercoverTheme[]
    },
    {
        id: 'lifestyle',
        name: 'Lifestyle',
        icon: 'cafe-outline',
        themes: [uFoods, uFruits, uFestivals, uSongs, uLifestyle] as UndercoverTheme[]
    },
    {
        id: 'general',
        name: 'General',
        icon: 'grid-outline',
        themes: [uAnimals, uPlaces, uObjects, uBrands, uSports, uCars, uGeneral] as UndercoverTheme[]
    }
];

// Flattened themes for backward compatibility and easy lookup
export const themes: Theme[] = categories.flatMap(cat => cat.themes);
export const undercoverThemes: UndercoverTheme[] = undercoverCategories.flatMap(cat => cat.themes);

export const getThemeById = (id: string): Theme | undefined => {
    return themes.find(theme => theme.id === id);
};

export const getUndercoverThemeById = (id: string): UndercoverTheme | undefined => {
    return undercoverThemes.find(theme => theme.id === id);
};

export const getEffectiveTheme = (id: string | null): Theme | undefined => {
    if (!id) return undefined;
    const category = categories.find(cat => cat.id === id);
    if (category) {
        // Pick random theme from category
        const randomIndex = Math.floor(Math.random() * category.themes.length);
        return category.themes[randomIndex];
    }
    return getThemeById(id);
};

export const getEffectiveUndercoverTheme = (id: string | null): UndercoverTheme | undefined => {
    if (!id) return undefined;
    const category = undercoverCategories.find(cat => cat.id === id);
    if (category) {
        const randomIndex = Math.floor(Math.random() * category.themes.length);
        return category.themes[randomIndex];
    }
    return getUndercoverThemeById(id);
};

export const getRandomWord = (theme: Theme): typeof theme.words[0] | null => {
    if (theme.words.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * theme.words.length);
    return theme.words[randomIndex];
};
