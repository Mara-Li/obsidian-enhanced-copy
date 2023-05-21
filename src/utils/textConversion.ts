import {ConversionOfFootnotes, ConversionOfLinks, CopyReadingInMarkdownSettings} from "../interface";

function removeEmptyLineInBlockQuote(markdown: string) {
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
			newLines.push("");
			newLines.push(line);
		}
		else if (!isInBlockQuote) {
			newLines.push(line);
		}
	}
	return newLines.join("\n");
}

function removeLinksBracketsInMarkdown(markdown: string, settings: CopyReadingInMarkdownSettings): string {
	const regexLinks = /!?\[([^\]]+)\]\(([^)]+)\)/g;
	if (settings.convertLinks === ConversionOfLinks.remove) {
		markdown = markdown.replaceAll(regexLinks, "$1");
	} else if (settings.convertLinks === ConversionOfLinks.external) {
		//convert links only if they don't have `http` or `https` in them
		markdown = markdown.replaceAll(regexLinks, (match, p1, p2) => {
			if (p2.startsWith("http")) {
				return match;
			}
			return p1;
		});
	}
	return markdown.replaceAll("↩︎", "");
}

function removeLinksBracketFootnotes(markdown: string, settings: CopyReadingInMarkdownSettings) {
	const regexFootNotes = /\[\[([^\]]+)\]\]\(([^)]+)\)/g;
	if (settings.removeFootNotesLinks === ConversionOfFootnotes.remove) {
		//keep links but remove footnotes format : [[1]](#text)
		markdown = markdown.replace(regexFootNotes, "");
	} else if (settings.removeFootNotesLinks === ConversionOfFootnotes.format) {
		//keep links but format footnotes format : [[1]](#text)
		markdown = markdown.replace(regexFootNotes, "[^$1]");
	}
	return markdown;
}

function removeHighlightMark(markdown: string, settings: CopyReadingInMarkdownSettings): string {
	if (settings.highlight) {
		markdown = markdown.replace(/==([^=]+)==/g, "$1");
	}
	return markdown;
}

function hardBreak(markdown: string, settings: CopyReadingInMarkdownSettings) {
	if (settings.hardBreaks) {
		markdown = markdown.replace(/ *\n/g, "  \n");
		markdown = markdown + "  ";
	}
	return markdown;
}

export function convertMarkdown(markdown: string, settings: CopyReadingInMarkdownSettings) {
	let newMarkdown = markdown;
	newMarkdown = removeEmptyLineInBlockQuote(newMarkdown);
	newMarkdown = removeLinksBracketsInMarkdown(newMarkdown, settings);
	newMarkdown = removeLinksBracketFootnotes(newMarkdown, settings);
	newMarkdown = removeHighlightMark(newMarkdown, settings);
	newMarkdown = hardBreak(newMarkdown, settings);
	return newMarkdown;
}
