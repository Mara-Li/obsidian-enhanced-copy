import {CopyReadingInMarkdownSettings, TypeConversionOfFootnotes} from "../interface";

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

export function removeLinksBracketsInMarkdown(markdown: string, settings: CopyReadingInMarkdownSettings): string {
	const regexFootNotes = /\[\[([^\]]+)\]\]\(([^)]+)\)/g;
	if (settings.convertLinks) {
		markdown = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
		//also remove footnotes format : [[1]](#text)
	} if (settings.removeFootNotesLinks === TypeConversionOfFootnotes.remove) {
		console.log("remove footnotes links");
		//keep links but remove footnotes format : [[1]](#text)
		markdown = markdown.replace(regexFootNotes, "");
	} else if (settings.removeFootNotesLinks === TypeConversionOfFootnotes.format) {
		console.log("format footnotes links");
		//keep links but format footnotes format : [[1]](#text)
		markdown = markdown.replace(regexFootNotes, "[^$1]");
	}
	return markdown;
}
