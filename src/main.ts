import { ItemView, MarkdownView, Plugin } from "obsidian";
import {canvasSelectionText, copySelectionRange, getSelectionAsHTML} from "./utils/selection";
import {CopyReadingInMarkdownSettings, DEFAULT_SETTINGS} from "./interface";
import {convertMarkdown} from "./utils/textConversion";
import {CopyReadingInMarkdownSettingsTab} from "./settings";
import { resources, translationLanguage } from "./i18n/i18next";
import i18next from "i18next";

export default class CopyReadingInMarkdown extends Plugin {
	settings: CopyReadingInMarkdownSettings;
	
	async onload() {
		console.log(
			`CopyReadingInMarkdown v.${this.manifest.version} loaded.`
		);
		
		i18next.init({
			lng: translationLanguage,
			fallbackLng: "en",
			resources: resources,
			returnNull: false,
		});

		await this.loadSettings();
		this.addSettingTab(new CopyReadingInMarkdownSettingsTab(this.app, this));
		
		this.addCommand({
			id: "copy-reading-in-markdown",
			name: i18next.t("commands"),
			callback: () => {
				//check if in reading mode
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				let selectedText = "";
				if (activeView && activeView.getMode() !== "source") {
					selectedText = getSelectionAsHTML(this.settings);
					//copy selected text to clipboard
				} else if (activeView) {
					//normal copy
					const editor = activeView.editor;
					//get all selection
					selectedText = copySelectionRange(editor);
				} else {
					const leafType = this.app.workspace.getActiveViewOfType(ItemView)?.getViewType();
					if (leafType === "canvas") {
						selectedText = canvasSelectionText(this.app, this.settings);
					} else {
						selectedText = activeWindow.getSelection()?.toString() ?? "";
					}
				}
				if (selectedText && selectedText.trim().length > 0) {
					if (!this.settings.exportAsHTML) {
						selectedText = convertMarkdown(selectedText, this.settings);
					}
					navigator.clipboard.writeText(selectedText);
				}
			}
		});
		
	}
	onunload() {
		console.log("Unloading CopyReadingInMarkdown");
	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
