import {App, Editor, htmlToMarkdown} from "obsidian";
import {createNumeroteList, replaceAllDivCalloutToBlockquote} from "./NodesEdit";
import {CopyReadingInMarkdownSettings} from "../interface";

export function getSelectionAsHTML(settings: CopyReadingInMarkdownSettings) {
	const range = activeWindow.getSelection().getRangeAt(0);
	if (!range) return "";
	const fragment = range.cloneContents();
	let div = document.createElement("div");
	div.appendChild(fragment);
	//check if commonAncestor is ol or ul
	const commonAncestor = range.commonAncestorContainer;
	if (commonAncestor.nodeName === "OL" || commonAncestor.nodeName === "UL") {
		//if so, create ol or ul and append all li to it
		const type = commonAncestor.nodeName.toLowerCase();
		div = createNumeroteList(div, type);
	}
	div = replaceAllDivCalloutToBlockquote(div, range.commonAncestorContainer, settings);
	if (!settings.exportAsHTML) {
		return htmlToMarkdown(div.innerHTML);
	} else {
		return div.innerHTML;
	}
}

export function copySelectionRange(editor: Editor) {
	let selectedText = "";
	const selection = editor.listSelections();
	for (const selected of selection) {
		if (selected.head.line !== selected.anchor.line) {
			selectedText += editor.getRange(selected.head, selected.anchor) + "\n";
		} else {
			selectedText += editor.getLine(selected.head.line).substring(selected.anchor.ch, selected.head.ch) + "\n";
		}
	}
	selectedText = selectedText.substring(0, selectedText.length - 1);
	return selectedText;
}

export function canvasSelectionText(app: App, settings: CopyReadingInMarkdownSettings): string {
	const editor = app.workspace.activeEditor;
	if (editor) {
		const editorMode = editor.editor;
		return copySelectionRange(editorMode);
	} else {
		return getSelectionAsHTML(settings);
	}
}
