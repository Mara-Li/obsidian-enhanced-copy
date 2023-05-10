
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

export enum ApplyingToView {
	"all" = "all",
	"reading" = "reading",
	"edit" = "edit",
}

export interface CopyReadingInMarkdownSettings {
	convertLinks: ConversionOfLinks;
	removeFootNotesLinks: ConversionOfFootnotes;
	highlight: boolean;
	calloutTitle: CalloutKeepTitle;
	hardBreaks: boolean;
	exportAsHTML: boolean;
	applyingTo: ApplyingToView;
}

export const DEFAULT_SETTINGS: CopyReadingInMarkdownSettings = {
	convertLinks: ConversionOfLinks.keep,
	removeFootNotesLinks: ConversionOfFootnotes.keep,
	highlight: false,
	calloutTitle: CalloutKeepTitle.obsidian,
	hardBreaks: false,
	exportAsHTML: false,
	applyingTo: ApplyingToView.all,
};

