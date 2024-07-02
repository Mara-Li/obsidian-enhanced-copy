import { EditorView } from "@codemirror/view";
import i18next from "i18next";
import { around } from "monkey-around";
import {
	getAllTags,
	ItemView,
	MarkdownView,
	Platform,
	Plugin,
	type WorkspaceLeaf,
} from "obsidian";
import merge from "ts-deepmerge";

import { resources, translationLanguage } from "./i18n/i18next";
import {
	ApplyingToView,
	DEFAULT_SETTINGS,
	type EnhancedCopySettings,
	type GlobalSettings,
} from "./interface";
import { EnhancedCopySettingTab } from "./settings";
import { convertEditMarkdown, convertMarkdown } from "./utils/conversion";
import { removeDataBasePluginRelationShip } from "./utils/pluginFix";
import {
	canvasSelectionText,
	copySelectionRange,
	getSelectionAsHTML,
} from "./utils/selection";

export default class EnhancedCopy extends Plugin {
	settings: EnhancedCopySettings = DEFAULT_SETTINGS;
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	activeMonkeys: Record<string, any> = {};

	/**
	 * Get the profile based on file path, tag or frontmatter
	 * Needs a active file to work
	 */
	getProfile(viewOfType?: ApplyingToView) {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return;
		const path = activeFile.path;
		const cache = this.app.metadataCache.getFileCache(activeFile);
		const cacheFrontmatterKeys = cache?.frontmatter?.enhanced_copy;
		const enhancedCopyFrontmatter: string[] =
			cacheFrontmatterKeys && typeof cacheFrontmatterKeys === "string"
				? [cacheFrontmatterKeys]
				: cacheFrontmatterKeys;
		const tags = cache ? getAllTags(cache) ?? [] : [];
		const profiles = this.settings.profiles;
		for (const profile of profiles) {
			if (profile.autoRules) {
				for (const rule of profile.autoRules) {
					if (
						viewOfType &&
						profile.applyingTo !== ApplyingToView.All &&
						profile.applyingTo !== viewOfType
					)
						continue;
					if (rule.type === "path" && path.match(rule.value)) {
						return profile;
					}
					if (rule.type === "tag" && tags.find((tag) => tag.match(rule.value))) {
						return profile;
					}
					if (rule.type === "frontmatter" && enhancedCopyFrontmatter) {
						return profile;
					}
				}
			}
		}
	}

	enhancedCopy(profile?: GlobalSettings) {
		//get default if a modal is opened
		if (document.querySelector(".modal-container")) {
			return activeWindow.getSelection()?.toString() ?? "";
		}
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let viewIn: ApplyingToView;
		let selectedText: string;
		if (activeView && activeView.getMode() !== "source") {
			this.devLog(i18next.t("log.readingMode"));
			selectedText = getSelectionAsHTML(profile ?? this.settings.reading);
			viewIn = ApplyingToView.Reading;
		} else if (activeView) {
			this.devLog(i18next.t("log.editMode"));
			const editor = activeView.editor;
			selectedText = copySelectionRange(editor, this);
			viewIn = ApplyingToView.Edit;
		} else {
			const leafType = this.app.workspace.getActiveViewOfType(ItemView)?.getViewType();
			if (leafType === "canvas") {
				selectedText = canvasSelectionText(this.app, this);
				viewIn = this.app.workspace.activeEditor
					? ApplyingToView.Edit
					: ApplyingToView.Reading;
			} else {
				selectedText =
					leafType === "database-plugin"
						? removeDataBasePluginRelationShip()
						: activeWindow.getSelection()?.toString() ?? "";
				viewIn = ApplyingToView.Reading;
			}
		}
		if (!profile) profile = this.getProfile(viewIn);
		this.devLog("Profile: ", profile);
		const exportAsHTML = profile
			? profile?.copyAsHTML ?? false
			: this.settings.reading.copyAsHTML;
		const applyingTo = profile?.applyingTo ?? this.settings.applyingTo;
		if (selectedText && selectedText.trim().length > 0) {
			if (!exportAsHTML && (applyingTo === ApplyingToView.All || applyingTo === viewIn)) {
				selectedText =
					viewIn === ApplyingToView.Edit
						? convertEditMarkdown(selectedText, profile ?? this.settings.editing, this)
						: convertMarkdown(selectedText, profile ?? this.settings.reading, this);
			}
			return selectedText;
		} else if (viewIn === ApplyingToView.Edit) {
			return selectedText;
		}
		return selectedText;
	}

