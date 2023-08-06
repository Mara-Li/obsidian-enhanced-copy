import i18next from "i18next";
import {ItemView, MarkdownView, Plugin} from "obsidian";

import {resources, translationLanguage} from "./i18n/i18next";
import {ApplyingToView, CopyReadingInMarkdownSettings, DEFAULT_SETTINGS} from "./interface";
import {CopyReadingMarkdownSettingsTab} from "./settings";
import {convertEditMarkdown, convertMarkdown,} from "./utils/conversion";
import {devLog} from "./utils/log";
import {removeDataBasePluginRelationShip} from "./utils/pluginFix";
import {canvasSelectionText, copySelectionRange, getSelectionAsHTML} from "./utils/selection";

export default class CopyReadingInMarkdown extends Plugin {
	settings: CopyReadingInMarkdownSettings = DEFAULT_SETTINGS;
	
	async onload() {
		console.log(
			`CopyReadingInMarkdown v.${this.manifest.version} loaded.`
		);
		
		await i18next.init({
			lng: translationLanguage,
			fallbackLng: "en",
			resources: resources,
			returnNull: false,
		});

		await this.loadSettings();
		this.addSettingTab(new CopyReadingMarkdownSettingsTab(this.app, this));
		
		/**
		 * Copy the selected text in markdown format
		 */
		if (!this.settings.separateHotkey || this.settings.applyingTo !== ApplyingToView.all) {
			this.addCommand({
				id: "copy-all-in-markdown",
				name: i18next.t("commands.all"),
				callback: () => {
					//check if in reading mode
					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					let viewIn: ApplyingToView;
					let selectedText: string;
					if (activeView && activeView.getMode() !== "source") {
						devLog("Reading mode");
						selectedText = getSelectionAsHTML(this.settings);
						viewIn = ApplyingToView.reading;
					} else if (activeView) {
						devLog("Edit mode");
						//normal copy
						const editor = activeView.editor;
						//get all selection
						selectedText = copySelectionRange(editor);
						viewIn = ApplyingToView.edit;
					} else {
						const leafType = this.app.workspace.getActiveViewOfType(ItemView)?.getViewType();
						if (leafType === "canvas") {
							selectedText = canvasSelectionText(this.app, this.settings);
							viewIn = this.app.workspace.activeEditor ? ApplyingToView.edit : ApplyingToView.reading;
						} else {
							selectedText = leafType === "database-plugin" ? removeDataBasePluginRelationShip() : activeWindow.getSelection()?.toString() ?? "";
							viewIn = ApplyingToView.reading;
						}
					}
					if (selectedText && selectedText.trim().length > 0) {
						if (!this.settings.exportAsHTML &&
							(this.settings.applyingTo === ApplyingToView.all || this.settings.applyingTo === viewIn)
						) {
							selectedText = viewIn === ApplyingToView.edit
								?
								convertEditMarkdown(selectedText, this.settings.editing, this.settings) :
								convertMarkdown(selectedText, this.settings, this.settings.reading);
						}
						navigator.clipboard.writeText(selectedText);
					} else if (viewIn === ApplyingToView.edit) {
						navigator.clipboard.writeText(selectedText);
					}
				}
			});
		} else {
			this.addCommand({
				id: "copy-editor-in-markdown",
				name: i18next.t("commands.editor"),
				hotkeys: [],
				editorCallback: (editor) => {
					let selectedText = copySelectionRange(editor);
					if (selectedText && selectedText.trim().length > 0) {
						selectedText = convertEditMarkdown(selectedText, this.settings.editing, this.settings);
						navigator.clipboard.writeText(selectedText);
					}
				}
			});
			
			this.addCommand({
				id: "copy-reading-in-markdown",
				name: i18next.t("commands.reading"),
				hotkeys: [],
				checkCallback: (checking: boolean) => {
					const view = this.app.workspace.getActiveViewOfType(MarkdownView);
					const readingMode = view && view.getMode() !== "source";
					if (readingMode) {
						if (!checking) {
							let selectedText = getSelectionAsHTML(this.settings);
							if (!this.settings.exportAsHTML) {
								selectedText = convertMarkdown(selectedText, this.settings, this.settings.reading);
							}
							navigator.clipboard.writeText(selectedText);
						}
						return true;
					}
					return false;
				}
			});
			
			this.addCommand({
				id: "copy-other-in-markdown",
				name: i18next.t("commands.other"),
				hotkeys: [],
				checkCallback: (checking: boolean) => {
					//everything not markdown view
					const markdownView =  this.app.workspace.getActiveViewOfType(MarkdownView);
					devLog(!markdownView, checking);
					if (!markdownView) {
						if (!checking) {
							const leafType = this.app.workspace.getActiveViewOfType(ItemView)?.getViewType();
							let selectedText: string;
							let viewIn: ApplyingToView;
							if (leafType === "canvas") {
								selectedText = canvasSelectionText(this.app, this.settings);
								viewIn = this.app.workspace.activeEditor ? ApplyingToView.edit : ApplyingToView.reading;
							} else {
								selectedText = leafType === "database-plugin" ? removeDataBasePluginRelationShip() : activeWindow.getSelection()?.toString() ?? "";
								viewIn = ApplyingToView.reading;
							}
							if (selectedText && selectedText.trim().length > 0) {
								if (!this.settings.exportAsHTML &&
									(this.settings.applyingTo === ApplyingToView.all || this.settings.applyingTo === viewIn)
								) {
									selectedText = viewIn === ApplyingToView.edit
										?
										convertEditMarkdown(selectedText, this.settings.editing, this.settings) :
										convertMarkdown(selectedText, this.settings, this.settings.reading);
								}
								navigator.clipboard.writeText(selectedText);
							}
						}
						return true;
					}
					return false;
				}
			});
		}

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
