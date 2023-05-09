import {App, Editor, htmlToMarkdown} from "obsidian";
import {createNumeroteList, replaceAllDivCalloutToBlockquote} from "./NodesEdit";

export function getSelectionAsHTML() {
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
	div = replaceAllDivCalloutToBlockquote(div);
	return htmlToMarkdown(div.innerHTML);
}

export function copySelectionRange(editor: Editor) {
	let selectedText = "";
	const selection = editor.listSelections();
	for (const selected of selection) {
		const lineSelected = editor.getLine(selected.head.line);
		const selectedTextInLine = lineSelected.substring(selected.head.ch, selected.anchor.ch);
		selectedText += selectedTextInLine + "\n";
	}
	return selectedText;
}

export function canvasSelectionText(app: App): string {
	const editor = app.workspace.activeEditor;
	if (editor) {
		const editorMode = editor.editor;
		return copySelectionRange(editorMode);
	} else {
		return getSelectionAsHTML();
	}
}
