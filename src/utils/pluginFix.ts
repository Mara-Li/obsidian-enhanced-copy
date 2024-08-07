/**
 * Some div are not correctly converted to markdown, this function fix them
 * It is a fix for the plugin dbfolder (@RafaelGB/obsidian-db-folder)
 * As the formatting is broken when copying the table from the plugin.
 * @note More function like that can be added in the future if needed
 * @returns {string} The selected text (copying behavior of Obsidian)
 */

export function removeDataBasePluginRelationShip(): string {
	if (activeDocument.querySelector("div.database-plugin__container")) {
		const div = document.createElement("div");
		const getSelection = activeWindow.getSelection();
		if (!getSelection) return "";
		const selection = getSelection.getRangeAt(0);
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
		const getSelection = activeWindow.getSelection();
		if (!getSelection) return "";
		return getSelection.toString();
	}
}

/**
 * Metabind is rendered like this, in the HTML:
 * ```html
 * <code class="mb-view mb-view-inline"><div class="mb-view-wrapper mb-view-text mb-view-type-math">xxx</div></code>
 * ```
 * This return a strange formated code block in markdown, this function fix it, with converting to <code>text</code>
 * @param html
 */
export function fixMetaBindCopy(html: string) {
	return html
		.replace(
			/<code class="mb-view mb-view-inline"><div class="mb-view-wrapper mb-view-text mb-view-type-math">(.*?)<\/div><\/code>/gim,
			"$1"
		)
		.replace(
			/<div class="block-language-meta-bind-embed-internal-1"><div class="block-language-meta-bind-js-view mb-view"><div class="mb-view-wrapper"><p dir="auto">(.*)<\/p>/gim,
			"$1"
		)
		.replace(/<pre class="frontmatter language-yaml cm-s-obsidian .*"/gim, "")
		.replace(/<div class="block-language-meta-bind-embed-internal-1">(.*)/gim, "")
		.replace(/<span class="cm-atom">.*<\/span><span class="cm-meta">(.*)/gim, "")
		.replace(/<code class="language-yaml is-loaded" data-lang="yaml">(.*)/gim, "")
		.replace(
			/<code class="mb-view mb-view-inline"><div class="mb-view-wrapper mb-view-text mb-view-type-math"><\/div><\/code>/gim,
			""
		)
		.replace(
			'<div class="block-language-meta-bind-js-view mb-view"><div class="mb-view-wrapper"></div></div>',
			""
		);
}
