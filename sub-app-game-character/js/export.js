/**
 * export.js
 */

export function copyPrompt(prompt) {

    navigator.clipboard.writeText(prompt);

}

export function exportJSON(character) {

    const blob = new Blob(
        [JSON.stringify(character, null, 4)],
        {
            type: "application/json"
        }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = "character.json";

    a.click();

    URL.revokeObjectURL(url);

}

export function exportPrompt(prompt) {

    const blob = new Blob(
        [prompt],
        {
            type: "text/plain"
        }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = "prompt.txt";

    a.click();

    URL.revokeObjectURL(url);

}