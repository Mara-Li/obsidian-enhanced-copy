import {ConversionOfFootnotes, ConversionOfLinks, CopyReadingInMarkdownSettings} from "../interface";
import { devLog } from "./log";

/**
 * If a list is preceded by an empty line, remove the empty line
 * @param {string} markdown Markdown to convert
 * @returns {string} Markdown with empty line removed before list
 */
function removeEmptyLineBeforeList(markdown: string): string {
	const lines = markdown.split("\n");
	const newLines = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (!(line.trim().length === 0 && i + 1 < lines.length && lines[i + 1].startsWith("-"))) {
			newLines.push(line);
		}
	}
	return newLines.join("\n");
}

/**
 * Allow to remove the links in the markdown if the settings are set to remove it.
 * Also remove the `!` in front of the link if it's an image/embed link
 * Remove `↩︎` for footnotes
 * @example `external` : Keep only external links in markdown (links that don't start with `http` or `https`)
 * - `[link](https://example.com)` -> `[link](https://example.com)`
 * - `[link](example.md) -> link`
 * @example `remove` : Remove all links in markdown (including external links)
 * - `[link](https://example.com)` -> `link`
 * - `[link](example.md) -> link`
 * @example `keep` : Keep all links in markdown
 * - `[link](https://example.com)` -> `[link](https://example.com)`
 * - `[link](example.md) -> [link](example.md)`
 * @param markdown {string} Markdown to convert
 * @param settings {CopyReadingInMarkdownSettings} Settings of the plugin
 * @returns {string} Markdown with links removed if needed
 */
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

/**
 * Depending of the settings, will removing completely footnote or keeping content but removing the footnote format
 * @example `remove` : Remove all footnotes in markdown
 * 	`[[1]](#text)` -> ``
 * @example `format` : Keep the content of the footnote but remove the footnote format
 * 	`[[1]](#text)` -> `[^1]`
 * @example `keep` : Keep all footnotes in markdown
 * 	`[[1]](#text)` -> `[[1]](#text)`
 * @param markdown {string} Markdown to convert
 * @param settings {CopyReadingInMarkdownSettings} Settings of the plugin
 * @returns {string} Markdown with footnotes removed if needed
 */
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

/**
 * As the highlight is not supported in all markdown editor, we can remove it if needed (depending of the settings)
 * @param markdown {string} Markdown to convert
 * @param settings {CopyReadingInMarkdownSettings} Settings of the plugin
 * @returns {string} Markdown with highlight removed if needed
 */
function removeHighlightMark(markdown: string, settings: CopyReadingInMarkdownSettings): string {
	if (settings.highlight) {
		markdown = markdown.replace(/==([^=]+)==/g, "$1");
	}
	return markdown;
}

/**
 * If the settings are set to add hard breaks, add "two spaces and a new line" at the end of each line
 * @example
 * `line1\nline2` -> `line1  \nline2  \n`
 * @param markdown {string} Markdown to convert
 * @param settings {CopyReadingInMarkdownSettings} Settings of the plugin
 * @returns {string} Markdown with hard breaks added if needed
 */
function hardBreak(markdown: string, settings: CopyReadingInMarkdownSettings): string {
	if (settings.hardBreaks) {
		markdown = markdown.replace(/ *\n/g, "  \n");
		markdown = markdown + "  ";
	} else {
		devLog("No hard breaks - Remove extra spaces at the end of each line");
		markdown = markdown.replace(/\s*\n/g, "\n");
	}
	return markdown;
}

/**
 * Main function of the plugin, will convert the markdown depending of the settings
 * @param markdown {string} Markdown to convert
 * @param settings {CopyReadingInMarkdownSettings} Settings of the plugin
 * @returns {string} converted markdown
 */
export function convertMarkdown(markdown: string, settings: CopyReadingInMarkdownSettings):string {
	devLog(markdown);
	return removeEmptyLineBeforeList(
		hardBreak(
			removeHighlightMark(
				removeLinksBracketFootnotes(
					removeLinksBracketsInMarkdown(markdown, settings),
					settings
				),
				settings
			),
			settings
		)
	);
}
