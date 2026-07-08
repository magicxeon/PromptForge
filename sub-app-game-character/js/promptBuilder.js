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

    add(tags, character.styleThemeTags);

    add(tags, character.gender);

    add(tags, character.age);

    add(tags, character.ethnicity);

    add(tags, character.body);

    const isMale = character.gender === "male";
    const isChibi = character.styleName === "Chibi Cute Style";
    const isPixel = character.styleName === "Retro Pixel Art";
    const isRealistic = character.styleName === "Realistic";

    if (isChibi) {
        add(tags, "chibi proportions");
        add(tags, "cute big head and tiny body");
        add(tags, "adorable features");
    } else if (isPixel) {
        add(tags, "simplified pixel art anatomy");
        add(tags, "low resolution details");
    } else if (isRealistic) {
        add(tags, "natural realistic human proportions");
        add(tags, "natural facial asymmetry");
        add(tags, "practical costume materials");
        add(tags, "realistic fabric textures");
        add(tags, "realistic fabric wrinkles");
        add(tags, "weathered leather");
        add(tags, "realistic embroidery");
    } else {
        if (isMale) {
            add(tags, "handsome masculine features");
            add(tags, "broad shoulders");
            add(tags, "strong jawline");
            add(tags, "athletic muscular proportions");
            add(tags, "luxury costume");
            add(tags, "premium costume details");
        } else {
            add(tags, "doll-like beauty");
            add(tags, "idol-like beauty");
            add(tags, "fashion model proportions");
            add(tags, "stylized body proportions");
            add(tags, "long elegant legs");
            add(tags, "small waist");
            add(tags, "luxury costume");
            add(tags, "premium costume details");
        }
    }

    add(tags, character.face);

    add(tags, character.hair);

    add(tags, character.outfit);

    add(tags, character.weapon);

    add(tags, character.pose);

    add(tags, character.scene);

    add(tags, buildRankPrompt(character));

    // Composition and lighting are dynamically loaded from quality.json themes now

    let finalTags = [...new Set(tags)];

    if (isRealistic) {
        const bannedKeywords = [
            /masterpiece/gi, /best quality/gi, /ultra quality/gi, /insane detail/gi, /hyper realistic/gi,
            /16k/gi, /32k/gi, /8k/gi, /flawless/gi, /perfect face/gi, /perfect skin/gi, /perfect anatomy/gi,
            /perfect symmetry/gi, /aaa game/gi, /splash art/gi, /illustration/gi, /painting/gi, /drawing/gi,
            /100%/gi, /exact/gi, /identical/gi, /must match/gi, /pixel perfect/gi, /without distortion/gi,
            /porcelain skin/gi, /glass skin/gi, /airbrushed skin/gi
        ];
        
        // Filter out tags matching banned patterns
        finalTags = finalTags.filter(tag => {
            const tagLower = tag.toLowerCase();
            return !bannedKeywords.some(regex => regex.test(tagLower));
        });
        
        // Map and replace soft-banned words
        finalTags = finalTags.map(tag => {
            let t = tag;
            t = t.replace(/flawless skin/gi, "natural skin texture with visible pores");
            t = t.replace(/perfect skin/gi, "natural skin texture with visible pores");
            t = t.replace(/flawless/gi, "natural");
            t = t.replace(/porcelain skin/gi, "highly detailed skin texture");
            return t;
        });
    }

    return finalTags.join(", ");

}