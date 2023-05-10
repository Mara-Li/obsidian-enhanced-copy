
export enum ConversionOfFootnotes {
	keep = "keep",
	remove = "remove",
	format = "format",
}

export enum ConversionOfLinks {
	keep = "keep",
	remove = "remove",
	external = "external",
}

export enum CalloutKeepTitle {
	obsidian = "obsidian",
	strong = "strong",
	remove = "remove",
}

export interface CopyReadingInMarkdownSettings {
	convertLinks: ConversionOfLinks;
	removeFootNotesLinks: ConversionOfFootnotes;
	highlight: boolean;
	calloutTitle: CalloutKeepTitle;
	hardBreaks: boolean;
	exportAsHTML: boolean;
}

export const DEFAULT_SETTINGS: CopyReadingInMarkdownSettings = {
	convertLinks: ConversionOfLinks.keep,
	removeFootNotesLinks: ConversionOfFootnotes.keep,
	highlight: false,
	calloutTitle: CalloutKeepTitle.obsidian,
	hardBreaks: false,
	exportAsHTML: false,
};

