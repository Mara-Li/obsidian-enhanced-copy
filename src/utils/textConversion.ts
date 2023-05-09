export function removeEmptyLineInBlockQuote(markdown: string) {
	//remove empty blockquote in markdown
	//line that start with > and has no text
	const lines = markdown.split("\n");
	const newLines = [];
	let isInBlockQuote = false;
	for (const line of lines) {
		if (line.startsWith(">")) {
			isInBlockQuote = true;
			if (line.trim().length > 1) {
				newLines.push(line);
			}
		}
		else if (isInBlockQuote && line.trim().length === 0) {
			//do nothing
		}
		else if (isInBlockQuote && !line.startsWith(">")) {
			isInBlockQuote = false;
			newLines.push(line);
		}
		else if (!isInBlockQuote) {
			newLines.push(line);
		}
	}
	return newLines.join("\n");
}
