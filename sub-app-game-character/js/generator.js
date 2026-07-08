/**
 * generator.js
 */

import {
    pick,
    weightedPick,
    filterByRank
} from "./random.js";

import { buildPrompt } from "./promptBuilder.js";

const CACHE = {};

async function loadJson(file) {

    if (CACHE[file]) {
        return CACHE[file];
    }

    const response = await fetch(`data/${file}`);

    if (!response.ok) {
        throw new Error(`Cannot load ${file}`);
    }

    CACHE[file] = await response.json();

    return CACHE[file];

}

export async function generateCharacter(forceRank = "", forceStyle = "") {

    const [
        style,
        character,
        hair,
        face,
        outfit,
        weapon,
        pose,
        scene,
        rankData,
        classData,
        factionData,
        paletteData,
        quality
    ] = await Promise.all([

        loadJson("style.json"),
        loadJson("character.json"),
        loadJson("hair.json"),
        loadJson("face.json"),
        loadJson("outfit.json"),
        loadJson("weapon.json"),
        loadJson("pose.json"),
        loadJson("scene.json"),
        loadJson("rank.json"),
        loadJson("class.json"),
        loadJson("faction.json"),
        loadJson("colorPalette.json"),
        loadJson("quality.json")

    ]);

    let rank;

    if (forceRank) {

        rank = rankData.ranks.find(r => r.rank === forceRank);

    } else {

        rank = weightedPick(rankData.ranks);

    }

    const hairObj = pick(
        filterByRank(rank.rank, hair.hair)
    );


    const hairText = [
        hairObj.color,
        hairObj.length,
        hairObj.style
    ].join(", ");


    const faceText = [
        pick(filterByRank(rank.rank, face.beauty))?.value,
        pick(filterByRank(rank.rank, face.faceShape))?.value,
        pick(filterByRank(rank.rank, face.skinTone))?.value,
        pick(filterByRank(rank.rank, face.skinTexture))?.value,
        pick(filterByRank(rank.rank, face.eyes))?.value,
        pick(filterByRank(rank.rank, face.eyeShape))?.value,
        pick(filterByRank(rank.rank, face.eyelashes))?.value,
        pick(filterByRank(rank.rank, face.eyebrows))?.value,
        pick(filterByRank(rank.rank, face.nose))?.value,
        pick(filterByRank(rank.rank, face.lips))?.value,
        pick(face.teeth),
        pick(face.expression),
        pick(face.blush),
        pick(face.freckles),
        pick(face.makeup)
    ].filter(Boolean).join(", ");

    const outfitObj = pick(
        filterByRank(rank.rank, outfit.outfit)
    );

    const outfitText = [
        outfitObj.theme,
        outfitObj.top,
        pick(outfit.neckline),
        pick(outfit.fit),
        pick(outfit.shirtStyle),
        pick(outfit.fabric),
        pick(outfit.details),
        outfitObj.bottom,
        outfitObj.footwear
    ].join(", ");

    const weaponObj = pick(
        filterByRank(rank.rank, weapon.weapon)
    );

    const weaponText = [
        weaponObj.rarity,
        weaponObj.type
    ].join(" ");

    const poseObj = pick(
        filterByRank(rank.rank, pose.pose)
    );
    const poseText = poseObj.name;

    const outfitTheme = outfitObj.theme || "traveler";
    let availableBackgrounds = Array.isArray(scene.background) ? scene.background : (scene.background[outfitTheme] || Object.values(scene.background).flat());
    
    const sceneText = [
        pick(availableBackgrounds),
        pick(scene.effects)
    ].filter(Boolean).join(", ");

        let selectedStyleTheme;
        let selectedStyleName = forceStyle;
        if (forceStyle && style.themes[forceStyle]) {
            selectedStyleTheme = style.themes[forceStyle];
        } else {
            // Pick random key from themes
            const themeKeys = Object.keys(style.themes);
            const randomKey = pick(themeKeys);
            selectedStyleTheme = style.themes[randomKey];
            selectedStyleName = randomKey;
        }
        
        const characterObject = {

        rank: rank.rank,

        rankColor: rank.color,

        gender: pick(character.gender),

        age: pick(character.age),

        ethnicity: pick(character.ethnicity),

        body: pick(filterByRank(rank.rank, character.body)).value,

        hair: hairText,

        face: faceText,

        outfit: outfitText,

        weapon: weaponText,

        pose: poseText,

        scene: sceneText,

        class: pick(
            filterByRank(rank.rank, classData.class)
        ),

        faction: pick(factionData.faction),

        palette: pick(paletteData.palette).name,

        styleName: selectedStyleName,

        styleThemeTags: selectedStyleTheme,

        quality: quality.themes[selectedStyleName] || []

    };

    characterObject.prompt = buildPrompt(characterObject);

    return characterObject;

}

export async function updateCharacterStyle(character, forceStyle) {
    if (!character) return;
    const style = await loadJson("style.json");
    const quality = await loadJson("quality.json");
    
    let selectedStyleTheme;
    let selectedStyleName = forceStyle;
    if (forceStyle && style.themes[forceStyle]) {
        selectedStyleTheme = style.themes[forceStyle];
    } else {
        const themeKeys = Object.keys(style.themes);
        const randomKey = pick(themeKeys);
        selectedStyleTheme = style.themes[randomKey];
        selectedStyleName = randomKey;
    }
    
    character.styleName = selectedStyleName;
    character.styleThemeTags = selectedStyleTheme;
    character.quality = quality.themes[selectedStyleName] || [];
    character.prompt = buildPrompt(character);
    return character;
}