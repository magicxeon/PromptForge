/**
 * app.js
 */

import { generateCharacter, updateCharacterStyle } from "./generator.js";
import {
    renderCharacter,
    renderPrompt,
    clearUI
} from "./ui.js";

import {
    copyPrompt,
    exportJSON
} from "./export.js";

let currentCharacter = null;

const btnGenerate = document.getElementById("generateBtn");
const btnCopy = document.getElementById("copyBtn");
const btnExport = document.getElementById("exportBtn");
const rankFilter = document.getElementById("rankFilter");
const styleFilter = document.getElementById("styleFilter");

async function generate() {

    try {

        clearUI();

        btnGenerate.disabled = true;
        btnGenerate.textContent = "Generating...";

        currentCharacter = await generateCharacter(
            rankFilter.value,
            styleFilter.value
        );

        renderCharacter(currentCharacter);

        renderPrompt(currentCharacter.prompt);

    }
    catch (error) {

        console.error(error);

        await AppDialog.alert(error.message, { title: "Generation Error" });

    }
    finally {

        btnGenerate.disabled = false;

        btnGenerate.textContent = "Generate";

    }

}

btnGenerate.addEventListener("click", generate);

styleFilter.addEventListener("change", async () => {
    if (!currentCharacter) return;
    currentCharacter = await updateCharacterStyle(currentCharacter, styleFilter.value);
    renderCharacter(currentCharacter);
    renderPrompt(currentCharacter.prompt);
});

btnCopy.addEventListener("click", async () => {

    if (!currentCharacter) {

        await AppDialog.alert("Generate character first.", { title: "Character Required" });

        return;

    }

    copyPrompt(currentCharacter.prompt);

});

btnExport.addEventListener("click", async () => {

    if (!currentCharacter) {

        await AppDialog.alert("Generate character first.", { title: "Character Required" });

        return;

    }

    exportJSON(currentCharacter);

});

window.addEventListener("DOMContentLoaded", () => {

    generate();

});
