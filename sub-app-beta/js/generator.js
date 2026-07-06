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

export async function generateCharacter(forceRank = "") {

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

        pick(face.beauty),

        pick(face.faceShape),

        pick(face.skinTone),

        pick(face.skinTexture),

        pick(face.eyes),

        pick(face.eyeShape),

        pick(face.eyelashes),

        pick(face.eyebrows),

        pick(face.nose),

        pick(face.lips),

        pick(face.teeth),

        pick(face.expression),

        pick(face.blush),

        pick(face.freckles),

        pick(face.makeup)

    ].join(", ");

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

    const sceneText = [
        pick(scene.background),
        pick(scene.effects)

    ].join(", ");

    const characterObject = {

        rank: rank.rank,

        rankColor: rank.color,

        gender: pick(character.gender),

        age: pick(character.age),

        ethnicity: pick(character.ethnicity),

        body: pick(character.body),

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

        style: pick(style.rendering),

        quality: quality.tags

    };

    characterObject.prompt = buildPrompt(characterObject);

    return characterObject;

}