import i18next from "i18next";
import {
	type App,
	PluginSettingTab,
	sanitizeHTMLToDom,
	setIcon,
	Setting,
} from "obsidian";

import {
	ApplyingToView,
	DEFAULT_DATAVIEW_SETTINGS_DISABLED,
	DEFAULT_DATAVIEW_SETTINGS_ENABLED,
	type CalloutKeepType,
	type ConversionOfFootnotes,
	type ConversionOfLinks,
	type EnhancedCopySettings,
	type GlobalSettings,
} from "./interface";
import type EnhancedCopy from "./main";
import { AllReplaceTextModal, EnhancedCopyViewModal, NameProfile } from "./modal";

interface Tab {
	name: string;
	id: string;
	icon: string;
}

export class EnhancedCopySettingTab extends PluginSettingTab {
	plugin: EnhancedCopy;
	settingsPage!: HTMLElement;
	settings: EnhancedCopySettings;

	reading: Tab = {
		name: i18next.t("reading.title"),
		id: "reading",
		icon: "book-open",
	};

	edit: Tab = {
		name: i18next.t("edit.title"),
		id: "edit",
		icon: "pencil",
	};

	tab: Tab[] = [
		{
			name: i18next.t("global.title"),
			id: "global",
			icon: "globe",
		},
	];

	createReadingSettings(settings: GlobalSettings, profile?: boolean, noRegex?: boolean) {
		new Setting(this.settingsPage).setName(i18next.t("reading.desc")).setHeading();
		new Setting(this.settingsPage)
			.setName(i18next.t("copyAsHTML"))
			.addToggle((toggle) => {
				toggle.setValue(settings.copyAsHTML ?? false).onChange(async (value) => {
					settings.copyAsHTML = value;
					await this.plugin.saveSettings();
					this.renderSettingsPage(settings.name ?? "reading");
				});
			});
		if (!settings.copyAsHTML) {
			new Setting(this.settingsPage)
				.setName(i18next.t("links"))
				.setHeading()
				.setClass("h3");
			this.links(settings);
			this.footnotes(settings);

			new Setting(this.settingsPage)
				.setName(i18next.t("unconventionalMarkdown.title"))
				.setHeading()
				.setClass("h3")
				.setDesc(i18next.t("unconventionalMarkdown.desc"));
			this.highlight(settings);
		}

		this.calloutTitle(settings);

		if (!settings.copyAsHTML) {
			new Setting(this.settingsPage)
				.setName(i18next.t("other"))
				.setHeading()
				.setClass("h3");
			this.hardBreak(settings);
			new Setting(this.settingsPage)
				.setName(i18next.t("spaceSize.title"))
				.setDesc(i18next.t("spaceSize.desc"))
				.addText((text) => {
					text
						.setPlaceholder("-1")
						.setValue(String(settings.spaceReadingSize ?? -1))
						.onChange(async (value) => {
							settings.spaceReadingSize = Number(value);
							await this.plugin.saveSettings();
						});
				});
		}
		if (!profile) this.overrideSetting(settings);
		if (!noRegex)
			this.regexReplacementButton(settings);
	}

