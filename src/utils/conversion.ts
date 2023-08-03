import {
	CalloutKeepTitle,
	ConversionOfFootnotes,
	ConversionOfLinks,
	CopyReadingInMarkdownSettings, GlobalSettings
} from "../interface";
import {devLog} from "./log";

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
 * @param view
 * @returns {string} Markdown with links removed if needed
 */
function removeLinksBracketsInMarkdown(markdown: string, settings: GlobalSettings): string {
	const regexLinks = /!?\[([^\]]+)\]\(([^)]+)\)/g;
	if (settings.links === ConversionOfLinks.remove) {
		markdown = markdown.replaceAll(regexLinks, "$1");
	} else if (settings.links === ConversionOfLinks.external
	) {
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
 * Convert wikilinks to markdown links
 * Only for edit view
 * @example `[[link]]` -> `[link](link)`
 * @example `[[link|text]]` -> `[text](link)`
 * @example `[[link#anchor|text]]` -> `[text](link#anchor)`
 * @param markdown {string} Markdown to convert
 * @param settings {CopyReadingInMarkdownSettings} Settings of the plugin
 */
function convertWikiToMarkdown(markdown: string, settings: CopyReadingInMarkdownSettings): string {
	const regexWikiLinks = /\[\[([^\]]+)\]\]/g;
	markdown = markdown.replaceAll(regexWikiLinks, (match, p1) => {
		const parts = p1.split("|");
		if (parts.length === 1) {
			return `[${p1}](${p1})`;
		}
		return `[${parts[1]}](${parts[0]})`;
	});
	return markdown;
}

/**
 * Depending of the settings, will removing completely footnote or keeping content but removing the footnote format
 * @example `remove` : Remove all footnotes in markdown
 * 	`[](#text)[1]` -> ``
 * @example `format` : Keep the content of the footnote but remove the footnote format
 * 	`[](#text)[1]` -> `[^1]`
 * @example `keep` : Keep all footnotes in markdown
 * 	`[](#text)` -> `[](#text)`
 * @param markdown {string} Markdown to convert
 * @param settings {CopyReadingInMarkdownSettings} Settings of the plugin
 * @returns {string} Markdown with footnotes removed if needed
 */
function removeLinksBracketFootnotes(markdown: string, settings: CopyReadingInMarkdownSettings): string {
	const regexFootNotes = /\[([^\]]*)\]\(([^)]*)\)\[(\d+)]/g;
	if (settings.global.footnotes === ConversionOfFootnotes.remove) {
		//keep links but remove footnotes format : [1](#text)[1]
		markdown = markdown.replace(regexFootNotes, "");
	} else if (settings.global.footnotes === ConversionOfFootnotes.format) {
		//keep links but format footnotes format : [[1]](#text)
		markdown = markdown.replace(regexFootNotes, "[^$3]");
	}
	return markdown;
}

function removeMarkdownFootNotes(markdown: string, overrides: GlobalSettings): string {
	if (overrides.footnotes === ConversionOfFootnotes.remove) {
		/** regex replace only text[^1] and not the line that start with [^1]:
		 * @example
		 * `text[^1]` -> `text`
		 * `[^1]: text` -> `[^1]: text`
		 */
		const regexFootNotes = /^\[\^(\w+)\]:/gm;
		markdown = markdown.replace(regexFootNotes, "$1:");
		markdown = markdown.replace(/\[\^\w+]/g, "");
	}
	return markdown;
}

/**
 * As the highlight is not supported in all markdown editor, we can remove it if needed (depending of the settings)
 * @param markdown {string} Markdown to convert
 * @param settings {CopyReadingInMarkdownSettings} Settings of the plugin
 * @returns {string} Markdown with highlight removed if needed
 */
function removeHighlightMark(markdown: string, settings: GlobalSettings): string {
	if (settings.highlight ) {
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
function hardBreak(markdown: string, settings: GlobalSettings): string {
	if (settings.hardBreak) {
		markdown = markdown.replace(/ *\n/g, "  \n");
		markdown = markdown + "  ";
	} else {
		devLog("No hard breaks - Remove extra spaces at the end of each line");
		markdown = markdown.replace(/ *\n/g, "\n");
	}
	return markdown;
}

function convertCallout(markdown: string, overrides: GlobalSettings): string {
	const calloutRegex = /^>* *\[!(\w+)\|?(.*)\] *(.*)$/gm;
	if (overrides.callout === CalloutKeepTitle.remove) {
		devLog("Remove callout title");
		//delete the type of the callout
		markdown = markdown.replace(calloutRegex, (match, p1, p2, p3) => {
			if (p3 === "") {
				//remove the line without adding a new line / space
				return undefined;
			}
			return "> $3";
		});
		//remove line prepended by undefined
		markdown = markdown.replace("undefined\n>", ">");
	} else if (overrides.callout === CalloutKeepTitle.strong) {
		markdown = markdown.replace(calloutRegex, "> **$1** $3");
	}
	
	return markdown;
}



function convertTabToSpace(markdown: string, settings: CopyReadingInMarkdownSettings) {
	if (settings.tabToSpace) {
		const spaces = " ".repeat(settings.tabSpaceSize);
		markdown = markdown.replace(/\t/g, spaces);
	}
	return markdown;
}


/**
 * Main function of the plugin, will convert the markdown depending of the settings
 * @param markdown {string} Markdown to convert
 * @param settings {CopyReadingInMarkdownSettings} Settings of the plugin
 * @param overrides
 * @returns {string} converted markdown
 */
export function convertMarkdown(markdown: string, settings: CopyReadingInMarkdownSettings, overrides: GlobalSettings):string {
	return removeEmptyLineBeforeList(
		hardBreak(
			removeHighlightMark(
				removeLinksBracketFootnotes(
					removeLinksBracketsInMarkdown(markdown, overrides),
					settings
				),
				overrides
			),
			overrides
		)
	);
}

export function convertEditMarkdown(markdown: string, overrides: GlobalSettings, settings: CopyReadingInMarkdownSettings) {
	if (settings.wikiToMarkdown) {
		markdown = convertWikiToMarkdown(markdown, settings);
		markdown = removeLinksBracketsInMarkdown(markdown, overrides);
	}
	markdown = convertTabToSpace(markdown, settings);
	markdown = removeMarkdownFootNotes(markdown, overrides);
	markdown = convertCallout(markdown, overrides);
	markdown = removeHighlightMark(markdown, overrides);
	markdown = hardBreak(markdown, overrides);
	return markdown;
}
