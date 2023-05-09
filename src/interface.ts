
export enum TypeConversionOfFootnotes {
	keep = "keep",
	remove = "remove",
	format = "format",
}


export interface CopyReadingInMarkdownSettings {
	convertLinks: boolean
	removeFootNotesLinks: TypeConversionOfFootnotes;
}

export const DEFAULT_SETTINGS: CopyReadingInMarkdownSettings = {
	convertLinks: false,
	removeFootNotesLinks: TypeConversionOfFootnotes.keep,
};

