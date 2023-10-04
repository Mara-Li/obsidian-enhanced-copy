
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
export enum CalloutKeepType {
	obsidian = "obsidian",
	strong = "strong",
	remove = "remove",
	removeKeepTitle = "removeKeepTitle",
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


export interface AdvancedCopySettings {
	exportAsHTML: boolean;
	applyingTo: ApplyingToView;
	separateHotkey: boolean;
	wikiToMarkdown: boolean;
	tabToSpace: boolean;
	tabSpaceSize: number;
	spaceReadingSize: number;
	editing: GlobalSettings;
	reading: GlobalSettings;
}

/**
 * Default settings of the plugin
 * @type {AdvancedCopySettings}
 * @constant
 * @default
 * @readonly
 */
export const DEFAULT_SETTINGS: AdvancedCopySettings = {
	exportAsHTML: false,
	applyingTo: ApplyingToView.all,
	separateHotkey: false,
	wikiToMarkdown: false,
	tabToSpace: false,
	tabSpaceSize: 4,
	spaceReadingSize: -1, //disabled
	editing: {
		footnotes: ConversionOfFootnotes.keep,
		links: ConversionOfLinks.keep,
		callout: CalloutKeepType.obsidian,
		highlight: false,
		hardBreak: false,
		replaceText: []
	},
	reading: {
		footnotes: ConversionOfFootnotes.keep,
		links: ConversionOfLinks.keep,
		callout: CalloutKeepType.obsidian,
		highlight: false,
		hardBreak: false,
		replaceText: []
	}
};

export interface GlobalSettings {
	footnotes: ConversionOfFootnotes,
	links: ConversionOfLinks,
	callout: CalloutKeepType,
	highlight: boolean,
	hardBreak: boolean,
	replaceText: ReplaceText[]
}

export interface ReplaceText {
	pattern: string,
	replacement: string
}

export enum CopySettingsView {
	reading = "reading",
	editing = "editing"
}
