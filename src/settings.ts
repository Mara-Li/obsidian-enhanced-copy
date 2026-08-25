import { isPluginEnabled } from "@enveloppe/obsidian-dataview";
import i18next from "i18next";
import {
	type App,
	Notice,
	normalizePath,
	PluginSettingTab,
	type SettingDefinitionItem,
	type SettingDefinitionList,
	type SettingDefinitionPage,
	type SettingDefinitionRender,
	sanitizeHTMLToDom,
} from "obsidian";

import {
	ApplyingToView,
	type CalloutKeepType,
	type ConversionOfFootnotes,
	type ConversionOfLinks,
	DEFAULT_DATAVIEW_SETTINGS_DISABLED,
	DEFAULT_DATAVIEW_SETTINGS_ENABLED,
	type EnhancedCopySettings,
	type GlobalSettings,
} from "./interface";
import type EnhancedCopy from "./main";
import { EnhancedCopyViewModal, NameProfile } from "./modal";
import { DEFAULT_CSS, loadCssFile } from "./utils/loadCssForHtml";

export class EnhancedCopySettingTab extends PluginSettingTab {
	plugin: EnhancedCopy;
	settings: EnhancedCopySettings;

	constructor(app: App, plugin: EnhancedCopy) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = plugin.settings;
	}

	validateRegex(pattern: string): boolean {
		try {
			if (pattern.match(/^\/.*\/([gmiyus]+)?$/)) {
				const flags = pattern.replace(/^\/.*\/([gmiyus]+)?$/, "$1");
				const regex = pattern.replace(/^\/(.*)\/(.*)$/, "$1");
				new RegExp(regex, flags.length > 0 ? flags : undefined);
			}
			return true; //valid or string
		} catch {
			return false;
		}
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		//keep the container scoped for the existing stylesheet (heading sizes, dropdown width...)
		if (this.containerEl) this.containerEl.addClasses(["enhanced-copy", "setting-tab"]);

		return [
			this.viewDropdownItem(),
			this.hotkeyItem(),
			this.copyBetweenProfilesItem(),
			this.debugItem(),
			{
				type: "page",
				name: i18next.t("edit.title"),
				desc: i18next.t("edit.desc"),
				visible: () => this.settings.applyingTo !== ApplyingToView.Reading,
				items: this.editItems(this.settings.editing),
			},
			{
				type: "page",
				name: i18next.t("reading.title"),
				desc: i18next.t("reading.desc"),
				visible: () => this.settings.applyingTo !== ApplyingToView.Edit,
				items: this.readingItems(this.settings.reading),
			},
			this.profilesList(),
		];
	}

	/** Global settings (root of the tab, no sub-page) */

	private viewDropdownItem(): SettingDefinitionRender {
		return {
			name: i18next.t("view.title"),
			desc: i18next.t("view.desc"),
			render: (setting) => {
				setting.addDropdown((dropdown) => {
					dropdown
						.addOption("all", i18next.t("view.all"))
						.addOption("reading", i18next.t("view.reading"))
						.addOption("edit", i18next.t("view.edit"))
						.setValue(this.settings.applyingTo)
						.onChange(async (value) => {
							this.settings.applyingTo = value as ApplyingToView;
							if (this.settings.applyingTo === ApplyingToView.Edit) {
								this.settings.copyAsHTML = false;
								this.settings.rtf = false;
							}
							if (
								this.settings.applyingTo === ApplyingToView.Reading &&
								this.settings.editing.overrideNativeCopy
							) {
								this.settings.editing.overrideNativeCopy = false;
								new Notice(i18next.t("overrideCopy.editingNotice"));
							} else if (
								this.settings.applyingTo === ApplyingToView.Edit &&
								this.settings.reading.overrideNativeCopy
							) {
								this.settings.reading.overrideNativeCopy = false;
								new Notice(i18next.t("overrideCopy.readingNotice"));
							}
							await this.plugin.saveSettings();
							this.refreshDomState();
						});
				});
			},
		};
	}

	private hotkeyItem(): SettingDefinitionRender {
		return {
			name: i18next.t("hotkey.title"),
			desc: i18next.t("hotkey.desc"),
			render: (setting) => {
				setting.addToggle((toggle) => {
					toggle.setValue(this.settings.separateHotkey).onChange(async (value) => {
						this.settings.separateHotkey = value;
						await this.plugin.saveSettings();
					});
				});
			},
		};
	}

	private copyBetweenProfilesItem(): SettingDefinitionRender {
		return {
			name: "",
			render: (setting) => {
				setting.infoEl.classList.add("hide-info");
				setting.addButton((button) => {
					button.setButtonText(i18next.t("global.copy")).onClick(async () => {
						new EnhancedCopyViewModal(this.app, this.settings, (result) => {
							this.settings = result;
							void this.plugin.saveSettings();
							this.update();
						}).open();
					});
					button.buttonEl.classList.add("full-width");
				});
			},
		};
	}

	private debugItem(): SettingDefinitionRender {
		return {
			name: i18next.t("debug.title"),
			desc: i18next.t("debug.desc"),
			render: (setting) => {
				setting.addToggle((toggle) => {
					toggle.setValue(this.settings.devMode).onChange(async (value) => {
						this.settings.devMode = value;
						await this.plugin.saveSettings();
					});
				});
			},
		};
	}

	/** Profiles: a list of navigable sub-pages, one per profile */

	private profilesList(): SettingDefinitionList {
		return {
			type: "list",
			addItem: {
				name: i18next.t("profile.add.title"),
				action: () => {
					new NameProfile(this.app, (result) => {
						this.settings.profiles.push({
							name: result,
							...this.settings.editing,
						});
						void this.plugin.saveSettings();
						this.update();
					}).open();
				},
			},
			items: this.settings.profiles.map((profile) => this.profilePage(profile)),
		};
	}

	private profilePage(profile: GlobalSettings): SettingDefinitionPage {
		return {
			type: "page",
			name: profile.name || i18next.t("common.profile"),
			items: this.profileItems(profile),
		};
	}

	private profileItems(profile: GlobalSettings): SettingDefinitionItem[] {
		profile.applyingTo = profile.applyingTo ?? ApplyingToView.All;
		const items: SettingDefinitionItem[] = [];

		items.push({
			name: "",
			render: (setting) => {
				setting.infoEl.classList.add("hide-info");
				setting.addButton((button) => {
					button.setButtonText(i18next.t("profile.delete")).onClick(async () => {
						const index = this.settings.profiles.indexOf(profile);
						if (index === -1) return;
						this.settings.profiles.splice(index, 1);
						await this.plugin.saveSettings();
						this.update();
					});
					button.buttonEl.classList.add("full-width");
				});
			},
		});

		items.push({
			name: i18next.t("view.title"),
			desc: i18next.t("view.desc"),
			render: (setting) => {
				setting.addDropdown((dropdown) => {
					dropdown
						.addOption("all", i18next.t("view.all"))
						.addOption("reading", i18next.t("view.reading"))
						.addOption("edit", i18next.t("view.edit"))
						.setValue(profile.applyingTo ?? ApplyingToView.All)
						.onChange(async (value) => {
							profile.applyingTo = value as ApplyingToView;
							await this.plugin.saveSettings();
							this.update();
						});
				});
			},
		});

		items.push(...this.autoRulesItems(profile));

		if (profile.applyingTo === ApplyingToView.All) {
			//shared between the two modes: kept on the profile page itself
			items.push(...this.htmlItems(profile, "edit"));
			items.push({
				type: "page",
				name: i18next.t("reading.title"),
				items: this.readingItems(profile, true, true, false),
			});
			items.push({
				type: "page",
				name: i18next.t("edit.title"),
				items: this.editItems(profile, true, true, false),
			});
			items.push(this.regexReplacementPage(profile));
		} else if (profile.applyingTo === ApplyingToView.Reading) {
			items.push(...this.readingItems(profile, true));
		} else if (profile.applyingTo === ApplyingToView.Edit) {
			items.push(...this.editItems(profile, true));
		}
		return items;
	}

	private autoRulesItems(profile: GlobalSettings): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];
		items.push({
			name: i18next.t("auto.title"),
			desc: sanitizeHTMLToDom(i18next.t("auto.desc")),
			render: (setting) => {
				setting.addExtraButton((button) => {
					button
						.setIcon("plus")
						.setTooltip("Add new rule")
						.onClick(async () => {
							profile.autoRules = profile.autoRules ?? [];
							profile.autoRules.unshift({
								type: "path",
								value: "",
							});
							await this.plugin.saveSettings();
							this.update();
						});
				});
			},
		});
		items.push({
			type: "list",
			onReorder: (oldIndex, newIndex) => {
				const rules = profile.autoRules ?? [];
				const [moved] = rules.splice(oldIndex, 1);
				rules.splice(newIndex, 0, moved);
				void this.plugin.saveSettings();
			},
			onDelete: (index) => {
				profile.autoRules?.splice(index, 1);
				void this.plugin.saveSettings();
				this.update();
			},
			items: (profile.autoRules ?? []).map(
				(rule): SettingDefinitionRender => ({
					name: "",
					searchable: false,
					render: (setting) => {
						setting.setClass("no-display");
						setting.setClass("full-width");
						setting.addDropdown((dp) => {
							dp.addOption("not", i18next.t("auto.not"))
								.addOption("equal", i18next.t("auto.EQUAL"))
								.setValue(!rule.not ? "equal" : "not")
								.onChange(async (value) => {
									rule.not = value === "not";
									await this.plugin.saveSettings();
								});
						});
						setting.addDropdown((dropdown) => {
							dropdown
								.addOption("path", i18next.t("auto.path"))
								.addOption("tag", i18next.t("auto.tag"))
								.addOption("frontmatter", i18next.t("auto.frontmatter"))
								.setValue(rule.type)
								.onChange(async (value) => {
									rule.type = value as "path" | "tag" | "frontmatter";
									await this.plugin.saveSettings();
								});
						});
						setting.addText((text) => {
							text
								.setValue(rule.value)
								.setPlaceholder(i18next.t("auto.placeholder"))
								.onChange(async (value) => {
									rule.value = value;
									await this.plugin.saveSettings();
								});
						});
					},
				})
			),
		});
		return items;
	}

	/** Reading / Edit sections, shared between the root tab and profile sub-pages */

	private readingItems(
		settings: GlobalSettings,
		profile?: boolean,
		noRegex?: boolean,
		html: boolean = true
	): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];
		if (html) items.push(...this.htmlItems(settings, "reading"));

		items.push({
			name: i18next.t("links"),
			visible: () => !settings.copyAsHTML,
			render: (setting) => {
				setting.setHeading().setClass("h3");
			},
		});
		items.push(this.linksItem(settings, () => !settings.copyAsHTML));
		items.push(this.footnotesItem(settings, () => !settings.copyAsHTML));

		items.push({
			name: i18next.t("unconventionalMarkdown.title"),
			desc: i18next.t("unconventionalMarkdown.desc"),
			visible: () => !settings.copyAsHTML,
			render: (setting) => {
				setting.setHeading().setClass("h3");
			},
		});
		items.push(this.highlightItem(settings, () => !settings.copyAsHTML));

		items.push(this.calloutTitleItem(settings));

		items.push({
			name: i18next.t("other"),
			visible: () => !settings.copyAsHTML,
			render: (setting) => {
				setting.setHeading().setClass("h3");
			},
		});
		items.push(this.hardBreakItem(settings, () => !settings.copyAsHTML));
		items.push({
			name: i18next.t("spaceSize.title"),
			desc: i18next.t("spaceSize.desc"),
			visible: () => !settings.copyAsHTML,
			render: (setting) => {
				setting.addText((text) => {
					text
						.setPlaceholder("-1")
						.setValue(String(settings.spaceReadingSize ?? -1))
						.onChange(async (value) => {
							settings.spaceReadingSize = Number(value);
							await this.plugin.saveSettings();
						});
				});
			},
		});

		if (!profile) items.push(this.overrideSettingItem(settings));
		if (!noRegex) items.push(this.regexReplacementPage(settings));
		return items;
	}

	private editItems(
		settings: GlobalSettings,
		profile?: boolean,
		noRegex?: boolean,
		html: boolean = true
	): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];
		if (html) items.push(...this.htmlItems(settings, "edit"));

		if (isPluginEnabled(this.app)) {
			if (!settings.convertDataview)
				settings.convertDataview = structuredClone(DEFAULT_DATAVIEW_SETTINGS_DISABLED);
			//@ts-ignore legacy boolean-shaped setting migration
			else if (settings.convertDataview === true)
				settings.convertDataview = structuredClone(DEFAULT_DATAVIEW_SETTINGS_ENABLED);

			items.push({
				name: i18next.t("convertDataview.global.title"),
				desc: i18next.t("convertDataview.global.desc"),
				render: (setting) => {
					setting.addToggle((toggle) => {
						toggle
							.setValue(settings.convertDataview?.enable ?? false)
							.onChange(async (value) => {
								settings.convertDataview = structuredClone(
									value
										? DEFAULT_DATAVIEW_SETTINGS_ENABLED
										: DEFAULT_DATAVIEW_SETTINGS_DISABLED
								);
								await this.plugin.saveSettings();
								this.refreshDomState();
							});
					});
				},
			});

			const dataviewVisible = () => settings.convertDataview?.enable ?? false;
			items.push({
				name: i18next.t("convertDataview.dql.title"),
				visible: dataviewVisible,
				render: (setting) => {
					setting.setHeading().setClass("dataview");
				},
			});
			items.push(this.dataviewToggleItem(settings, "djs", "block", dataviewVisible));
			items.push(this.dataviewToggleItem(settings, "djs", "inline", dataviewVisible));
			items.push({
				name: i18next.t("convertDataview.djs.title"),
				visible: dataviewVisible,
				render: (setting) => {
					setting.setHeading().setClass("dataview");
				},
			});
			items.push(this.dataviewToggleItem(settings, "dql", "block", dataviewVisible));
			items.push(this.dataviewToggleItem(settings, "dql", "inline", dataviewVisible));
		}

		items.push({
			name: i18next.t("wikiToMarkdown.title"),
			desc: i18next.t("wikiToMarkdown.desc"),
			render: (setting) => {
				setting.addToggle((toggle) => {
					toggle.setValue(settings.wikiToMarkdown ?? false).onChange(async (value) => {
						settings.wikiToMarkdown = value;
						await this.plugin.saveSettings();
						this.refreshDomState();
					});
				});
			},
		});

		items.push({
			name: i18next.t("tabToSpace"),
			render: (setting) => {
				setting.addToggle((toggle) => {
					toggle.setValue(settings.tabToSpace ?? false).onChange(async (value) => {
						settings.tabToSpace = value;
						await this.plugin.saveSettings();
						this.refreshDomState();
					});
				});
			},
		});
		items.push({
			name: i18next.t("tabSpaceSize"),
			visible: () => settings.tabToSpace ?? false,
			render: (setting) => {
				setting.addText((text) => {
					text
						.setValue(settings.tabSpaceSize ? settings.tabSpaceSize.toString() : "4")
						.onChange(async (value) => {
							settings.tabSpaceSize = parseInt(value);
							text.inputEl.toggleClass(
								"error",
								isNaN(settings.tabSpaceSize) || settings.tabSpaceSize < 0
							);
							if (isNaN(settings.tabSpaceSize) || settings.tabSpaceSize < 0)
								settings.tabSpaceSize = 4;
							await this.plugin.saveSettings();
						});
				});
			},
		});

		items.push({
			name: i18next.t("links"),
			render: (setting) => {
				setting.setHeading().setClass("h3");
			},
		});
		items.push(this.linksItem(settings, () => settings.wikiToMarkdown ?? false));
		items.push(this.footnotesItem(settings));
		items.push({
			name: i18next.t("unconventionalMarkdown.title"),
			desc: i18next.t("unconventionalMarkdown.desc"),
			render: (setting) => {
				setting.setHeading().setClass("h3");
			},
		});
		items.push(this.calloutTitleItem(settings));
		items.push(this.highlightItem(settings));
		items.push({
			name: i18next.t("other"),
			render: (setting) => {
				setting.setHeading().setClass("h3");
			},
		});
		items.push(this.hardBreakItem(settings));

		if (!profile) items.push(this.overrideSettingItem(settings));
		if (!noRegex) items.push(this.regexReplacementPage(settings));
		return items;
	}

	private htmlItems(
		settings: GlobalSettings,
		type: "reading" | "edit" = "reading"
	): SettingDefinitionItem[] {
		const items: SettingDefinitionItem[] = [];
		items.push({
			name: i18next.t("copyAsHTML"),
			render: (setting) => {
				setting.addToggle((toggle) => {
					toggle.setValue(settings.copyAsHTML ?? false).onChange(async (value) => {
						settings.copyAsHTML = value;
						await this.plugin.saveSettings();
						this.refreshDomState();
					});
				});
			},
		});
		items.push({
			name: i18next.t("rtf.name"),
			desc: `${i18next.t("rtf.desc")}`,
			visible: () => settings.copyAsHTML ?? false,
			render: (setting) => {
				setting.addToggle((toggle) => {
					toggle.setValue(settings.rtf ?? false).onChange(async (value) => {
						settings.rtf = value;
						await this.plugin.saveSettings();
						this.refreshDomState();
					});
				});
			},
		});
		items.push({
			name: i18next.t("cssFile.title"),
			desc: sanitizeHTMLToDom(
				`${i18next.t("cssFile.desc")}<br>${i18next.t("cssFile.link", { link: `<a href="https://github.com/Mara-Li/obsidian-enhanced-copy/blob/master/src/utils/loadCssForHtml.ts#L3-L195">${i18next.t("common.here")}</a>` })}`
			),
			visible: () => (settings.copyAsHTML && settings.rtf) ?? false,
			render: (setting) => {
				setting.addText((text) => {
					text
						.setPlaceholder(".obsidian/snippets/export.css")
						.setValue(settings.cssFile ?? "")
						.onChange(async (value) => {
							settings.cssFile = value;
						});
					text.inputEl.onblur = async () => {
						let value = text.getValue();
						text.inputEl.classList.remove("error");
						if (value.trim() === "" || !value.length) {
							settings.cssFile = undefined;
							//unload
							this.plugin.profileCSS.set(settings?.name ?? type, DEFAULT_CSS);
							await this.plugin.saveSettings();
							return;
						}
						if (!value.length && !value.endsWith(".css")) {
							new Notice(i18next.t("cssFile.invalid"));
							text.inputEl.classList.add("error");
							this.plugin.profileCSS.set(settings?.name ?? type, DEFAULT_CSS);
							return;
						}
						value = normalizePath(value);
						if (!(await this.app.vault.adapter.exists(value))) {
							new Notice(i18next.t("cssFile.notFound"));
							text.inputEl.classList.add("error");
							this.plugin.profileCSS.set(settings?.name ?? type, DEFAULT_CSS);
						} else {
							settings.cssFile = value;
							await this.plugin.saveSettings();
							if (this.plugin.profileAlreadyIn.has(value)) {
								const profileWithCss = this.plugin.profileAlreadyIn.get(value)!;
								const cssAlreadyLoaded = this.plugin.profileCSS.get(profileWithCss)!;
								this.plugin.profileCSS.set(settings.name ?? type, cssAlreadyLoaded);
							} else
								this.plugin.profileCSS.set(
									settings.name ?? type,
									await loadCssFile(this.plugin, value)
								);
						}
					};
				});
			},
		});
		return items;
	}

	private dataviewToggleItem(
		settings: GlobalSettings,
		lang: "djs" | "dql",
		kind: "block" | "inline",
		visible: () => boolean
	): SettingDefinitionRender {
		return {
			name: i18next.t(
				kind === "block" ? "convertDataview.block" : "convertDataview.inline"
			),
			visible,
			render: (setting) => {
				setting.setClass("dataview");
				setting.addToggle((toggle) => {
					toggle
						.setValue(settings.convertDataview?.[lang][kind] ?? false)
						.onChange(async (value) => {
							settings.convertDataview![lang][kind] = value;
							await this.plugin.saveSettings();
						});
				});
			},
		};
	}

	private highlightItem(
		settings: GlobalSettings,
		visible?: () => boolean
	): SettingDefinitionRender {
		return {
			name: i18next.t("highlight.title"),
			desc: i18next.t("highlight.desc"),
			visible,
			render: (setting) => {
				setting.addToggle((toggle) => {
					toggle.setValue(settings.highlight).onChange(async (value) => {
						settings.highlight = value;
						await this.plugin.saveSettings();
					});
				});
			},
		};
	}

	private overrideSettingItem(settings: GlobalSettings): SettingDefinitionRender {
		return {
			name: i18next.t("overrideCopy.title"),
			desc: i18next.t("overrideCopy.desc"),
			render: (setting) => {
				setting.addToggle((toggle) => {
					toggle.setValue(settings.overrideNativeCopy).onChange(async (value) => {
						settings.overrideNativeCopy = value;
						await this.plugin.saveSettings();
					});
				});
			},
		};
	}

	private calloutTitleItem(settings: GlobalSettings): SettingDefinitionRender {
		return {
			name: i18next.t("callout.title"),
			desc: i18next.t("callout.desc"),
			render: (setting) => {
				setting.setClass("enhanced-copy-dp");
				setting.addDropdown((dropdown) => {
					dropdown
						.addOption("obsidian", i18next.t("callout.obsidian"))
						.addOption("strong", i18next.t("callout.strong"))
						.addOption("remove", i18next.t("callout.remove"))
						.addOption("removeKeepTitle", i18next.t("callout.removeKeepTitle"))
						.setValue(settings.callout)
						.onChange(async (value) => {
							settings.callout = value as CalloutKeepType;
							await this.plugin.saveSettings();
						});
				});
			},
		};
	}

	private footnotesItem(
		settings: GlobalSettings,
		visible?: () => boolean
	): SettingDefinitionRender {
		return {
			name: i18next.t("removeFootnotesLinks.title"),
			desc: i18next.t("removeFootnotesLinks.desc"),
			visible,
			render: (setting) => {
				setting.setClass("enhanced-copy-dp");
				setting.addDropdown((dropdown) => {
					dropdown
						.addOption("keep", i18next.t("removeFootnotesLinks.keep"))
						.addOption("remove", i18next.t("removeFootnotesLinks.remove"))
						.addOption("format", i18next.t("removeFootnotesLinks.format"))
						.setValue(settings.footnotes)
						.onChange(async (value) => {
							settings.footnotes = value as ConversionOfFootnotes;
							await this.plugin.saveSettings();
						});
				});
			},
		};
	}

	private linksItem(
		settings: GlobalSettings,
		visible?: () => boolean
	): SettingDefinitionRender {
		return {
			name: i18next.t("copyLinksAsText.title"),
			desc: i18next.t("copyLinksAsText.desc"),
			visible,
			render: (setting) => {
				setting.setClass("enhanced-copy-dp");
				setting.addDropdown((dropdown) => {
					dropdown
						.addOption("keep", i18next.t("copyLinksAsText.keep"))
						.addOption("remove", i18next.t("copyLinksAsText.remove"))
						.addOption("external", i18next.t("copyLinksAsText.external"))
						.setValue(settings.links)
						.onChange(async (value) => {
							settings.links = value as ConversionOfLinks;
							await this.plugin.saveSettings();
						});
				});
			},
		};
	}

	private hardBreakItem(
		settings: GlobalSettings,
		visible?: () => boolean
	): SettingDefinitionRender {
		return {
			name: i18next.t("hardBreaks.title"),
			desc: i18next.t("hardBreaks.desc"),
			visible,
			render: (setting) => {
				setting.addToggle((toggle) => {
					toggle.setValue(settings.hardBreak).onChange(async (value) => {
						settings.hardBreak = value;
						await this.plugin.saveSettings();
					});
				});
			},
		};
	}

	/** Text replacer: a sub-page instead of a modal */

	private regexReplacementPage(settings: GlobalSettings): SettingDefinitionPage {
		if (!settings.replaceText) settings.replaceText = [];
		return {
			type: "page",
			name: i18next.t("openTextReplacer"),
			items: [this.replaceTextList(settings)],
		};
	}

	private replaceTextList(settings: GlobalSettings): SettingDefinitionList {
		const replaceText = settings.replaceText;
		return {
			type: "list",
			addItem: {
				name: i18next.t("common.add"),
				action: () => {
					replaceText.unshift({ pattern: "", replacement: "" });
					void this.plugin.saveSettings();
					this.update();
				},
			},
			onReorder: (oldIndex, newIndex) => {
				const [moved] = replaceText.splice(oldIndex, 1);
				replaceText.splice(newIndex, 0, moved);
				void this.plugin.saveSettings();
			},
			onDelete: (index) => {
				replaceText.splice(index, 1);
				void this.plugin.saveSettings();
				this.update();
			},
			items: replaceText.map(
				(replacer): SettingDefinitionRender => ({
					name: "",
					searchable: false,
					render: (setting) => {
						setting.infoEl.classList.add("hide-info");
						setting.addText((text) => {
							text
								.setPlaceholder(i18next.t("common.pattern"))
								.setValue(replacer.pattern)
								.onChange(async (value) => {
									replacer.pattern = value;
									text.inputEl.classList.remove("error");
									await this.plugin.saveSettings();
								});
							text.inputEl.classList.add("full-width");
							text.inputEl.addEventListener("blur", () => {
								if (!this.validateRegex(replacer.pattern)) {
									new Notice(`Invalid regex for ${replacer.pattern}`);
									text.inputEl.classList.add("error");
								}
							});
						});
						setting.addText((text) => {
							text
								.setPlaceholder(i18next.t("common.replacement"))
								.setValue(replacer.replacement)
								.onChange(async (value) => {
									replacer.replacement = value;
									await this.plugin.saveSettings();
								});
							text.inputEl.classList.add("full-width");
						});
					},
				})
			),
		};
	}
}
