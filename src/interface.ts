
/**
 * @file interface.ts
 * @description Interface for the plugin
 * 
 */

/**
 * How to convert the footnotes
 * @example `remove` : Remove all footnotes in markdown
 * 	`[[1]](#text)` -> ``
 * @example `format` : Keep the content of the footnote but remove the footnote format
 * 	`[[1]](#text)` -> `[^1]`
 * @example `keep` : Keep all footnotes in markdown
 * 	`[[1]](#text)` -> `[[1]](#text)`
 * @enum {string} ConversionOfFootnotes
 */
export enum ConversionOfFootnotes {
	keep = "keep",
	remove = "remove",
	format = "format",
}

/**
 * How to convert the links
 * @example `keep` : Keep all links in markdown
 * 	`[text](#link)` -> `[text](#link)`
 * @example `remove` : Remove all links in markdown
 * 	`[text](#link)` -> `text`
 * @example `external` : Remove all links in markdown except the external ones
 * 	`[text](#link)` -> `text`
 * 	`[text](https://example.com)` -> `[text](https://example.com)`
 * @enum {string} ConversionOfLinks
 */
export enum ConversionOfLinks {
	keep = "keep",
	remove = "remove",
	external = "external",
}

/**
 * How to keep the title of the callout
 * @example `obsidian` : Keep the title as it is in Obsidian
 * `> [!note]` -> `> [!note]`
 * @example `strong` : Make the title bold
 * `> [!note]` -> `> **Note**`
 * @example `remove` : Remove the title
 * `> [!note]` -> `>`
 */
export enum CalloutKeepTitle {
	obsidian = "obsidian",
	strong = "strong",
	remove = "remove",
}

/**
 * Where to apply the markdown conversion (reading, edit or both)
 * @example `all` : Apply the markdown conversion to both edit and reading mode
 * @example `reading` : Apply the markdown conversion to reading mode only
 * @example `edit` : Apply the markdown conversion to edit mode only
 */
export enum ApplyingToView {
	"all" = "all",
	"reading" = "reading",
	"edit" = "edit",
}

/** 
 * Settings of the plugin
 * @typedef {Object} CopyReadingInMarkdownSettings
 * @property {ConversionOfLinks} convertLinks - How to convert the links
 * @property {ConversionOfFootnotes} removeFootNotesLinks - How to convert the footnotes
 * @property {boolean} highlight - Highlight the text when copying
 * @property {CalloutKeepTitle} calloutTitle - How to keep the title of the callout
 * @property {boolean} hardBreaks - Keep the hard breaks when copying
 * @property {boolean} exportAsHTML - Export the text as HTML when copying
 * @property {ApplyingToView} applyingTo - Where to apply the markdown conversion (reading, edit or both)
*/
export interface CopyReadingInMarkdownSettings {
	exportAsHTML: boolean;
	applyingTo: ApplyingToView;
	wikiToMarkdown: boolean;
	tabToSpace: boolean;
	tabSpaceSize: number;
	overrides: GlobalSettings;
	global: GlobalSettings;
}

/**
 * Default settings of the plugin
 * @type {CopyReadingInMarkdownSettings}
 * @constant
 * @default
 * @readonly
 */
export const DEFAULT_SETTINGS: CopyReadingInMarkdownSettings = {
	exportAsHTML: false,
	applyingTo: ApplyingToView.all,
	wikiToMarkdown: false,
	tabToSpace: false,
	tabSpaceSize: 4,
	overrides: {
		footnotes: ConversionOfFootnotes.keep,
		links: ConversionOfLinks.keep,
		callout: CalloutKeepTitle.obsidian,
		highlight: false,
		hardBreak: false,
	},
	global: {
		footnotes: ConversionOfFootnotes.keep,
		links: ConversionOfLinks.keep,
		callout: CalloutKeepTitle.obsidian,
		highlight: false,
		hardBreak: false,
	}
};

export interface GlobalSettings {
	footnotes: ConversionOfFootnotes,
	links: ConversionOfLinks,
	callout: CalloutKeepTitle,
	highlight: boolean,
	hardBreak: boolean,
}
