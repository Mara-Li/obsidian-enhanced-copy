import i18next from "i18next";
import { App, PluginSettingTab, setIcon, Setting } from "obsidian";

import { ApplyingToView, CalloutKeepType, ConversionOfFootnotes, ConversionOfLinks, EnhancedCopySettings, GlobalSettings } from "./interface";
import EnhancedCopy from "./main";
import { AllReplaceTextModal, EnhancedCopyViewModal, NameProfile } from "./modal";

interface Tab {
	name: string;
	id: string
	icon: string;
}

export class EnhancedCopySettingTab extends PluginSettingTab {
	plugin: EnhancedCopy;
	settingsPage!: HTMLElement;
	settings: EnhancedCopySettings;

	READING: Tab = {
		name: i18next.t("reading.title"),
		id: "reading",
		icon: "book-open"
	};

	EDIT: Tab = {
		name: i18next.t("edit.title"),
		id: "edit",
		icon: "pencil"
	};

	TABS: Tab[] = [
		{
			name: i18next.t("global.title"),
			id: "global",
			icon: "globe"
		},
	];

	createReadingSettings(settings: GlobalSettings, profile?: boolean) {
		new Setting(this.settingsPage).setName(i18next.t("reading.desc")).setHeading();
		new Setting(this.settingsPage)
			.setName(i18next.t("copyAsHTML"))
			.addToggle((toggle) => {
				toggle
					.setValue(settings.copyAsHTML ?? false)
					.onChange(async (value) => {
						settings.copyAsHTML = value;
						await this.plugin.saveSettings();
						this.renderSettingsPage(settings.name ?? "reading");
					});
			});
		if (!settings.copyAsHTML) {
			new Setting(this.settingsPage).setName(i18next.t("links")).setHeading().setClass("h2");
			this.links(settings);
			this.footnotes(settings);

			new Setting(this.settingsPage).setName(i18next.t("unconventionalMarkdown.title"))
				.setHeading()
				.setClass("h2")
				.setDesc(i18next.t("unconventionalMarkdown.desc"));
			this.highlight(settings);
		}

		this.calloutTitle(settings);

		if (!settings.copyAsHTML) {
			new Setting(this.settingsPage)
				.setName(i18next.t("other"))
				.setHeading()
				.setClass("h2");
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
		this.regexReplacementButton(settings);
	}

	createEditSettings(settings: GlobalSettings, profile?: boolean) {
		new Setting(this.settingsPage)
			.setName(i18next.t("edit.desc"))
			.setHeading();

		new Setting(this.settingsPage)
			.setName(i18next.t("wikiToMarkdown.title"))
			.setDesc(i18next.t("wikiToMarkdown.desc"))
			.addToggle((toggle) => {
				toggle
					.setValue(settings.wikiToMarkdown ?? false)
					.onChange(async (value) => {
						settings.wikiToMarkdown = value;
						await this.plugin.saveSettings();
						this.renderSettingsPage(settings.name ?? "edit");
					});
			});

		new Setting(this.settingsPage)
			.setName(i18next.t("tabToSpace"))
			.addToggle((toggle) => {
				toggle
					.setValue(settings.tabToSpace ?? false)
					.onChange(async (value) => {
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
							text.inputEl.toggleClass("error", isNaN(settings.tabSpaceSize) || settings.tabSpaceSize < 0);
							if (isNaN(settings.tabSpaceSize) || settings.tabSpaceSize < 0) settings.tabSpaceSize = 4;
							await this.plugin.saveSettings();
						});
				});
		}
		new Setting(this.settingsPage)
			.setName(i18next.t("links"))
			.setHeading()
			.setClass("h2");
		if (settings.wikiToMarkdown) {
			this.links(settings);
		}
		this.footnotes(settings);
		new Setting(this.settingsPage)
			.setName(i18next.t("unconventionalMarkdown.title"))
			.setHeading()
			.setClass("h2")
			.setDesc(i18next.t("unconventionalMarkdown.desc"));

		this.calloutTitle(settings);
		this.highlight(settings);

		new Setting(this.settingsPage)
			.setName(i18next.t("other") )
			.setHeading()
			.setClass("h2");

		this.hardBreak(settings);
		if (!profile) this.overrideSetting(settings);
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
		if (this.settings.applyingTo === ApplyingToView.reading) {
			this.TABS.push(this.READING);
			this.TABS.remove(this.EDIT);
		} else if (this.settings.applyingTo === ApplyingToView.edit) {
			this.TABS.push(this.EDIT);
			this.TABS.remove(this.READING);
		} else {
			this.TABS.push(this.EDIT);
			this.TABS.push(this.READING);
		}
		
		for (const profile of this.settings.profiles) {
			//remove all previous profile
			this.TABS = this.TABS.filter((tab) => tab.id !== profile.name);
			this.TABS.push({
				name: profile.name ?? "profile",
				id: profile.name ?? "profile",
				icon: "layers-2"
			});
		}
		this.TABS = [...new Set(this.TABS)];
		
		for (const tabInfo of this.TABS) {
			const tabEl = tabBar.createEl("div", { cls: "settings-tab" });
			const tabIcon = tabEl.createEl("div", { cls: "settings-tab-icon" });
			setIcon(tabIcon, tabInfo.icon);
			if (tabInfo.id === "global")
				tabEl.addClasses(["settings-tab-active"]);
			tabEl.createEl("div", { cls: "tabName", text: tabInfo.name });
			tabEl.addEventListener("click", () => {
				// @ts-ignore
				for (const tabEl of tabBar.children)
					tabEl.removeClasses(["settings-tab-active"]);

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
						const index = this.settings.profiles.findIndex((profile) => profile.name === tab);
						this.settings.profiles.splice(index, 1);
						//remove from tabs
						this.TABS = this.TABS.filter((tab) => tab.id !== profile.name);
						this.plugin.saveSettings();
						this.display();
						this.renderGlobal();
					})
					.buttonEl.classList.add("full-width");
			})
			.infoEl.classList.add("hide-info");
		profile.applyingTo = profile.applyingTo ?? ApplyingToView.all;	
		
