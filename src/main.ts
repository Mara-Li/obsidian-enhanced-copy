import {ItemView, MarkdownView, Plugin} from "obsidian";
import {canvasSelectionText, copySelectionRange, getSelectionAsHTML} from "./utils/selection";
import {ApplyingToView, CopyReadingInMarkdownSettings, DEFAULT_SETTINGS} from "./interface";
import {convertMarkdown} from "./utils/conversion";
import {CopyReadingInMarkdownSettingsTab} from "./settings";
import {resources, translationLanguage} from "./i18n/i18next";
import i18next from "i18next";
import { removeDataBasePluginRelationShip } from "./utils/pluginFix";

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
		
		/**
		 * Copy the selected text in markdown format
		 */
		this.addCommand({
			id: "copy-reading-in-markdown",
			name: i18next.t("commands"),
			callback: () => {
				//check if in reading mode
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				let viewIn : ApplyingToView;
				let selectedText:string;
				if (activeView && activeView.getMode() !== "source") {
					selectedText = getSelectionAsHTML(this.settings);
					viewIn = ApplyingToView.reading;
					//copy selected text to clipboard
				} else if (activeView) {
					//normal copy
					const editor = activeView.editor;
					//get all selection
					selectedText = copySelectionRange(editor);
					viewIn = ApplyingToView.edit;
				} else {
					const leafType = this.app.workspace.getActiveViewOfType(ItemView)?.getViewType();
					if (leafType === "canvas") {
						selectedText = canvasSelectionText(this.app, this.settings);
						if (app.workspace.activeEditor) {
							viewIn = ApplyingToView.edit;
						} else {
							viewIn = ApplyingToView.reading;
						}
					} else if (leafType === "database-plugin") {
						selectedText = removeDataBasePluginRelationShip();
						viewIn = ApplyingToView.reading;
					} else {
						selectedText = activeWindow.getSelection()?.toString() ?? "";
						viewIn = ApplyingToView.reading;
					}
				}
				if (selectedText && selectedText.trim().length > 0) {
					if (!this.settings.exportAsHTML) {
						if (this.settings.applyingTo === ApplyingToView.all || this.settings.applyingTo === viewIn) {
							selectedText = convertMarkdown(selectedText, this.settings);
						}
					}
					navigator.clipboard.writeText(selectedText);
				} else if (viewIn === ApplyingToView.edit) {
					navigator.clipboard.writeText(selectedText);
				}
			}
		});

	}
	onunload() {
		console.log(`CopyReadingInMarkdown v.${this.manifest.version} unloaded.`);
	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
