
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

export interface CopyReadingInMarkdownSettings {
	convertLinks: ConversionOfLinks;
	removeFootNotesLinks: ConversionOfFootnotes;
	highlight: boolean;
}

export const DEFAULT_SETTINGS: CopyReadingInMarkdownSettings = {
	convertLinks: ConversionOfLinks.keep,
	removeFootNotesLinks: ConversionOfFootnotes.keep,
	highlight: false,
};

