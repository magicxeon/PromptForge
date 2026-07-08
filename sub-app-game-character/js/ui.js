/**
 * ui.js
 */

export function renderCharacter(character) {

    document.getElementById("characterInfo").textContent =
        JSON.stringify(character, null, 4);

}

export function renderPrompt(prompt) {

    document.getElementById("promptOutput").value =
        prompt;

}

export function clearUI() {

    document.getElementById("characterInfo").textContent = "";

    document.getElementById("promptOutput").value = "";

}