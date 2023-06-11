/**
 * Some div are not correctly converted to markdown, this function fix them
 * It is a fix for the plugin dbfolder (@RafaelGB/obsidian-db-folder)
 * As the formatting is broken when copying the table from the plugin.
 * @note More function like that can be added in the future if needed
 * @returns {string} The selected text (copying behavior of Obsidian)
 */

export function removeDataBasePluginRelationShip() {
	if (activeDocument.querySelector("div.database-plugin__container")) {
		const div = document.createElement("div");
		const selection = activeWindow.getSelection().getRangeAt(0);
		const fragment = selection.cloneContents();
		div.appendChild(fragment);
		const allSpan = div.querySelectorAll("span");
		for (const span of allSpan) {
			//remove database-plugin__relationship class
			if (span.classList[0] === "database-plugin__relationship") {
				//remove entire span
				//replace by br
				span.innerHTML = "\n";
			}
		}
		return div.innerText;
	} else {
		return activeWindow.getSelection().toString();
	}
}
