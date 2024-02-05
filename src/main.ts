import {EditorView} from "@codemirror/view";
import i18next from "i18next";
import {around} from "monkey-around";
import { ItemView, MarkdownView, Platform, Plugin, WorkspaceLeaf} from "obsidian";
import merge from "ts-deepmerge";

import {resources, translationLanguage} from "./i18n/i18next";
import {ApplyingToView, DEFAULT_SETTINGS,EnhancedCopySettings} from "./interface";
import {EnhancedCopySettingTab} from "./settings";
import {convertEditMarkdown, convertMarkdown,} from "./utils/conversion";
import {removeDataBasePluginRelationShip} from "./utils/pluginFix";
import {canvasSelectionText, copySelectionRange, getSelectionAsHTML} from "./utils/selection";

export default class EnhancedCopy extends Plugin {
	settings: EnhancedCopySettings = DEFAULT_SETTINGS;
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	activeMonkeys: Record<string, any> = {};

	enhancedCopy() {
		//get default if a modal is opened
		if (document.querySelector(".modal-container")) {
			return activeWindow.getSelection()?.toString() ?? "";
		}
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let viewIn: ApplyingToView;
		let selectedText: string;
		if (activeView && activeView.getMode() !== "source") {
			this.devLog(i18next.t("log.readingMode"));
			selectedText = getSelectionAsHTML(this.settings);
			viewIn = ApplyingToView.reading;
		} else if (activeView) {
			this.devLog(i18next.t("log.editMode"));
			const editor = activeView.editor;
			selectedText = copySelectionRange(editor, this);
			viewIn = ApplyingToView.edit;
		} else {
			const leafType = this.app.workspace.getActiveViewOfType(ItemView)?.getViewType();
			if (leafType === "canvas") {
				selectedText = canvasSelectionText(this.app, this);
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
					convertEditMarkdown(selectedText, this.settings.editing, this) :
					convertMarkdown(selectedText, this.settings.reading, this);
			}
			return selectedText;
		} else if (viewIn === ApplyingToView.edit) {
			return selectedText;
		}
		return selectedText;
	}

	overrideNativeCopy(leaf: WorkspaceLeaf) {
		try {
			return around(leaf.view, {
				//@ts-ignore
				handleCopy: () =>{
					return (event: ClipboardEvent) => {
						try {
							const selectedText = this.enhancedCopy();
							if (selectedText) {
								event.preventDefault();
								event.clipboardData?.setData("text/plain", selectedText);
							}
							//old(event);
						}
						catch (e) {
							console.error(e);
						}
					};
				}
			});
		}
		catch (e) {
			console.error(e);
		}
	}

	//eslint-disable-next-line @typescript-eslint/no-unused-vars
	editorCopyHandler(event: ClipboardEvent, editor?: EditorView) {
		const selectedText = this.enhancedCopy();
		event.preventDefault();
		event.clipboardData?.setData("text/plain", selectedText);
	}

	//eslint-disable-next-line @typescript-eslint/no-unused-vars
	editorCutHandler(event: ClipboardEvent, editor?: EditorView) {
		const selectedText = this.enhancedCopy();
		event.clipboardData?.setData("text/plain", selectedText);
		event.preventDefault();
		//mimic cut behavior
		const editorObs = this.app.workspace.activeEditor?.editor;
		if (editorObs) {
			editorObs.replaceSelection("");
		}
	}


