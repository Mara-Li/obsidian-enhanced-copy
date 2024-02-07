
import { CalloutKeepType, GlobalSettings } from "../interface";

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
export function replaceAllDivCalloutToBlockquote(
	div: HTMLDivElement,
	commonAncestor: Node,
	settings: GlobalSettings
): HTMLDivElement {
	const allDivCallout = div.querySelectorAll("div[class*='callout']");
	let calloutTitle = "";
	for (const divCallout of allDivCallout) {
		if (
			(settings.callout !== CalloutKeepType.remove && settings.callout !== CalloutKeepType.removeKeepTitle) &&
			divCallout.classList[0] === "callout-title"
		) {
			const ancestor = commonAncestor as HTMLDivElement;
			const calloutType =
				ancestor.attributes.getNamedItem("data-callout")?.value ??
				(divCallout.parentElement ? divCallout.parentElement.attributes.getNamedItem("data-callout")?.value : "");
			calloutTitle = `[!${calloutType}] `;
			if (settings.callout === CalloutKeepType.strong) {
				calloutTitle = `<strong>${capitalize(calloutType)}</strong> `;
			}
			//insert callout title in title-content-inner div as html, before the text
			const titleInner = divCallout.querySelector(".callout-title-inner");
			if (titleInner && !calloutTitle.contains(titleInner.innerHTML.toLowerCase()))
				titleInner?.replaceWith(calloutTitle + titleInner?.innerHTML);
			else
				titleInner?.replaceWith(calloutTitle);
		}
		const blockquote = document.createElement("blockquote");
		blockquote.innerHTML = divCallout.innerHTML;
		//replace div by blockquote<
		divCallout.replaceWith(blockquote);
	}
	const allTitleInner = div.querySelectorAll("div.callout-title-inner");
	for (const titleInner of allTitleInner) {

		if (titleInner && settings.callout !== CalloutKeepType.remove) {
			titleInner.innerHTML = calloutTitle.toLowerCase().contains(
				titleInner.innerHTML.toLowerCase()
			)
				? `<strong>${calloutTitle}</strong>`
				: `<strong>${calloutTitle}${titleInner.innerHTML}</strong>`;
		} else if (titleInner && settings.callout === CalloutKeepType.remove) {
			titleInner.remove();
		}
	}
	return simplifyBlockquote(div);
}

/**
 * This function will convert:
 * ```html
 * 	<blockquote>
 * 	<div class="callout-title">
 * 		<div class="callout-icon">...</div>
 * 			<div class="callout-title-inner"><strong>info</strong></div>
 * 		</div>
 * 	<div class="callout-content"><p>coucou</p></div>
 * </blockquote>
 * ```
 * to:
 * ```html
 * 	<blockquote>
 * 		<strong>info</strong>
 * 		<p>coucou</p>
 * 	</blockquote>
 * ```
 * @param div {HTMLDivElement} The selected contents as HTML
 * @returns {HTMLDivElement} The div transformed
 */
function simplifyBlockquote(div: HTMLDivElement): HTMLDivElement {
	const blockquotes = div.querySelectorAll("blockquote");
	blockquotes.forEach((blockquote) => {
		const modifiedDivElement = document.createElement("div");
		const calloutTitleInner = blockquote.querySelector(".callout-title-inner");
		const calloutContent = blockquote.querySelector(".callout-content");
		if (!calloutTitleInner && !calloutContent) return;
		const calloutTitleInnerText = calloutTitleInner?.innerHTML ? `${calloutTitleInner!.innerHTML}<br>` : "";
		const calloutContentHTML = calloutContent?.innerHTML ?? "";
		modifiedDivElement.innerHTML = `
      <blockquote>
        ${calloutTitleInnerText}
        ${calloutContentHTML.replace("<p>", "<span>").replace("</p>", "</span>")}
      </blockquote>
    `;
		//we need to replace the the blockquote by the new simplified blockquote
		blockquote.replaceWith(modifiedDivElement);
	});
	return div;
}

function capitalize(string: string | undefined) {
	if (string === undefined) return "";
	return string.charAt(0).toUpperCase() + string.slice(1);
}
