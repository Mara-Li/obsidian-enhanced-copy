import { EditorView } from "@codemirror/view";
import { deepmerge as merge } from "deepmerge-ts";
import i18next from "i18next";
import {
	getAllTags,
	ItemView,
	MarkdownView,
	Platform,
	Plugin,
	type WorkspaceLeaf,
} from "obsidian";

import { resources, translationLanguage } from "./i18n/i18next";
import {
	ApplyingToView,
	type AutoRules,
	DEFAULT_SETTINGS,
	type EnhancedCopySettings,
	type GlobalSettings,
	type ProfileCSS,
} from "./interface";
import { EnhancedCopySettingTab } from "./settings";
import { convertEditMarkdown, convertMarkdown } from "./utils/conversion";
import { DEFAULT_CSS, loadCssFile } from "./utils/loadCssForHtml";
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
	profileCSS: ProfileCSS = new Map();
	profileAlreadyIn: Map<string, string> = new Map();

	checkByRules(rule: AutoRules, path: string, tags: string[], frontmatter?: string[]) {
		if (rule.type === "path" && path.match(rule.value)) {
			return true;
		}
		if (rule.type === "tag" && tags.find((tag) => tag.match(rule.value))) {
			return true;
		}
		return !!(
			rule.type === "frontmatter" && frontmatter?.find((fm) => fm.match(rule.value))
		);
	}

	/**
	 * Get the profile based on file path, tag or frontmatter
	 * Needs a active file to work
	 */
	getProfile(viewOfType?: ApplyingToView) {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return;
		const path = activeFile.path;
		const cache = this.app.metadataCache.getFileCache(activeFile);
		const cacheFrontmatterKeys = cache?.frontmatter?.enhanced_copy ?? undefined;
		const enhancedCopyFrontmatter: string[] | undefined =
			cacheFrontmatterKeys && typeof cacheFrontmatterKeys === "string"
				? [cacheFrontmatterKeys]
				: cacheFrontmatterKeys;
		const tags = cache ? (getAllTags(cache) ?? []) : [];
		const profiles = this.settings.profiles;

		for (const profile of profiles) {
			if (
				viewOfType &&
				profile.applyingTo !== ApplyingToView.All &&
				profile.applyingTo !== viewOfType
			)
				continue;
			if (profile.autoRules) {
				//search if [NOT] path, tag or frontmatter is in the profile and check if it matches
				const matchNote = profile.autoRules.find(
					(rule) =>
						rule.not && this.checkByRules(rule, path, tags, enhancedCopyFrontmatter)
				);
				if (matchNote) continue;
				for (const rule of profile.autoRules) {
					if (rule.not) continue;
					if (this.checkByRules(rule, path, tags, enhancedCopyFrontmatter))
						return profile;
				}
			}
		}
	}

	async enhancedCopy(
		profile?: GlobalSettings
	): Promise<{ selectedText: string; exportAsHTML: boolean }> {
		//get default if a modal is opened
		if (document.querySelector(".modal-container")) {
			return {
				selectedText: activeWindow.getSelection()?.toString() ?? "",
				exportAsHTML: false,
			};
		}
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const file = this.app.workspace.getActiveFile();
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
						: (activeWindow.getSelection()?.toString() ?? "");
				viewIn = ApplyingToView.Reading;
			}
		}
		if (!profile) profile = this.getProfile(viewIn);
		this.devLog("Profile: ", profile);
		const defaultProfile =
			viewIn === ApplyingToView.Edit ? this.settings.editing : this.settings.reading;
		const exportAsHTML = profile
			? (profile?.copyAsHTML ?? false)
			: (defaultProfile.copyAsHTML ?? false);
		const exportAsRtf = (exportAsHTML && (profile?.rtf ?? defaultProfile.rtf)) ?? false;
		const applyingTo = profile?.applyingTo ?? this.settings.applyingTo;
		if (selectedText && selectedText.trim().length > 0) {
			if (applyingTo === ApplyingToView.All || applyingTo === viewIn) {
				if (viewIn === ApplyingToView.Reading) {
					if (exportAsRtf) {
						const css = this.profileCSS.get(profile?.name ?? "reading") ?? DEFAULT_CSS;
						selectedText = `<html><head><meta charset="utf-8"><style>${css}</style></head><body>${selectedText}</body></html>`;
					} else if (!exportAsHTML) {
						selectedText = convertMarkdown(
							selectedText,
							profile ?? this.settings.reading,
							this
						);
					}
				} else if (viewIn === ApplyingToView.Edit) {
					selectedText = await convertEditMarkdown(
						selectedText,
						profile ?? this.settings.editing,
						this,
						file?.path
					);
				}
			}
			return {
				selectedText,
				exportAsHTML: exportAsRtf,
			};
		} else if (viewIn === ApplyingToView.Edit) {
			return { selectedText, exportAsHTML: exportAsRtf };
		}
		return { selectedText, exportAsHTML: false };
	}

	async overrideNativeCopy(leaf: WorkspaceLeaf) {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		if (
			activeView &&
			activeView.getMode() !== "source" &&
			!this.settings.reading.overrideNativeCopy
		) {
			return;
		}
		if (
			activeView &&
			activeView.getMode() === "source" &&
			!this.settings.editing.overrideNativeCopy
		) {
			return;
		}

		// Intercepter directement l'événement copy au niveau du DOM
		const copyHandler = async (event: ClipboardEvent) => {
			const { selectedText, exportAsHTML } = await this.enhancedCopy();
			if (selectedText && selectedText.trim().length > 0) {
				event.preventDefault();
				event.clipboardData?.setData(
					exportAsHTML ? "text/html" : "text/plain",
					selectedText
				);
			}
		};

		// Ajouter l'événement sur l'élément container de la vue
		leaf.view.containerEl.addEventListener("copy", copyHandler);

		// Retourner une fonction de nettoyage
		return () => {
			leaf.view.containerEl.removeEventListener("copy", copyHandler);
		};
	}

	async editorCopyHandler(event: ClipboardEvent, _editor?: EditorView) {
		const { selectedText, exportAsHTML } = await this.enhancedCopy();
		event.preventDefault();
		event.clipboardData?.setData(exportAsHTML ? "text/html" : "text/plain", selectedText);
		return true;
	}

	async editorCutHandler(event: ClipboardEvent, _editor?: EditorView) {
		const { selectedText, exportAsHTML } = await this.enhancedCopy();
		event.clipboardData?.setData(exportAsHTML ? "text/html" : "text/plain", selectedText);
		event.preventDefault();
		//mimic cut behavior
		const editorObs = this.app.workspace.activeEditor?.editor;
		if (editorObs) {
			editorObs.replaceSelection("");
		}
	}

	getDefaultProfile(viewIn?: ApplyingToView) {
		if (!viewIn) {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			const readingMode = view && view.getMode() !== "source";
			viewIn = readingMode ? ApplyingToView.Reading : ApplyingToView.Edit;
		}
		const defaultProfile =
			viewIn === ApplyingToView.Edit ? this.settings.editing : this.settings.reading;
		return this.getProfile() ?? defaultProfile;
	}

	async onload() {
		console.log(`Enhanced copy v.${this.manifest.version} loaded.`);

		await i18next.init({
			lng: translationLanguage,
			fallbackLng: "en",
			resources,
			returnNull: false,
			returnEmptyString: false,
			//Shut the fuckup
			showSupportNotice: false,
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
							this.enhancedCopy(profile).then(({ selectedText }) => {
								this.writeToClipboard(selectedText, profile);
							});
						}
						return true;
					}
					return false;
				},
			});
			if (profile.cssFile) {
				if (this.profileAlreadyIn.has(profile.cssFile)) {
					this.profileCSS.set(profile.name, this.profileCSS.get(profile.cssFile)!);
					continue;
				}
				const css = await loadCssFile(this, profile.cssFile);
				//prevent loading the same css multiple times if multiple profiles use the same css file
				this.profileCSS.set(profile.name, css);
				this.profileAlreadyIn.set(profile.cssFile, profile.name);
			} else this.profileCSS.set(profile.name, DEFAULT_CSS);
		}

		if (
			!this.settings.separateHotkey ||
			this.settings.applyingTo !== ApplyingToView.All
		) {
			this.addCommand({
				id: "copy-all-in-markdown",
				name: i18next.t("commands.all"),
				callback: async () => {
					const profile = this.getProfile() ?? this.getDefaultProfile();
					await this.writeToClipboard(
						(await this.enhancedCopy(profile)).selectedText,
						profile
					);
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
					editorCallback: async (editor) => {
						const file = this.app.workspace.getActiveFile();
						let selectedText = copySelectionRange(editor, this);
						if (selectedText && selectedText.trim().length > 0) {
							const profile =
								this.getProfile(ApplyingToView.Edit) ?? this.settings.editing;
							selectedText = await convertEditMarkdown(
								selectedText,
								profile,
								this,
								file?.path
							);
							await this.writeToClipboard(selectedText, profile);
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
								if (!profile.copyAsHTML) {
									selectedText = convertMarkdown(selectedText, profile, this);
								} else if (profile.rtf) {
									const css =
										this.profileCSS.get(profile.name ?? "reading") ?? DEFAULT_CSS;
									selectedText = `<html><head><meta charset="utf-8"><style>${css}</style></head><body>${selectedText}</body></html>`;
								}
								this.writeToClipboard(selectedText, profile);
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
										: (activeWindow.getSelection()?.toString() ?? "");
								viewIn = ApplyingToView.Reading;
							}
							if (selectedText && selectedText.trim().length > 0) {
								const isProfile = this.getProfile(viewIn);
								const profile = isProfile ?? this.settings;
								if (
									profile.applyingTo === ApplyingToView.All ||
									profile.applyingTo === viewIn
								) {
									const convertFn =
										viewIn === ApplyingToView.Edit
											? convertEditMarkdown(
													selectedText,
													isProfile ?? this.settings.editing,
													this,
													this.app.workspace.getActiveFile()?.path
												)
											: convertMarkdown(
													selectedText,
													isProfile ?? this.settings.reading,
													this
												);
									Promise.resolve(convertFn)
										.then((converted) => {
											selectedText = converted;
											this.writeToClipboard(selectedText, isProfile);
										})
										.catch((err) => {
											console.error("Erreur pendant la conversion :", err);
										});
								} else {
									this.writeToClipboard(selectedText, isProfile);
								}
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
					this.activeMonkeys[leaf.id] = await this.overrideNativeCopy(leaf);
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
					//@ts-ignore
					copy: this.editorCopyHandler.bind(this),
				});
				const cutExt = EditorView.domEventHandlers({
					//@ts-ignore
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
						this.writeToClipboard(copySelectionRange(editor, this));
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
				if (editor) this.writeToClipboard(copySelectionRange(editor, this));
				else this.writeToClipboard(activeWindow.getSelection()?.toString() ?? "");
			},
		});
	}

	writeBlob(selectedText: string) {
		const blob = new Blob([selectedText], { type: "text/html" });
		const item = new ClipboardItem({
			"text/html": blob,
		});
		return [item];
	}
	async onunload() {
		console.log(`CopyReadingInMarkdown v.${this.manifest.version} unloaded.`);
		for (const monkey of Object.values(this.activeMonkeys)) {
			const actived = await monkey.remove;
			if (actived) await monkey.remove();
		}
	}
	async loadSettings() {
		const loadedData = await this.loadData();
		try {
			this.settings = merge(DEFAULT_SETTINGS, loadedData);
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

	async writeToClipboard(text: string, profile?: GlobalSettings) {
		if (profile?.rtf) {
			const item = this.writeBlob(text);
			await navigator.clipboard.write(item);
		}
		await navigator.clipboard.writeText(text);
	}
}
