import { ItemView, MarkdownView, Plugin } from "obsidian";
import {canvasSelectionText, copySelectionRange, getSelectionAsHTML} from "./utils/selection";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CopyReadingInMarkdownSettings {}
const DEFAULT_SETTINGS: CopyReadingInMarkdownSettings = {};

export default class CopyReadingInMarkdown extends Plugin {
	settings: CopyReadingInMarkdownSettings;
	
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
					selectedText = getSelectionAsHTML();
					//copy selected text to clipboard
				} else if (activeView) {
					//normal copy
					const editor = activeView.editor;
					//get all selection
					selectedText = copySelectionRange(editor);
				} else {
					const leafType = this.app.workspace.getActiveViewOfType(ItemView)?.getViewType();
					if (leafType === "canvas") {
						selectedText = canvasSelectionText(this.app);
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