	overrideNativeCopy(leaf: WorkspaceLeaf) {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (
			activeView &&
			activeView.getMode() !== "source" &&
			!this.settings.reading.overrideNativeCopy
		)
			return;
		if (
			activeView &&
			activeView.getMode() === "source" &&
			!this.settings.editing.overrideNativeCopy
		)
			return;
		try {
			return around(leaf.view, {
				//@ts-ignore
				handleCopy: () => {
					return (event: ClipboardEvent) => {
						try {
							const selectedText = this.enhancedCopy();
							if (selectedText) {
								event.preventDefault();
								event.clipboardData?.setData("text/plain", selectedText);
							}
							//old(event);
						} catch (e) {
							console.error(e);
						}
					};
				},
			});
		} catch (e) {
			console.error(e);
		}
	}

	editorCopyHandler(event: ClipboardEvent, _editor?: EditorView) {
		const selectedText = this.enhancedCopy();
		event.preventDefault();
		event.clipboardData?.setData("text/plain", selectedText);
	}

	editorCutHandler(event: ClipboardEvent, _editor?: EditorView) {
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
		console.log(`Enhanced copy v.${this.manifest.version} loaded.`);

		await i18next.init({
			lng: translationLanguage,
			fallbackLng: "en",
			resources,
			returnNull: false,
			returnEmptyString: false,
		});

		await this.loadSettings();
		this.addSettingTab(new EnhancedCopySettingTab(this.app, this));

		for (const profile of this.settings.profiles) {
			if (!profile.name) continue;
			this.addCommand({
				id: `copy-${profile.name}-in-markdown`,
				name: profile.name,
				checkCallback: (checking: boolean) => {
					const view = this.app.workspace.getActiveViewOfType(MarkdownView);
					const readingMode = view && view.getMode() !== "source";
					if (
						profile.applyingTo === ApplyingToView.All ||
						(profile.applyingTo === ApplyingToView.Reading && readingMode) ||
						(profile.applyingTo === ApplyingToView.Edit && !readingMode)
					) {
						if (!checking) {
							navigator.clipboard.writeText(this.enhancedCopy(profile));
						}
						return true;
					}
					return false;
				},
			});
		}

		if (
			!this.settings.separateHotkey ||
			this.settings.applyingTo !== ApplyingToView.All
		) {
			this.addCommand({
				id: "copy-all-in-markdown",
				name: i18next.t("commands.all"),
				callback: () => {
					navigator.clipboard.writeText(this.enhancedCopy());
				},
			});
		} else if (this.settings.separateHotkey) {
			if (
				this.settings.applyingTo === ApplyingToView.All ||
				this.settings.applyingTo === ApplyingToView.Edit
			) {
				this.addCommand({
					id: "copy-editor-in-markdown",
					name: i18next.t("commands.editor"),
					editorCallback: (editor) => {
						let selectedText = copySelectionRange(editor, this);
						if (selectedText && selectedText.trim().length > 0) {
							const profile =
								this.getProfile(ApplyingToView.Edit) ?? this.settings.editing;
							selectedText = convertEditMarkdown(selectedText, profile, this);
							navigator.clipboard.writeText(selectedText);
						}
					},
				});
			}
			if (
				this.settings.applyingTo === ApplyingToView.All ||
				this.settings.applyingTo === ApplyingToView.Reading
			) {
				this.addCommand({
					id: "copy-reading-in-markdown",
					name: i18next.t("commands.reading"),
					checkCallback: (checking: boolean) => {
						const view = this.app.workspace.getActiveViewOfType(MarkdownView);
						const readingMode = view && view.getMode() !== "source";
						if (readingMode) {
							if (!checking) {
								const profile =
									this.getProfile(ApplyingToView.Reading) ?? this.settings.reading;
								let selectedText = getSelectionAsHTML(profile);
								if (!this.settings.copyAsHTML) {
									selectedText = convertMarkdown(selectedText, profile, this);
								}
								navigator.clipboard.writeText(selectedText);
							}
							return true;
						}
						return false;
					},
				});
			}

			this.addCommand({
				id: "copy-other-in-markdown",
				name: i18next.t("commands.other"),
				checkCallback: (checking: boolean) => {
					//everything not markdown view
					const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
					this.devLog(!markdownView, checking);
					if (!markdownView) {
						if (!checking) {
							const leafType = this.app.workspace
								.getActiveViewOfType(ItemView)
								?.getViewType();
							let selectedText: string;
							let viewIn: ApplyingToView;
							if (leafType === "canvas") {
								selectedText = canvasSelectionText(this.app, this);
								viewIn = this.app.workspace.activeEditor
									? ApplyingToView.Edit
									: ApplyingToView.Reading;
							} else {
								selectedText =
									leafType === "database-plugin"
										? removeDataBasePluginRelationShip()
										: activeWindow.getSelection()?.toString() ?? "";
								viewIn = ApplyingToView.Reading;
							}
							if (selectedText && selectedText.trim().length > 0) {
								const isProfile = this.getProfile(viewIn);
								const profile = isProfile ?? this.settings;
								if (
									!profile.copyAsHTML &&
									(profile.applyingTo === ApplyingToView.All ||
										profile.applyingTo === viewIn)
								) {
									selectedText =
										viewIn === ApplyingToView.Edit
											? convertEditMarkdown(
													selectedText,
													isProfile ?? this.settings.editing,
													this
												)
											: convertMarkdown(
													selectedText,
													isProfile ?? this.settings.reading,
													this
												);
								}
								navigator.clipboard.writeText(selectedText);
							}
						}
						return true;
					}
					return false;
				},
			});
		}

		if (
			this.settings.reading.overrideNativeCopy ||
			this.settings.editing.overrideNativeCopy
		) {
			this.registerEvent(
				this.app.workspace.on("active-leaf-change", async (leaf) => {
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
					if (
						leaf.view instanceof ItemView &&
						leaf.view.getViewType() === "canvas" &&
						this.settings.reading.overrideNativeCopy
					) {
						leaf.view.containerEl.addEventListener("copy", (event) => {
							this.editorCopyHandler(event);
						});
						leaf.view.containerEl.addEventListener("cut", (event) => {
							this.editorCutHandler(event);
						});
					}
				})
			);
			if (this.settings.editing.overrideNativeCopy) {
				//register for editor
				const copyExt = EditorView.domEventHandlers({
					copy: this.editorCopyHandler.bind(this),
				});
				const cutExt = EditorView.domEventHandlers({
					cut: this.editorCutHandler.bind(this),
				});

				this.registerEditorExtension(copyExt);
				this.registerEditorExtension(cutExt);
			}
		}
		//file menu
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, _view) => {
				menu.addItem((item) => {
					item.setTitle(i18next.t("commands.brute"));
					item.setIcon("clipboard");
					item.onClick(() => {
						navigator.clipboard.writeText(copySelectionRange(editor, this));
					});
				});
			})
		);
		//use the native copy
		this.addCommand({
			id: "copy-brute",
			name: i18next.t("commands.brute"),
			callback: () => {
				const editor = this.app.workspace.activeEditor?.editor;
				if (editor) {
					navigator.clipboard.writeText(copySelectionRange(editor, this));
				} else {
					navigator.clipboard.writeText(activeWindow.getSelection()?.toString() ?? "");
				}
			},
		});
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
			this.settings = merge(
				DEFAULT_SETTINGS,
				loadedData
			) as unknown as EnhancedCopySettings;
		} catch (_e) {
			console.warn(
				"[Enhanced copy] Error while deep merging settings, using default loading method"
			);
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
		callFunction = callFunction?.substring(
			callFunction.indexOf("at ") + 3,
			callFunction.lastIndexOf(" (")
		);
		callFunction = callFunction!.replace("Object.callback", "");
		callFunction = callFunction.length > 0 ? callFunction : "main";
		const date = new Date().toISOString().slice(11, 23);
		console.log(`[${date}](${callFunction}):\n`, ...args);
	}
}
