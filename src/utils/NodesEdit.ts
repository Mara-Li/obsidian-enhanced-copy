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

export function replaceAllDivCalloutToBlockquote(div: HTMLDivElement) {
	const allDivCallout = div.querySelectorAll("div[class*='callout']");
	for (const divCallout of allDivCallout) {
		const blockquote = document.createElement("blockquote");
		blockquote.innerHTML = divCallout.innerHTML;
		divCallout.replaceWith(blockquote);
	}
	return div;
}
