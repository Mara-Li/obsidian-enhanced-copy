import { Editor, ItemView, MarkdownView, Plugin, htmlToMarkdown } from "obsidian";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CopyReadingInMarkdownSettings {}
const DEFAULT_SETTINGS: CopyReadingInMarkdownSettings = {};

export default class CopyReadingInMarkdown extends Plugin {
	settings: CopyReadingInMarkdownSettings;

	createNumeroteList(div: HTMLDivElement, type: string) {
		const allLi = div.querySelectorAll("li");
		let allHaveDataLine = true;
		for (const li of allLi) {
			if (!li.hasAttribute("data-line")) {
				allHaveDataLine = false;
				break;
			}
		}
		if (allHaveDataLine) {
			const ol = document.createElement(type);
			for (const li of allLi) {
				ol.appendChild(li);
			}
			div.innerHTML = "";
			div.appendChild(ol);
		}
		return div;
	}

	getSelectionHasHTML() {
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
			div = this.createNumeroteList(div, type);
		}
		return htmlToMarkdown(div.innerHTML);
	}

	copySelectionRange(editor: Editor) {
		let selectedText = "";
		const selection = editor.listSelections();
		for (const selected of selection) {
			const lineSelected = editor.getLine(selected.head.line);
			const selectedTextInLine = lineSelected.substring(selected.head.ch, selected.anchor.ch);
			selectedText += selectedTextInLine + "\n";
		}
		return selectedText;
	}

	getIframeSelectionHasHTML() {
		const editor = this.app.workspace.activeEditor;
		if (editor) {
			const editorMode = editor.editor;
			return this.copySelectionRange(editorMode);
		} else {
			return this.getSelectionHasHTML();
		}
	}


	async onload() {
		console.log(
			`CopyReadingInMarkdown v.${this.manifest.version} loaded.`
		);

		await this.loadSettings();
		
		this.addCommand({
			id: "copy-reading-in-markdown",
			name: "Copy Reading in Markdown",
			callback: () => {
				//check if in reading mode
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				let selectedText = "";
				if (activeView && activeView.getMode() !== "source") {
					selectedText = this.getSelectionHasHTML();
					//copy selected text to clipboard
				} else if (activeView) {
					//normal copy
					const editor = activeView.editor;
					//get all selection
					selectedText = this.copySelectionRange(editor);
				} else {
					const leafType = this.app.workspace.getActiveViewOfType(ItemView)?.getViewType();
					if (leafType === "canvas") {
						selectedText = this.getIframeSelectionHasHTML();
					}
				}
				if (selectedText && selectedText.trim().length > 0) {
					navigator.clipboard.writeText(selectedText);
				}
			}
		});
		
	}
	onunload() {
		console.log("unloading plugin");
	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
