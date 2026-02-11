import i18next from "i18next";
import { Component, MarkdownRenderer } from "obsidian";
import {
	CalloutKeepType,
	ConversionOfFootnotes,
	ConversionOfLinks,
	type GlobalSettings,
} from "../interface";
import type EnhancedCopy from "../main";
import { convertDataviewQueries } from "./dataview";

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
		if (
			!(line.trim().length === 0 && i + 1 < lines.length && lines[i + 1].startsWith("-"))
		) {
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
 * @param settings {EnhancedCopySettings} Settings of the plugin
 * @returns {string} Markdown with links removed if needed
 */
function removeLinksBracketsInMarkdown(
	markdown: string,
	settings: GlobalSettings
): string {
	const regexLinks = /!?\[([^\]]+)\]\(([^)]+)\)/g;
	if (settings.links === ConversionOfLinks.Remove) {
		markdown = markdown.replaceAll(regexLinks, "$1");
	} else if (settings.links === ConversionOfLinks.External) {
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
 * @example `[[link#anchor|text]]` -> `[text](link#anchor)`
 * @param markdown {string} Markdown to convert
 */
function convertWikiToMarkdown(markdown: string): string {
	const regexWikiLinks = /\[\[([^\]]+)\]\]/g;
	return markdown.replaceAll(regexWikiLinks, (_match, p1) => {
		const parts = p1.split("|");
		if (parts.length === 1) {
			return `[${p1}](${p1})`;
		}
		return `[${parts[1]}](${parts[0]})`;
	});
}

/**
 * Depending of the settings, will removing completely footnote or keeping content but removing the footnote format
 * @example `remove` : Remove all footnotes in markdown
 * 	`footnote[[1]](#fn-1-632b5699b7da7a44)` -> `footnote`
 * @example `format` : Keep the content of the footnote but remove the footnote format
 * 	`footnote[[1]](#fn-1-632b5699b7da7a44)` -> `footnote[^1]`
 * @example `keep` : Keep all footnotes in markdown
 * 	`footnote[[1]](#fn-1-632b5699b7da7a44)` -> `footnote[[1]](#fn-1-632b5699b7da7a44)`
 * @param markdown {string} Markdown to convert
 * @param settings {EnhancedCopySettings} Settings of the plugin
 * @returns {string} Markdown with footnotes removed if needed
 */
function fixFootNotes(markdown: string, settings: GlobalSettings): string {
	const regexFootNotes = /\[{2}(\w+)\]{2}\((.*)\)/g;
	if (settings.footnotes === ConversionOfFootnotes.Remove) {
		//keep links but remove footnotes format : [1](#text)[1]
		markdown = markdown.replace(regexFootNotes, "");
	} else if (settings.footnotes === ConversionOfFootnotes.Format) {
		//keep links but format footnotes format : [[1]](#text)
		markdown = markdown.replace(regexFootNotes, "[^$1]");
	}
	return fixFootnoteContents(markdown, settings);
}

/**
 * Convert the turndown format to proper reading markdown
 * @example Remove: `coucou[](#fnref-1-632b5699b7da7a44)` -> coucou
 * @example Format: `coucou[](#fnref-1-632b5699b7da7a44)` -> [^1]: coucou`
 * @param markdown
 * @param overrides
 */
