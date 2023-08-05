import {CalloutKeepTitle, GlobalSettings} from "../interface";

/**
 * Fix list that are not correctly converted to markdown
 * @param div {HTMLDivElement} : The div to transform
 * @param type {string} : The type of list to create (ol or ul)
 * @returns div {HTMLDivElement} : The div transformed
 */
export function reNumerateList(div: HTMLDivElement, type: string) {
	const allLi = div.querySelectorAll("li");
	let allHaveDataLine = true;
	for (const li of allLi) {
		if (!li.hasAttribute("data-line")) {
			allHaveDataLine = false;
			break;
		}
	}
	if (allHaveDataLine) {
		const ol = document.createElement(type);
		for (const li of allLi) {
			ol.appendChild(li);
		}
		div.innerHTML = "";
		div.appendChild(ol);
	}
	return div;
}

/**
 * Replace all div with class "callout" to blockquote with the same content
 * The title will be added differently in function of the settings:
 * - `remove`: The title will be removed ;
 * - `strong`: The title will be added as a strong text (ie GitHub Admonition flavored)
 * - `obsidian`: Will have the same behavior as the callout formatting in Obsidian
 * @param div {HTMLDivElement} The selected contents as HTML
 * @param commonAncestor {Node} The common ancestor of the selection
 * @param settings {GlobalSettings} 
 * @returns {HTMLDivElement} The div transformed
 */
export function replaceAllDivCalloutToBlockquote(div: HTMLDivElement, commonAncestor: Node, settings: GlobalSettings): HTMLDivElement {
	const allDivCallout = div.querySelectorAll("div[class*='callout']");
	let calloutTitle = "";
	for (const divCallout of allDivCallout) {
		if (settings.callout !== CalloutKeepTitle.remove) {
			if (divCallout.classList[0] === "callout-title") {
				const ancestor = commonAncestor as HTMLDivElement;
				const calloutType = ancestor.attributes.getNamedItem("data-callout")?.value ?? divCallout.parentElement?.attributes.getNamedItem("data-callout")?.value ;
				calloutTitle = `[!${calloutType}] `;
				if (settings.callout === CalloutKeepTitle.strong) {
					calloutTitle = `<strong>${calloutType}</strong> `;
				}
				//insert callout title in title-content-inner div as html, before the text
				const titleInner = divCallout.querySelector(".callout-title-inner");
				titleInner!.innerHTML = calloutTitle + titleInner!.innerHTML;
			}
		}
		const blockquote = document.createElement("blockquote");
		blockquote.innerHTML = divCallout.innerHTML;
		//replace div by blockquote
		divCallout.replaceWith(blockquote);
	}
	const titleInner = div.querySelector("div.callout-title-inner");
	if (titleInner && !titleInner.innerHTML.contains(calloutTitle) && settings.callout !== CalloutKeepTitle.remove) {
		titleInner.innerHTML = calloutTitle + titleInner.innerHTML;
	}
	return div;
}


