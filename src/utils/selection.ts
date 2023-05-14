import {App, Editor, EditorPosition, htmlToMarkdown} from "obsidian";
import {createNumeroteList, replaceAllDivCalloutToBlockquote} from "./NodesEdit";
import {CopyReadingInMarkdownSettings} from "../interface";

export function getSelectionAsHTML(settings: CopyReadingInMarkdownSettings) {
	const range = activeWindow.getSelection().getRangeAt(0);
	if (!range) return "";
	const fragment = range.cloneContents();
	let div = document.createElement("div");
	div.appendChild(fragment);
	//check if div.innerHTML contains a class with "no-convert"
	
	//check if commonAncestor is ol or ul
	const commonAncestor = range.commonAncestorContainer;
	if (commonAncestor.nodeName === "OL" || commonAncestor.nodeName === "UL") {
		//if so, create ol or ul and append all li to it
		const type = commonAncestor.nodeName.toLowerCase();
		div = createNumeroteList(div, type);
	}
	div = replaceAllDivCalloutToBlockquote(div, range.commonAncestorContainer, settings);
	if (!settings.exportAsHTML) {
		const allNoConvert = div.querySelectorAll("[data-type='html']");
		let markdown = htmlToMarkdown(div.innerHTML);
		//no converting html to markdown the div that contains a class with "no-convert"
		for (const noConvert of allNoConvert) {
			const converted = htmlToMarkdown(noConvert.outerHTML);
			markdown = markdown.replace(converted, noConvert.outerHTML.replace(/ ?data-type=["']html["']/, ""));
		}
		return markdown;
	} else {
		return div.innerHTML;
	}
}

/** Return the real "head" of the selection
 * The head will be ALWAYS the littlest line number or the littlest character number if the line number is the same
 * @param {EditorPosition} head Original head from EditorSelection
 * @param {EditorPosition} anchor Original anchor from EditorSelection
 */

function getHead(head: EditorPosition, anchor: EditorPosition) {
	if (head.line === anchor.line) {
		if (head.ch < anchor.ch) {
			return head;
		}
		return anchor;
	} else if (head.line < anchor.line) {
		return head;
	}
	return anchor;
}

/**
 * Return the real "anchor" of the selection
 * The anchor will be ALWAYS the biggest line number or the biggest character number if the line number is the same
 * @param {EditorPosition} head Original head from EditorSelection
 * @param {EditorPosition} anchor Original anchor from EditorSelection
 */

function getAnchor(head: EditorPosition, anchor: EditorPosition) {
	if (head.line === anchor.line) {
		if (head.ch < anchor.ch) {
			return anchor;
		}
		return head;
	} else if (head.line < anchor.line) {
		return anchor;
	}
	return head;
}

export function copySelectionRange(editor: Editor) {
	let selectedText = "";
	const selection = editor.listSelections();
	for (const selected of selection) {
		const head = getHead(selected.head, selected.anchor);
		const anchor = getAnchor(selected.head, selected.anchor);
		selectedText += editor.getRange(head, anchor) + "\n";
	}
	return selectedText.substring(0, selectedText.length - 1);
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