function fixFootnoteContents(markdown: string, overrides: GlobalSettings): string {
	const regexFootNotes = /(.*)\[\]\(#fnref-(\d)-\w+\)/g;
	if (overrides.footnotes === ConversionOfFootnotes.Remove) {
		return markdown.replace(regexFootNotes, "$1");
	} else if (overrides.footnotes === ConversionOfFootnotes.Format) {
		markdown = markdown.replace(regexFootNotes, "[^$2]: $1");
		return markdown.replace(/(\[\^\w+\]): (\d+)\./gm, "$1:");
	}
	return markdown;
}

function removeMarkdownFootNotes(markdown: string, overrides: GlobalSettings): string {
	if (overrides.footnotes === ConversionOfFootnotes.Remove) {
		/** regex replace only text[^1] and not the line that start with [^1]:
		 * @example
		 * `text[^1]` -> `text`
		 * `[^1]: text` -> `[^1]: text`
		 */
		const regexFootNotes = /^\[\^(\w+)\]:/gm;
		markdown = markdown.replace(regexFootNotes, "$1:");
		return markdown.replace(/\[\^\w+]/g, "");
	}
	return markdown;
}

/**
 * As the highlight is not supported in all markdown editor, we can remove it if needed (depending of the settings)
 * @param markdown {string} Markdown to convert
 * @param settings {EnhancedCopySettings} Settings of the plugin
 * @returns {string} Markdown with highlight removed if needed
 */
function removeHighlightMark(markdown: string, settings: GlobalSettings): string {
	if (settings.highlight) {
		return markdown.replace(/==([^=]+)==/g, "$1");
	}
	return markdown;
}

/**
 * If the settings are set to add hard breaks, add "two spaces and a new line" at the end of each line
 * @example
 * `line1\nline2` -> `line1  \nline2  \n`
 * @param markdown {string} Markdown to convert
 * @param settings {EnhancedCopySettings} Settings of the plugin
 * @param plugin
 * @returns {string} Markdown with hard breaks added if needed
 */
function hardBreak(
	markdown: string,
	settings: GlobalSettings,
	plugin: EnhancedCopy
): string {
	if (settings.hardBreak) {
		markdown = markdown.replace(/ *\n/g, "  \n");
		markdown += "  ";
	} else {
		plugin.core.devLog(i18next.t("log.noHardBreaks"));
		markdown = markdown.replace(/ *\n/g, "\n");
	}
	return markdown;
}

function convertCallout(
	markdown: string,
	overrides: GlobalSettings,
	plugin: EnhancedCopy
): string {
	plugin.core.devLog(i18next.t("log.callout.title"), overrides.callout);
	const calloutRegex = /^>* *\[!(\w+)\|?(.*)\] *(.*)$/gm;
	if (
		overrides.callout === CalloutKeepType.RemoveKeepTitle ||
		overrides.callout === CalloutKeepType.Remove
	) {
		plugin.core.devLog(i18next.t("log.callout.remove"));
		//delete the type of the callout
		markdown = markdown.replace(calloutRegex, (_match, _p1, _p2, p3) => {
			if (p3 === "") {
				//remove the line without adding a new line / space
				return "undefined";
			}
			if (overrides.callout === CalloutKeepType.RemoveKeepTitle) return `> **${p3}**`;
			return "undefined";
		});
		//remove line prepended by undefined
		return markdown.replace("undefined\n>", ">");
	} else if (overrides.callout === CalloutKeepType.Strong) {
		return markdown.replace(calloutRegex, "> **$1** $3");
	}

	return markdown;
}

function convertTabToSpace(markdown: string, settings: GlobalSettings) {
	if (settings.tabToSpace) {
		const spaces = " ".repeat(settings.tabSpaceSize ?? 4);
		return markdown.replace(/\t/g, spaces);
	}
	return markdown;
}

function convertSpaceSize(markdown: string, settings: GlobalSettings) {
	/** Note:
	 * Turndown will always convert \t to 4 space
	 * So if we want to reduce the space size, we need to count each 4 space as 1 space for each line
	 */
	const countSpace = markdown.match(/^ +/gm);
	if (!settings.spaceReadingSize) return markdown;
	if (settings.spaceReadingSize >= 0 && countSpace) {
		countSpace.forEach((space) => {
			const newSpace = " ".repeat((space.length / 4) * (settings.spaceReadingSize ?? 1));
			markdown = markdown.replace(space, newSpace);
		});
	}
	return markdown;
}

function textReplacement(markdown: string, settings: GlobalSettings) {
	const replacement = settings.replaceText;
	for (const replace of replacement) {
		let pattern: string | RegExp = replace.pattern;
		if (pattern.match(/^\/.*\/([gmiyus]+)?$/)) {
			const flags = pattern.replace(/^\/.*\/([gmiyus]+)?$/, "$1");
			const regex = pattern.replace(/^\/(.*)\/(.*)$/, "$1");
			pattern = new RegExp(regex, flags.length > 0 ? flags : undefined);
			markdown = markdown.replace(pattern, replace.replacement);
		} else markdown = markdown.replaceAll(pattern, replace.replacement);
	}
	return markdown;
}

/**
 * Main function of the plugin, will convert the markdown depending of the settings
 * @param markdown {string} Markdown to convert
 * @param overrides
 * @param plugin
 * @returns {string} converted markdown
 */
export function convertMarkdown(
	markdown: string,
	overrides: GlobalSettings,
	plugin: EnhancedCopy
): string {
	const res = removeEmptyLineBeforeList(
		convertSpaceSize(
			convertCallout(
				hardBreak(
					removeHighlightMark(
						fixFootNotes(
							removeLinksBracketsInMarkdown(
								textReplacement(markdown, overrides),
								overrides
							),
							overrides
						),
						overrides
					),
					overrides,
					plugin
				),
				overrides,
				plugin
			),
			overrides
		)
	);
	return res;
}

export async function convertEditMarkdown(
	markdown: string,
	overrides: GlobalSettings,
	plugin: EnhancedCopy,
	path?: string | null
) {
	markdown = textReplacement(markdown, overrides);
	if (
		path &&
		overrides.convertDataview &&
		plugin.app.plugins.enabledPlugins.has("dataview")
	)
		markdown = await convertDataviewQueries(overrides, path, markdown, plugin);
	if (overrides.wikiToMarkdown) {
		markdown = convertWikiToMarkdown(markdown);
		markdown = removeLinksBracketsInMarkdown(markdown, overrides);
	}
	markdown = convertTabToSpace(markdown, overrides);
	markdown = removeMarkdownFootNotes(markdown, overrides);
	markdown = convertCallout(markdown, overrides, plugin);
	markdown = removeHighlightMark(markdown, overrides);
	markdown = hardBreak(markdown, overrides, plugin);
	if (overrides.copyAsHTML) return await markdownToHtml(markdown, overrides, plugin);
	return markdown;
}

async function markdownToHtml(
	markdown: string,
	overrides: GlobalSettings,
	plugin: EnhancedCopy
): Promise<string> {
	const component = new Component();
	const div = new DocumentFragment().createEl("div");
	component.load();
	await MarkdownRenderer.render(plugin.app, markdown, div, "", component);
	component.unload();
	const html = div.innerHTML.replaceAll('dir="auto"', "").replaceAll(" >", ">").trim();
	if (overrides.rtf) {
		const css = plugin.profileCSS.get(overrides.name ?? "edit");
		return `<html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
	}
	return html;
}
