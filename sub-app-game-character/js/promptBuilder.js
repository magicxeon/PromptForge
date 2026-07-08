/**
 * promptBuilder.js
 * Convert Character Object -> AI Prompt
 */



function add(tags, value) {

    if (!value) return;

    if (Array.isArray(value)) {

        value.forEach(v => add(tags, v));

        return;
    }

    tags.push(value);

}

function buildRankPrompt(character) {

    return [

        "minimal mobile game interface",

        "single character selection screen",

        "small white rank badge",

        "top left corner",

        `Rank ${character.rank}`,

        `${character.rankColor} metallic text`,

        `${character.rankColor} glowing text`,

        "simple white typography",

        "small UI element",

        "minimal overlay",

        "only rank label",

        "no character stats",

        "no HP",

        "no MP",

        "no EXP",

        "no level",

        "no ATK",

        "no DEF",

        "no inventory",

        "no skill icons",

        "no dialogue box",

        "no large UI panel",

        "do not cover the character",

        "character remains the main focus"

    ];

}

export function buildPrompt(character) {

    const tags = [];

    add(tags, character.quality);

    add(tags, character.style);

    add(tags, "AAA game splash art");

    add(tags, "semi realistic");

    add(tags, character.gender);

    add(tags, character.age);

    add(tags, character.ethnicity);

    add(tags, character.body);

    add(tags, "doll-like beauty");

    add(tags, "idol-like beauty");

    add(tags, "fashion model proportions");

    add(tags, "stylized body proportions");

    add(tags, "long elegant legs");

    add(tags, "small waist");

    add(tags, "luxury costume");

    add(tags, "premium costume details");

    add(tags, character.face);

    add(tags, character.hair);

    add(tags, character.outfit);

    add(tags, character.weapon);

    add(tags, character.pose);

    add(tags, character.scene);

    add(tags, buildRankPrompt(character));

    add(tags, "full body");

    add(tags, "center composition");

    add(tags, "leave space above head");

    add(tags, "leave space below feet");

    add(tags, "no crop");

    add(tags, "cinematic lighting");

    add(tags, "volumetric lighting");

    add(tags, "AAA mobile game character");

    add(tags, "hero splash art");

    add(tags, "gacha game character");

    add(tags, "premium hero illustration");

    add(tags, "stylized realism");

    add(tags, "anime-inspired realism");

    add(tags, "ultra polished illustration");

    add(tags, "high-end digital painting");

    add(tags, "luxury character design");

    add(tags, "semi realistic");

    return [...new Set(tags)].join(", ");

}