	createEditSettings(settings: GlobalSettings, profile?: boolean, noRegex?: boolean) {
		new Setting(this.settingsPage).setName(i18next.t("edit.desc")).setHeading();

		if (this.app.plugins.enabledPlugins.has("dataview")) {
			if (!settings.convertDataview)
				settings.convertDataview = structuredClone(DEFAULT_DATAVIEW_SETTINGS_DISABLED);
			//@ts-ignore
			else if (settings.convertDataview === true)
				settings.convertDataview = structuredClone(DEFAULT_DATAVIEW_SETTINGS_ENABLED);

			new Setting(this.settingsPage)
				.setName(i18next.t("convertDataview.global.title"))
				.setDesc(i18next.t("convertDataview.global.desc"))
				.addToggle((toggle) => {
					toggle
						.setValue(settings.convertDataview?.enable ?? false)
						.onChange(async (value) => {
							if (value)
								settings.convertDataview = structuredClone(
									DEFAULT_DATAVIEW_SETTINGS_ENABLED
								);
							else
								settings.convertDataview = structuredClone(
									DEFAULT_DATAVIEW_SETTINGS_DISABLED
								);
							await this.plugin.saveSettings();
							this.renderSettingsPage(settings.name ?? "edit");
						});
				});

			if (settings.convertDataview?.enable) {
				new Setting(this.settingsPage)
					.setHeading()
					.setClass("dataview")
					.setName(i18next.t("convertDataview.dql.title"));
				new Setting(this.settingsPage)
					.setName(i18next.t("convertDataview.block"))
					.setClass("dataview")
					.addToggle((toggle) => {
						toggle
							.setValue(settings.convertDataview?.djs.block ?? false)
							.onChange(async (value) => {
								settings.convertDataview!.djs.block = value;
								await this.plugin.saveSettings();
							});
					});
				new Setting(this.settingsPage)
					.setName(i18next.t("convertDataview.inline"))
					.setClass("dataview")
					.addToggle((toggle) => {
						toggle
							.setValue(settings.convertDataview?.djs.inline ?? false)
							.onChange(async (value) => {
								settings.convertDataview!.djs.inline = value;
								await this.plugin.saveSettings();
								this.renderSettingsPage(settings.name ?? "edit");
							});
					});
				new Setting(this.settingsPage)
					.setHeading()
					.setClass("dataview")
					.setName(i18next.t("convertDataview.djs.title"));
				new Setting(this.settingsPage)
					.setName(i18next.t("convertDataview.block"))
					.setClass("dataview")
					.addToggle((toggle) => {
						toggle
							.setValue(settings.convertDataview?.dql.block ?? false)
							.onChange(async (value) => {
								settings.convertDataview!.dql.block = value;
								await this.plugin.saveSettings();
							});
					});

				new Setting(this.settingsPage)
					.setName(i18next.t("convertDataview.inline"))
					.setClass("dataview")
					.addToggle((toggle) => {
						toggle
							.setValue(settings.convertDataview?.dql.inline ?? false)
							.onChange(async (value) => {
								settings.convertDataview!.dql.inline = value;
								await this.plugin.saveSettings();
								this.renderSettingsPage(settings.name ?? "edit");
							});
					});
			}
		}

		new Setting(this.settingsPage)
			.setName(i18next.t("wikiToMarkdown.title"))
			.setDesc(i18next.t("wikiToMarkdown.desc"))
			.addToggle((toggle) => {
				toggle.setValue(settings.wikiToMarkdown ?? false).onChange(async (value) => {
					settings.wikiToMarkdown = value;
					await this.plugin.saveSettings();
					this.renderSettingsPage(settings.name ?? "edit");
				});
			});

		new Setting(this.settingsPage)
			.setName(i18next.t("tabToSpace"))
			.addToggle((toggle) => {
				toggle.setValue(settings.tabToSpace ?? false).onChange(async (value) => {
					settings.tabToSpace = value;
					await this.plugin.saveSettings();
					this.renderSettingsPage(settings.name ?? "edit");
				});
			});

		if (settings.tabToSpace) {
			new Setting(this.settingsPage)
				.setName(i18next.t("tabSpaceSize"))
				.addText((text) => {
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
		}
		new Setting(this.settingsPage)
			.setName(i18next.t("links"))
			.setHeading()
			.setClass("h3");
		if (settings.wikiToMarkdown) {
			this.links(settings);
		}
		this.footnotes(settings);
		new Setting(this.settingsPage)
			.setName(i18next.t("unconventionalMarkdown.title"))
			.setHeading()
			.setClass("h3")
			.setDesc(i18next.t("unconventionalMarkdown.desc"));

		this.calloutTitle(settings);
		this.highlight(settings);

		new Setting(this.settingsPage)
			.setName(i18next.t("other"))
			.setHeading()
			.setClass("h3");

		this.hardBreak(settings);
		if (!profile) this.overrideSetting(settings);
		if (!noRegex)
			this.regexReplacementButton(settings);
	}

	constructor(app: App, plugin: EnhancedCopy) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = plugin.settings;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.containerEl.addClasses(["enhanced-copy", "setting-tab"]);
		const tabBar = containerEl.createEl("nav", { cls: "settings-tab-bar" });
		//remove Tab based on applying
		if (this.settings.applyingTo === ApplyingToView.Reading) {
			this.tab.push(this.reading);
			this.tab.remove(this.edit);
		} else if (this.settings.applyingTo === ApplyingToView.Edit) {
			this.tab.push(this.edit);
			this.tab.remove(this.reading);
		} else {
			this.tab.push(this.edit);
			this.tab.push(this.reading);
		}

		for (const profile of this.settings.profiles) {
			//remove all previous profile
			this.tab = this.tab.filter((tab) => tab.id !== profile.name);
			this.tab.push({
				name: profile.name ?? "profile",
				id: profile.name ?? "profile",
				icon: "layers-2",
			});
		}
		this.tab = [...new Set(this.tab)];

		for (const tabInfo of this.tab) {
			const tabEl = tabBar.createEl("div", { cls: "settings-tab" });
			const tabIcon = tabEl.createEl("div", { cls: "settings-tab-icon" });
			setIcon(tabIcon, tabInfo.icon);
			if (tabInfo.id === "global") tabEl.addClasses(["settings-tab-active"]);
			tabEl.createEl("div", { cls: "tabName", text: tabInfo.name });
			tabEl.addEventListener("click", () => {
				// @ts-ignore
				for (const tabEl of tabBar.children) tabEl.removeClasses(["settings-tab-active"]);

				tabEl.addClasses(["settings-tab-active"]);
				this.renderSettingsPage(tabInfo.id);
			});
		}
		this.settingsPage = containerEl.createEl("div", { cls: "settings-tab-page" });
		this.renderSettingsPage("global");
	}

	renderSettingsPage(tab: string) {
		this.settingsPage.empty();
		switch (tab) {
			case "global":
				this.renderGlobal();
				break;
			case "reading":
				this.renderReading();
				break;
			case "edit":
				this.renderEdit();
				break;
			default:
				this.renderProfile(tab);
				break;
		}
	}

	renderProfile(tab: string) {
		const profile = this.settings.profiles.find((profile) => profile.name === tab);
		if (!profile) return;
		this.settingsPage.empty();
		new Setting(this.settingsPage)
			.addButton((button) => {
				button
					.setButtonText(i18next.t("profile.delete"))
					.onClick(async () => {
						const index = this.settings.profiles.findIndex(
							(profile) => profile.name === tab
						);
						this.settings.profiles.splice(index, 1);
						//remove from tabs
						this.tab = this.tab.filter((tab) => tab.id !== profile.name);
						await this.plugin.saveSettings();
						this.display();
						this.renderGlobal();
					})
					.buttonEl.classList.add("full-width");
			})
			.infoEl.classList.add("hide-info");
		profile.applyingTo = profile.applyingTo ?? ApplyingToView.All;

		new Setting(this.settingsPage).setName(profile.name ?? "profile").setHeading();

		new Setting(this.settingsPage)
			.setName(i18next.t("view.title"))
			.setDesc(i18next.t("view.desc"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("all", i18next.t("view.all"))
					.addOption("reading", i18next.t("view.reading"))
					.addOption("edit", i18next.t("view.edit"))
					.setValue(profile.applyingTo ?? ApplyingToView.All)
					.onChange(async (value) => {
						profile.applyingTo = value as ApplyingToView;
						await this.plugin.saveSettings();
						this.renderSettingsPage(tab);
					});
			});

		new Setting(this.settingsPage)
			.setName(i18next.t("auto.title"))
			.setDesc(sanitizeHTMLToDom(i18next.t("auto.desc")))
			.addExtraButton((button) =>
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
						this.renderSettingsPage(tab);
					})
			);
		for (const rules of profile.autoRules ?? []) {
			new Setting(this.settingsPage)
				.addDropdown((dp) => {
					dp.addOption("not", i18next.t("auto.not"))
						.addOption("equal", i18next.t("auto.EQUAL"))
						.setValue(!rules.not ? "equal" : "not")
						.onChange(async (value) => {
							rules.not = value === "not";
							await this.plugin.saveSettings();
						});
				})
				.setClass("no-display")
				.setClass("full-width")
				.addDropdown((dropdown) => {
					dropdown
						.addOption("path", i18next.t("auto.path"))
						.addOption("tag", i18next.t("auto.tag"))
						.addOption("frontmatter", i18next.t("auto.frontmatter"))
						.setValue(rules.type)
						.onChange(async (value) => {
							rules.type = value as "path" | "tag" | "frontmatter";
							await this.plugin.saveSettings();
						});
				})
				.addText((text) => {
					text
						.setValue(rules.value)
						.setPlaceholder(i18next.t("auto.placeholder"))
						.onChange(async (value) => {
							rules.value = value;
							await this.plugin.saveSettings();
						});
				})
				.addExtraButton((button) => {
					button.setIcon("trash").onClick(async () => {
						const index = profile.autoRules?.findIndex((rule) => rule === rules);
						if (index === undefined) return;
						profile.autoRules?.splice(index, 1);
						await this.plugin.saveSettings();
						this.renderSettingsPage(tab);
					});
				})
				.addExtraButton((button) => {
					button.setIcon("chevron-up").onClick(async () => {
						const index = profile.autoRules?.findIndex((rule) => rule === rules);
						if (index === undefined || index <= 0) return;
						profile.autoRules?.splice(index, 1);
						profile.autoRules?.splice(index - 1, 0, rules);
						await this.plugin.saveSettings();
						this.renderSettingsPage(tab);
					});
				})
				.addExtraButton((button) => {
					button.setIcon("chevron-down").onClick(async () => {
						const index = profile.autoRules?.findIndex((rule) => rule === rules);
						if (
							index === undefined ||
							(profile.autoRules && index >= profile.autoRules.length - 1)
						)
							return;
						profile.autoRules?.splice(index, 1);
						profile.autoRules?.splice(index + 1, 0, rules);
						await this.plugin.saveSettings();
						this.renderSettingsPage(tab);
					});
				});
		}
		if (profile.applyingTo === ApplyingToView.All) {
			this.createReadingSettings(profile, true, true);
			this.createEditSettings(profile, true, true);
			this.regexReplacementButton(profile);
		} else if (profile.applyingTo === ApplyingToView.Reading) {
			this.createReadingSettings(profile, true);
		} else if (profile.applyingTo === ApplyingToView.Edit) {
			this.createEditSettings(profile, true);
		}
	}

	renderGlobal() {
		this.settingsPage.empty();
		this.settingsPage.addClasses(["global"]);
		new Setting(this.settingsPage).addButton((button) => {
			button
				.setButtonText(i18next.t("profile.add.title"))
				.setTooltip(i18next.t("profile.add.desc"))
				.onClick(async () => {
					new NameProfile(this.app, (result) => {
						this.settings.profiles.push({
							name: result,
							...this.settings.editing,
						});
						this.plugin.saveSettings();
						this.display();
					}).open();
				});
		});
		new Setting(this.settingsPage).setName(i18next.t("global.title")).setHeading();
		new Setting(this.settingsPage)
			.setName(i18next.t("view.title"))
			.setDesc(i18next.t("view.desc"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("all", i18next.t("view.all"))
					.addOption("reading", i18next.t("view.reading"))
					.addOption("edit", i18next.t("view.edit"))
					.setValue(this.settings.applyingTo)
					.onChange(async (value) => {
						this.settings.applyingTo = value as ApplyingToView;
						await this.plugin.saveSettings();
						if (this.settings.applyingTo === ApplyingToView.Edit) {
							this.settings.copyAsHTML = false;
							await this.plugin.saveSettings();
						}
						this.display();
					});
			});

		new Setting(this.settingsPage)
			.setName(i18next.t("hotkey.title"))
			.setDesc(i18next.t("hotkey.desc"))
			.addToggle((toggle) => {
				toggle.setValue(this.settings.separateHotkey).onChange(async (value) => {
					this.settings.separateHotkey = value;
					await this.plugin.saveSettings();
					this.renderSettingsPage("global");
				});
			});

		new Setting(this.settingsPage)
			.addButton((button) => {
				button
					.setButtonText(i18next.t("global.copy"))
					.onClick(async () => {
						new EnhancedCopyViewModal(this.app, this.settings, (result) => {
							this.settings = result;
							this.plugin.saveSettings();
							this.display();
						}).open();
					})
					.buttonEl.classList.add("full-width");
			})
			.infoEl.classList.add("hide-info");

		new Setting(this.settingsPage)
			.setName(i18next.t("debug.title"))
			.setDesc(i18next.t("debug.desc"))
			.addToggle((toggle) => {
				toggle.setValue(this.settings.devMode).onChange(async (value) => {
					this.settings.devMode = value;
					await this.plugin.saveSettings();
				});
			});
	}

	renderReading() {
		this.settingsPage.empty();
		this.settingsPage.addClasses(["reading"]);
		this.createReadingSettings(this.settings.reading);
	}

	renderEdit() {
		this.settingsPage.empty();
		this.settingsPage.addClasses(["edit"]);
		this.createEditSettings(this.settings.editing);
	}

	highlight(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("highlight.title"))
			.setDesc(i18next.t("highlight.desc"))
			.addToggle((toggle) => {
				toggle.setValue(settings.highlight).onChange(async (value) => {
					settings.highlight = value;
					await this.plugin.saveSettings();
				});
			});
	}

	overrideSetting(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("overrideCopy.title"))
			.setDesc(i18next.t("overrideCopy.desc"))
			.addToggle((toggle) => {
				toggle.setValue(settings.overrideNativeCopy).onChange(async (value) => {
					settings.overrideNativeCopy = value;
					await this.plugin.saveSettings();
				});
			});
	}

	calloutTitle(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("callout.title"))
			.setDesc(i18next.t("callout.desc"))
			.setClass("enhanced-copy-dp")
			.addDropdown((dropdown) => {
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
	}

	footnotes(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("removeFootnotesLinks.title"))
			.setDesc(i18next.t("removeFootnotesLinks.desc"))
			.setClass("enhanced-copy-dp")
			.addDropdown((dropdown) => {
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
	}

	links(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("copyLinksAsText.title"))
			.setDesc(i18next.t("copyLinksAsText.desc"))
			.setClass("enhanced-copy-dp")
			.addDropdown((dropdown) => {
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
	}

	hardBreak(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("hardBreaks.title"))
			.setDesc(i18next.t("hardBreaks.desc"))
			.addToggle((toggle) => {
				toggle.setValue(settings.hardBreak).onChange(async (value) => {
					settings.hardBreak = value;
					await this.plugin.saveSettings();
				});
			});
	}

	regexReplacementButton(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.addButton((button) => {
				button
					.setButtonText(i18next.t("openTextReplacer"))
					.onClick(async () => {
						if (!settings.replaceText) settings.replaceText = [];
						new AllReplaceTextModal(
							this.app,
							structuredClone(settings.replaceText),
							async (result) => {
								settings.replaceText = result;
							}
						).open();
						await this.plugin.saveSettings();
					})
					.buttonEl.classList.add("full-width");
			})
			.infoEl.classList.add("hide-info");
	}
}
