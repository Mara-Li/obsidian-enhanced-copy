import i18next from "i18next";
import {App, PluginSettingTab, setIcon, Setting} from "obsidian";

import {ApplyingToView, CalloutKeepType, ConversionOfFootnotes, ConversionOfLinks, EnhancedCopySettings, GlobalSettings} from "./interface";
import EnhancedCopy from "./main";
import {AllReplaceTextModal,EnhancedCopyViewModal} from "./modal";

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

	constructor(app: App, plugin: EnhancedCopy) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = plugin.settings;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		this.containerEl.addClasses(["enhanced-copy","setting-tab"]);
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
		// remove duplicate
		this.TABS = [...new Set(this.TABS)];
		for (const tabInfo of this.TABS) {
			const tabEl = tabBar.createEl("div", {cls: "settings-tab"});
			const tabIcon = tabEl.createEl("div", {cls: "settings-tab-icon"});
			setIcon(tabIcon, tabInfo.icon);
			if (tabInfo.id === "global")
				tabEl.addClasses(["settings-tab-active"]);
			tabEl.createEl("div", {cls: "tabName", text: tabInfo.name});
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
		}
	}

	renderGlobal() {
		this.settingsPage.empty();
		this.settingsPage.addClasses(["global"]);
		this.settingsPage.createEl("h1", {text: i18next.t("global.title")});
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
		if (this.settings.applyingTo === ApplyingToView.all) {
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
						});
				});
		}

		new Setting(this.settingsPage)
			.setName(i18next.t("overrideCopy.title"))
			.setDesc(i18next.t("overrideCopy.desc"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.settings.overrideCopy)
					.onChange(async (value) => {
						this.settings.overrideCopy = value;
						await this.plugin.saveSettings();
					});
			});
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
		this.settingsPage.createEl("h1", {text: i18next.t("reading.desc")});
		new Setting(this.settingsPage)
			.setName(i18next.t("copyAsHTML"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.settings.exportAsHTML)
					.onChange(async (value) => {
						this.settings.exportAsHTML = value;
						await this.plugin.saveSettings();
						this.renderSettingsPage("reading");
					});
			});
		if (!this.settings.exportAsHTML) {
			this.settingsPage.createEl("h2", {text: i18next.t("links")});
			this.links(this.settings.reading);
			this.footnotes(this.settings.reading);

			this.settingsPage.createEl("h2", {text: i18next.t("unconventionalMarkdown.title")});
			this.settingsPage.createEl("i", {text: i18next.t("unconventionalMarkdown.desc")});
			this.highlight(this.settings.reading);
		}

		this.calloutTitle(this.settings.reading);

		if (!this.settings.exportAsHTML) {
			this.settingsPage.createEl("h2", {text: i18next.t("other")});
			this.hardBreak(this.settings.reading);
			new Setting(this.settingsPage)
				.setName(i18next.t("spaceSize.title"))
				.setDesc(i18next.t("spaceSize.desc"))
				.addText((text) => {
					text
						.setPlaceholder("-1")
						.setValue(String(this.settings.spaceReadingSize))
						.onChange(async (value) => {
							this.settings.spaceReadingSize = Number(value);
							await this.plugin.saveSettings();
						});
				});
		}

		this.regexReplacementButton(this.settings.reading);
	}

	renderEdit() {
		this.settingsPage.empty();
		this.settingsPage.addClasses(["edit"]);
		this.settingsPage.createEl("h1", {text: i18next.t("edit.desc")});
		new Setting(this.settingsPage)
			.setName(i18next.t("wikiToMarkdown.title"))
			.setDesc(i18next.t("wikiToMarkdown.desc"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.settings.wikiToMarkdown)
					.onChange(async (value) => {
						this.settings.wikiToMarkdown = value;
						await this.plugin.saveSettings();
						this.renderSettingsPage("edit");
					});
			});

		new Setting(this.settingsPage)
			.setName(i18next.t("tabToSpace"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.settings.tabToSpace)
					.onChange(async (value) => {
						this.settings.tabToSpace = value;
						await this.plugin.saveSettings();
						this.renderSettingsPage("edit");
					});
			});

		if (this.settings.tabToSpace) {
			new Setting(this.settingsPage)
				.setName(i18next.t("tabSpaceSize"))
				.addText((text) => {
					text
						.setValue(this.settings.tabSpaceSize.toString())
						.onChange(async (value) => {
							this.settings.tabSpaceSize = parseInt(value);
							text.inputEl.toggleClass("error", isNaN(this.settings.tabSpaceSize) || this.settings.tabSpaceSize < 0);
							if (isNaN(this.settings.tabSpaceSize) || this.settings.tabSpaceSize < 0) this.settings.tabSpaceSize = 4;
							await this.plugin.saveSettings();
						});
				});
		}
		this.settingsPage.createEl("h2", {text: i18next.t("links")});
		if (this.settings.wikiToMarkdown) {
			this.links(this.settings.editing);
		}
		this.footnotes(this.settings.editing);
		this.settingsPage.createEl("h2", {text: i18next.t("unconventionalMarkdown.title")});
		this.settingsPage.createEl("i", {text: i18next.t("unconventionalMarkdown.desc")});
		this.calloutTitle(this.settings.editing);
		this.highlight(this.settings.editing);
		this.settingsPage.createEl("h2", {text: i18next.t("other")});
		this.hardBreak(this.settings.editing);

		this.regexReplacementButton(this.settings.editing);
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
