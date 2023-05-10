import {CalloutKeepTitle, CopyReadingInMarkdownSettings} from "../interface";

export function createNumeroteList(div: HTMLDivElement, type: string) {
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

export function replaceAllDivCalloutToBlockquote(div: HTMLDivElement, commonAncestor: Node, settings: CopyReadingInMarkdownSettings) {
	const allDivCallout = div.querySelectorAll("div[class*='callout']");
	for (const divCallout of allDivCallout) {
		if (settings.calloutTitle !== CalloutKeepTitle.remove) {
			if (divCallout.classList[0] === "callout-title") {
				const ancestor = commonAncestor as HTMLDivElement;
				const calloutType = ancestor.attributes.getNamedItem("data-callout").value;
				let calloutTitle = `[!${calloutType}] `;
				if (settings.calloutTitle === CalloutKeepTitle.strong) {
					calloutTitle = `**${calloutType}** `;
				}
				//insert callout title in title-content-inner div as html, before the text
				const titleInner = divCallout.querySelector(".callout-title-inner");
				titleInner.innerHTML = calloutTitle + titleInner.innerHTML;
			}
		}
		const blockquote = document.createElement("blockquote");
		blockquote.innerHTML = divCallout.innerHTML;
		divCallout.replaceWith(blockquote);
	}
	return div;
}