	async onload() {
		console.log(
			`Enhanced copy v.${this.manifest.version} loaded.`
		);

		await i18next.init({
			lng: translationLanguage,
			fallbackLng: "en",
			resources,
			returnNull: false,
		});

		await this.loadSettings();
		this.addSettingTab(new EnhancedCopySettingTab(this.app, this));

		/**
		 * Copy the selected text in markdown format
		 */
		if (!this.settings.separateHotkey || this.settings.applyingTo !== ApplyingToView.all) {
			this.addCommand({
				id: "copy-all-in-markdown",
				name: i18next.t("commands.all"),
				callback: () => {
					navigator.clipboard.writeText(this.enhancedCopy());
				}
			});
		} else if (this.settings.separateHotkey && this.settings.applyingTo === ApplyingToView.all) {
			this.addCommand({
				id: "copy-editor-in-markdown",
				name: i18next.t("commands.editor"),
				editorCallback: (editor) => {
					let selectedText = copySelectionRange(editor, this);
					if (selectedText && selectedText.trim().length > 0) {
						selectedText = convertEditMarkdown(selectedText, this.settings.editing, this);
						navigator.clipboard.writeText(selectedText);
					}
				}
			});

			this.addCommand({
				id: "copy-reading-in-markdown",
				name: i18next.t("commands.reading"),
				checkCallback: (checking: boolean) => {
					const view = this.app.workspace.getActiveViewOfType(MarkdownView);
					const readingMode = view && view.getMode() !== "source";
					if (readingMode) {
						if (!checking) {
							let selectedText = getSelectionAsHTML(this.settings);
							if (!this.settings.exportAsHTML) {
								selectedText = convertMarkdown(selectedText, this.settings.reading, this);
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
				checkCallback: (checking: boolean) => {
					//everything not markdown view
					const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
					this.devLog(!markdownView, checking);
					if (!markdownView) {
						if (!checking) {
							const leafType = this.app.workspace.getActiveViewOfType(ItemView)?.getViewType();
							let selectedText: string;
							let viewIn: ApplyingToView;
							if (leafType === "canvas") {
								selectedText = canvasSelectionText(this.app, this);
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
										convertEditMarkdown(selectedText, this.settings.editing, this) :
										convertMarkdown(selectedText, this.settings.reading, this);
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

		if (this.settings.overrideCopy) {
			this.registerEvent(this.app.workspace.on("active-leaf-change", async (leaf) => {
				if (!leaf) {
					for (const monkey of Object.values(this.activeMonkeys)) {
						monkey();
					}
					this.activeMonkeys = {};
					return;
				}
				//@ts-ignore
				this.activeMonkeys[leaf.id] = this.overrideNativeCopy(leaf);
				//enable clipboard event in canvas read-only
				if (leaf.view instanceof ItemView && leaf.view.getViewType() === "canvas") {
					leaf.view.containerEl.addEventListener("copy", (event) => {
						this.editorCopyHandler(event);
					});
					leaf.view.containerEl.addEventListener("cut", (event) => {
						this.editorCutHandler(event);
					});

				}
			}));
			//register for editor
			const copyExt = EditorView.domEventHandlers({
				copy: this.editorCopyHandler.bind(this)
			});
			const cutExt = EditorView.domEventHandlers({
				cut: this.editorCutHandler.bind(this)
			});

			this.registerEditorExtension(copyExt);
			this.registerEditorExtension(cutExt);
		}
	}
	onunload() {
		console.log(`CopyReadingInMarkdown v.${this.manifest.version} unloaded.`);
		for (const monkey of Object.values(this.activeMonkeys)) {
			monkey();
		}
	}
	async loadSettings() {
		const loadedData = await this.loadData();
		try {
			this.settings = merge(DEFAULT_SETTINGS, loadedData) as unknown as EnhancedCopySettings;
		} catch (e) {
			console.warn("[Enhanced copy] Error while deep merging settings, using default loading method");
			this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
		}
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}
	devLog(...args: unknown[]) {
		if (!(Platform.isDesktop && this.settings.devMode)) {
			return;
		}
		let callFunction = new Error().stack?.split("\n")[2].trim();
		callFunction = callFunction?.substring(callFunction.indexOf("at ") + 3, callFunction.lastIndexOf(" ("));
		callFunction = callFunction!.replace("Object.callback", "");
		callFunction = callFunction.length > 0 ? callFunction : "main";
		const date = new Date().toISOString().slice(11, 23);
		console.log(`[${date}](${callFunction}):\n`, ...args);
	}
}
