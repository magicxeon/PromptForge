/**
 * random.js
 * Random utility functions
 */

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(array) {
    if (!array || array.length === 0) {
        return null;
    }

    return array[randomInt(0, array.length - 1)];
}

export function weightedPick(items) {

    if (!items || items.length === 0) {
        return null;
    }

    const totalWeight = items.reduce((sum, item) => {
        return sum + (item.weight || 1);
    }, 0);

    let random = Math.random() * totalWeight;

    for (const item of items) {

        random -= (item.weight || 1);

        if (random <= 0) {
            return item;
        }

    }

    return items[items.length - 1];
}

export function shuffle(array) {

    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [copy[i], copy[j]] = [copy[j], copy[i]];

    }

    return copy;
}

export function chance(percent) {

    return Math.random() * 100 < percent;

}

export function pickMany(array, count) {

    return shuffle(array).slice(0, count);

}
export const RANK_ORDER = {
    S: 5,
    A: 4,
    B: 3,
    C: 2,
    D: 1,
    E: 0
};

export function filterByRank(rank, items) {

    const filtered = items.filter(item => {

        if (!item.minRank) return true;

        return RANK_ORDER[item.minRank] >= RANK_ORDER[rank];

    });

    return filtered.length ? filtered : items;

}