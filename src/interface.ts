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
	Keep = "keep",
	Remove = "remove",
	Format = "format",
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
	Keep = "keep",
	Remove = "remove",
	External = "external",
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
	Obsidian = "obsidian",
	Strong = "strong",
	Remove = "remove",
	RemoveKeepTitle = "removeKeepTitle",
}

/**
 * Where to apply the markdown conversion (reading, edit or both)
 * @example `all` : Apply the markdown conversion to both edit and reading mode
 * @example `reading` : Apply the markdown conversion to reading mode only
 * @example `edit` : Apply the markdown conversion to edit mode only
 */
export enum ApplyingToView {
	All = "all",
	Reading = "reading",
	Edit = "edit",
}

export const COLLAPSE_INDICATOR = new RegExp(
	'<div class="heading-collapse-indicator collapse-indicator collapse-icon( is-collapsed)?"><svg xmlns=".*" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle"><path d="M3 8L12 17L21 8"></path></svg></div>',
	"gi"
);

export interface EnhancedCopySettings {
	copyAsHTML: boolean;
	applyingTo: ApplyingToView;
	separateHotkey: boolean;
	editing: GlobalSettings;
	reading: GlobalSettings;
	devMode: boolean;
	profiles: GlobalSettings[];
}

/**
 * Default settings of the plugin
 * @type {EnhancedCopySettings}
 * @constant
 * @default
 * @readonly
 */
export const DEFAULT_SETTINGS: EnhancedCopySettings = {
	copyAsHTML: false,
	applyingTo: ApplyingToView.All,
	separateHotkey: false,
	editing: {
		footnotes: ConversionOfFootnotes.Keep,
		links: ConversionOfLinks.Keep,
		callout: CalloutKeepType.Obsidian,
		highlight: false,
		hardBreak: false,
		replaceText: [],
		overrideNativeCopy: false,
	},
	reading: {
		footnotes: ConversionOfFootnotes.Keep,
		links: ConversionOfLinks.Keep,
		callout: CalloutKeepType.Obsidian,
		highlight: false,
		hardBreak: false,
		replaceText: [],
		overrideNativeCopy: false,
		spaceReadingSize: -1, // -1 disabled
		wikiToMarkdown: false,
	},
	devMode: false,
	profiles: [],
};

export interface AutoRules {
	type: "path" | "tag" | "frontmatter";
	value: string;
	not?: boolean;
}

export interface ConvertDataview {
	enable: boolean;
	djs: {
		inline: boolean;
		block: boolean;
	};
	dql: {
		inline: boolean;
		block: boolean;
	};
}

export const DEFAULT_DATAVIEW_SETTINGS_DISABLED: ConvertDataview = {
	enable: false,
	djs: {
		inline: false,
		block: false,
	},
	dql: {
		inline: false,
		block: false,
	},
};

export const DEFAULT_DATAVIEW_SETTINGS_ENABLED: ConvertDataview = {
	enable: true,
	djs: {
		inline: true,
		block: true,
	},
	dql: {
		inline: true,
		block: true,
	},
};

export interface GlobalSettings {
	name?: string;
	copyAsHTML?: boolean;
	footnotes: ConversionOfFootnotes;
	links: ConversionOfLinks;
	callout: CalloutKeepType;
	convertDataview?: ConvertDataview;
	highlight: boolean;
	hardBreak: boolean;
	replaceText: ReplaceText[];
	overrideNativeCopy: boolean;
	spaceReadingSize?: number; //only work in reading mode
	tabToSpace?: boolean; //only work in edit mode
	tabSpaceSize?: number; //only work in edit mode
	wikiToMarkdown?: boolean;
	applyingTo?: ApplyingToView; //only work in profiles
	/**
	 * Allow to automatically use this profile based on the path, tag or frontmatter
	 */
	autoRules?: AutoRules[]; //only work in profiles
}

export interface ReplaceText {
	pattern: string;
	replacement: string;
}

export enum CopySettingsView {
	Reading = "reading",
	Editing = "editing",
}
