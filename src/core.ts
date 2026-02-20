import { EditorView } from "@codemirror/view";
import i18next from "i18next";
import {
	getAllTags,
	ItemView,
	MarkdownView,
	Platform,
	type WorkspaceLeaf,
} from "obsidian";

import {
	ApplyingToView,
	type AutoRules,
	type GlobalSettings,
	type ProfileCSS,
} from "./interface";
import type EnhancedCopy from "./main";
import { convertEditMarkdown, convertMarkdown } from "./utils/conversion";
import { DEFAULT_CSS, loadCssFile } from "./utils/loadCssForHtml";
import { removeDataBasePluginRelationShip } from "./utils/pluginFix";
import {
	canvasSelectionText,
	copySelectionRange,
	getSelectionAsHTML,
} from "./utils/selection";

export class EnhancedCopyCore {
	plugin: EnhancedCopy;
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	activeMonkeys: Record<string, any> = {};
	profileCSS: ProfileCSS = new Map();
	profileAlreadyIn: Map<string, string> = new Map();

	constructor(plugin: EnhancedCopy) {
		this.plugin = plugin;
	}

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

	getProfile(viewOfType?: ApplyingToView) {
		const activeFile = this.plugin.app.workspace.getActiveFile();
		if (!activeFile) return;
		const path = activeFile.path;
		const cache = this.plugin.app.metadataCache.getFileCache(activeFile);
		const cacheFrontmatterKeys = cache?.frontmatter?.enhanced_copy ?? undefined;
		const enhancedCopyFrontmatter: string[] | undefined =
			cacheFrontmatterKeys && typeof cacheFrontmatterKeys === "string"
				? [cacheFrontmatterKeys]
				: cacheFrontmatterKeys;
		const tags = cache ? (getAllTags(cache) ?? []) : [];
		const profiles = this.plugin.settings.profiles;

		for (const profile of profiles) {
			if (
				viewOfType &&
				profile.applyingTo !== ApplyingToView.All &&
				profile.applyingTo !== viewOfType
			)
				continue;
			if (profile.autoRules) {
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
		const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		const file = this.plugin.app.workspace.getActiveFile();
		let viewIn: ApplyingToView;
		let selectedText: string;
		if (activeView && activeView.getMode() !== "source") {
			this.devLog(i18next.t("log.readingMode"));
			selectedText = getSelectionAsHTML(profile ?? this.plugin.settings.reading);
			viewIn = ApplyingToView.Reading;
		} else if (activeView) {
			this.devLog(i18next.t("log.editMode"));
			const editor = activeView.editor;
			selectedText = copySelectionRange(editor, this.plugin);
			viewIn = ApplyingToView.Edit;
		} else {
			const leafType = this.plugin.app.workspace
				.getActiveViewOfType(ItemView)
				?.getViewType();
			if (leafType === "canvas") {
				selectedText = canvasSelectionText(this.plugin.app, this.plugin);
				viewIn = this.plugin.app.workspace.activeEditor
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
			viewIn === ApplyingToView.Edit
				? this.plugin.settings.editing
				: this.plugin.settings.reading;
		const exportAsHTML = profile
			? (profile?.copyAsHTML ?? false)
			: (defaultProfile.copyAsHTML ?? false);
		const exportAsRtf = (exportAsHTML && (profile?.rtf ?? defaultProfile.rtf)) ?? false;
		const applyingTo = profile?.applyingTo ?? this.plugin.settings.applyingTo;
		if (selectedText && selectedText.trim().length > 0) {
			if (applyingTo === ApplyingToView.All || applyingTo === viewIn) {
				if (viewIn === ApplyingToView.Reading) {
					if (exportAsRtf) {
						const css = this.profileCSS.get(profile?.name ?? "reading") ?? DEFAULT_CSS;
						selectedText = `<html><head><meta charset="utf-8"><style>${css}</style></head><body>${selectedText}</body></html>`;
					} else if (!exportAsHTML) {
						selectedText = convertMarkdown(
							selectedText,
							profile ?? this.plugin.settings.reading,
							this.plugin
						);
					}
				} else if (viewIn === ApplyingToView.Edit) {
					selectedText = await convertEditMarkdown(
						selectedText,
						profile ?? this.plugin.settings.editing,
						this.plugin,
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
		const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);

		if (
			activeView &&
			activeView.getMode() !== "source" &&
			!this.plugin.settings.reading.overrideNativeCopy
		) {
			return;
		}
		if (
			activeView &&
			activeView.getMode() === "source" &&
			!this.plugin.settings.editing.overrideNativeCopy
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
		const editorObs = this.plugin.app.workspace.activeEditor?.editor;
		if (editorObs) {
			editorObs.replaceSelection("");
		}
	}

	getDefaultProfile(viewIn?: ApplyingToView) {
		if (!viewIn) {
			const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
			const readingMode = view && view.getMode() !== "source";
			viewIn = readingMode ? ApplyingToView.Reading : ApplyingToView.Edit;
		}
		const defaultProfile =
			viewIn === ApplyingToView.Edit
				? this.plugin.settings.editing
				: this.plugin.settings.reading;
		return this.getProfile() ?? defaultProfile;
	}

	writeBlob(selectedText: string) {
		const blob = new Blob([selectedText], { type: "text/html" });
		const item = new ClipboardItem({
			"text/html": blob,
		});
		return [item];
	}

	devLog(...args: unknown[]) {
		if (!(Platform.isDesktop && this.plugin.settings.devMode)) {
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

	// New: register commands separately for clarity
	private async registerProfileCommands() {
		for (const profile of this.plugin.settings.profiles) {
			if (!profile.name) continue;
			this.plugin.addCommand({
				id: `copy-${profile.name}-in-markdown`,
				name: profile.name,
				checkCallback: (checking: boolean) => {
					const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
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
				const css = await loadCssFile(this.plugin, profile.cssFile);
				this.profileCSS.set(profile.name, css);
				this.profileAlreadyIn.set(profile.cssFile, profile.name);
			} else this.profileCSS.set(profile.name, DEFAULT_CSS);
		}
	}

	private registerCopyAllCommand() {
		this.plugin.addCommand({
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
	}

	private registerEditorCommand() {
		this.plugin.addCommand({
			id: "copy-editor-in-markdown",
			name: i18next.t("commands.editor"),
			editorCallback: async (editor) => {
				const file = this.plugin.app.workspace.getActiveFile();
				let selectedText = copySelectionRange(editor, this.plugin);
				if (selectedText && selectedText.trim().length > 0) {
					const profile =
						this.getProfile(ApplyingToView.Edit) ?? this.plugin.settings.editing;
					selectedText = await convertEditMarkdown(
						selectedText,
						profile,
						this.plugin,
						file?.path
					);
					await this.writeToClipboard(selectedText, profile);
				}
			},
		});
	}

	private registerReadingCommand() {
		this.plugin.addCommand({
			id: "copy-reading-in-markdown",
			name: i18next.t("commands.reading"),
			checkCallback: (checking: boolean) => {
				const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
				const readingMode = view && view.getMode() !== "source";
				if (readingMode) {
					if (!checking) {
						const profile =
							this.getProfile(ApplyingToView.Reading) ?? this.plugin.settings.reading;
						let selectedText = getSelectionAsHTML(profile);
						if (!profile.copyAsHTML) {
							selectedText = convertMarkdown(selectedText, profile, this.plugin);
						} else if (profile.rtf) {
							const css = this.profileCSS.get(profile.name ?? "reading") ?? DEFAULT_CSS;
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

	private registerOtherCommand() {
		this.plugin.addCommand({
			id: "copy-other-in-markdown",
			name: i18next.t("commands.other"),
			checkCallback: (checking: boolean) => {
				const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
				this.devLog(!markdownView, checking);
				if (!markdownView) {
					if (!checking) {
						const leafType = this.plugin.app.workspace
							.getActiveViewOfType(ItemView)
							?.getViewType();
						let selectedText: string;
						let viewIn: ApplyingToView;
						if (leafType === "canvas") {
							selectedText = canvasSelectionText(this.plugin.app, this.plugin);
							viewIn = this.plugin.app.workspace.activeEditor
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
							const profile = isProfile ?? this.plugin.settings;
							if (
								profile.applyingTo === ApplyingToView.All ||
								profile.applyingTo === viewIn
							) {
								const convertFn =
									viewIn === ApplyingToView.Edit
										? convertEditMarkdown(
												selectedText,
												isProfile ?? this.plugin.settings.editing,
												this.plugin,
												this.plugin.app.workspace.getActiveFile()?.path
											)
										: convertMarkdown(
												selectedText,
												isProfile ?? this.plugin.settings.reading,
												this.plugin
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

	private registerBruteCommand() {
		this.plugin.addCommand({
			id: "copy-brute",
			name: i18next.t("commands.brute"),
			callback: () => {
				const editor = this.plugin.app.workspace.activeEditor?.editor;
				if (editor) this.writeToClipboard(copySelectionRange(editor, this.plugin));
				else this.writeToClipboard(activeWindow.getSelection()?.toString() ?? "");
			},
		});
	}

	async setup() {
		await this.registerProfileCommands();

		if (
			!this.plugin.settings.separateHotkey ||
			this.plugin.settings.applyingTo !== ApplyingToView.All
		) {
			this.registerCopyAllCommand();
		} else if (this.plugin.settings.separateHotkey) {
			if (
				this.plugin.settings.applyingTo === ApplyingToView.All ||
				this.plugin.settings.applyingTo === ApplyingToView.Edit
			) {
				this.registerEditorCommand();
			}
			if (
				this.plugin.settings.applyingTo === ApplyingToView.All ||
				this.plugin.settings.applyingTo === ApplyingToView.Reading
			) {
				this.registerReadingCommand();
			}
			this.registerOtherCommand();
		}

		if (
			this.plugin.settings.reading.overrideNativeCopy ||
			this.plugin.settings.editing.overrideNativeCopy
		) {
			this.plugin.registerEvent(
				this.plugin.app.workspace.on("active-leaf-change", async (leaf) => {
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
						this.plugin.settings.reading.overrideNativeCopy
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
			if (this.plugin.settings.editing.overrideNativeCopy) {
				const copyExt = EditorView.domEventHandlers({
					//@ts-ignore
					copy: this.editorCopyHandler.bind(this),
				});
				const cutExt = EditorView.domEventHandlers({
					//@ts-ignore
					cut: this.editorCutHandler.bind(this),
				});

				this.plugin.registerEditorExtension(copyExt);
				this.plugin.registerEditorExtension(cutExt);
			}
		}

		//file menu
		this.plugin.registerEvent(
			this.plugin.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item.setTitle(i18next.t("commands.brute"));
					item.setIcon("clipboard");
					item.onClick(() => {
						this.writeToClipboard(copySelectionRange(editor, this.plugin));
					});
				});
				const profile = this.getProfile() ?? this.getDefaultProfile();
				if (profile.rtf) {
					menu.addItem((item) => {
						item.setTitle("Copy as HTML");
						item.setIcon("clipboard");
						item.onClick(async () => {
							const file = view.file;
							let selectedText = copySelectionRange(editor, this.plugin);
							if (selectedText && selectedText.trim().length > 0) {
								const profile =
									this.getProfile(ApplyingToView.Edit) ?? this.plugin.settings.editing;
								selectedText = await convertEditMarkdown(
									selectedText,
									profile,
									this.plugin,
									file?.path
								);
								await this.writeToClipboard(selectedText, profile);
							}
						});
					});
				}
			})
		);

		this.registerBruteCommand();
	}

	async teardown() {
		for (const monkey of Object.values(this.activeMonkeys)) {
			const actived = await monkey.remove;
			if (actived) await monkey.remove();
		}
		this.activeMonkeys = {};
		this.profileCSS = new Map();
		this.profileAlreadyIn = new Map();
	}
}