		new Setting(this.settingsPage)
			.setName(profile.name ?? "profile")
			.setHeading();

		new Setting(this.settingsPage)
			.setName(i18next.t("view.title"))
			.setDesc(i18next.t("view.desc"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("all", i18next.t("view.all"))
					.addOption("reading", i18next.t("view.reading"))
					.addOption("edit", i18next.t("view.edit"))
					.setValue(profile.applyingTo ?? ApplyingToView.all)
					.onChange(async (value) => {
						profile.applyingTo = value as ApplyingToView;
						await this.plugin.saveSettings();
						this.renderSettingsPage(tab);
					});
			});
		if (profile.applyingTo === ApplyingToView.all) {
			this.createReadingSettings(profile, true);
			this.createEditSettings(profile, true);
		} else if (profile.applyingTo === ApplyingToView.reading) {
			this.createReadingSettings(profile, true);
		}
		else if (profile.applyingTo === ApplyingToView.edit) {
			this.createEditSettings(profile, true);
		}

	}

	renderGlobal() {
		this.settingsPage.empty();
		this.settingsPage.addClasses(["global"]);
		new Setting(this.settingsPage)
			.addButton((button) => {
				button
					.setButtonText(i18next.t("profile.add.title"))
					.setTooltip(i18next.t("profile.add.desc"))
					.onClick(async () => {
						new NameProfile(this.app, (result) => {
							this.settings.profiles.push({
								name: result,
								...this.settings.editing
							});
							this.plugin.saveSettings();
							this.display();
						}).open();
						
					});
			});
		new Setting(this.settingsPage)
			.setName(i18next.t("global.title"))
			.setHeading();
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
						if (this.settings.applyingTo === ApplyingToView.edit) {
							this.settings.exportAsHTML = false;
							await this.plugin.saveSettings();
						}
						this.display();
					});
			});
		
		new Setting(this.settingsPage)
			.setName(i18next.t("hotkey.title"))
			.setDesc(i18next.t("hotkey.desc"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.settings.separateHotkey)
					.onChange(async (value) => {
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
				toggle
					.setValue(this.settings.devMode)
					.onChange(async (value) => {
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
				toggle
					.setValue(settings.highlight)
					.onChange(async (value) => {
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
				toggle
					.setValue(settings.overrideNativeCopy)
					.onChange(async (value) => {
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
				toggle
					.setValue(settings.hardBreak)
					.onChange(async (value) => {
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
						if (!settings.replaceText)
							settings.replaceText = [];
						new AllReplaceTextModal(this.app, settings.replaceText, (async result => {
							settings.replaceText = result;
						})).open();
						await this.plugin.saveSettings();
					})
					.buttonEl.classList.add("full-width");
			})
			.infoEl.classList.add("hide-info");
	}
}
