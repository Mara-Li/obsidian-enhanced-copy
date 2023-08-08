import i18next from "i18next";
import {App, PluginSettingTab, setIcon, Setting} from "obsidian";

import {ApplyingToView, CalloutKeepTitle, ConversionOfFootnotes, ConversionOfLinks, GlobalSettings} from "./interface";
import AdvancedCopy from "./main";
import {AdvancedCopyViewModal, AllReplaceTextModal} from "./modal";

interface Tab {
	name: string;
	id: string
	icon: string;
}

export class AdvancedCopySettingTab extends PluginSettingTab {
	plugin: AdvancedCopy;
	settingsPage!: HTMLElement;
	
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
	
	constructor(app: App, plugin: AdvancedCopy) {
		super(app, plugin);
		this.plugin = plugin;
	}
	
	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		
		const tabBar = containerEl.createEl("nav", { cls: "settings-tab-bar" });
		//remove Tab based on applying
		if (this.plugin.settings.applyingTo === ApplyingToView.reading) {
			this.TABS.push(this.READING);
			this.TABS.remove(this.EDIT);
			this.TABS = [...new Set(this.TABS)];
		} else if (this.plugin.settings.applyingTo === ApplyingToView.edit) {
			this.TABS.push(this.EDIT);
			this.TABS.remove(this.READING);
			this.TABS = [...new Set(this.TABS)];
		} else {
			this.TABS.push(this.EDIT);
			this.TABS.push(this.READING);
			// remove duplicate
			this.TABS = [...new Set(this.TABS)];
		}
		for (const tabInfo of this.TABS) {
			const tabEl = tabBar.createEl("div", {cls: "settings-tab"});
			const tabIcon = tabEl.createEl("div", {cls: "settings-tab-icon"});
			setIcon(tabIcon, tabInfo.icon);
			if (tabInfo.id === "global")
				tabEl.addClass("settings-tab-active");
			tabEl.createEl("div", {cls: "settings-copy-reading-md", text: tabInfo.name});
			tabEl.addEventListener("click", () => {
				// @ts-ignore
				for (const tabEl of tabBar.children)
					tabEl.removeClass("settings-tab-active");

				tabEl.addClass("settings-tab-active");
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
		this.settingsPage.createEl("h1", {text: i18next.t("global.title")});
		new Setting(this.settingsPage)
			.setName(i18next.t("view.title"))
			.setDesc(i18next.t("view.desc"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("all", i18next.t("view.all"))
					.addOption("reading", i18next.t("view.reading"))
					.addOption("edit", i18next.t("view.edit"))
					.setValue(this.plugin.settings.applyingTo)
					.onChange(async (value) => {
						this.plugin.settings.applyingTo = value as ApplyingToView;
						await this.plugin.saveSettings();
						if (this.plugin.settings.applyingTo === ApplyingToView.edit) {
							this.plugin.settings.exportAsHTML = false;
							await this.plugin.saveSettings();
						}
						this.display();
					});
			});
		if (this.plugin.settings.applyingTo === ApplyingToView.all) {
			new Setting(this.settingsPage)
				.setName(i18next.t("hotkey.title"))
				.setDesc(i18next.t("hotkey.desc"))
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.separateHotkey)
						.onChange(async (value) => {
							this.plugin.settings.separateHotkey = value;
							await this.plugin.saveSettings();
						});
				});
			new Setting(this.settingsPage)
				.addButton((button) => {
					button
						.setButtonText(i18next.t("global.copy"))
						.onClick(async () => {
							new AdvancedCopyViewModal(this.app, this.plugin.settings, (result) => {
								this.plugin.settings = result;
								this.plugin.saveSettings();
								this.display();
							}).open();
						});
				});
		}
	}
	
	renderReading() {
		this.settingsPage.createEl("h1", {text: i18next.t("reading.desc")});
		new Setting(this.settingsPage)
			.setName(i18next.t("copyAsHTML"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.exportAsHTML)
					.onChange(async (value) => {
						this.plugin.settings.exportAsHTML = value;
						await this.plugin.saveSettings();
						this.renderReading();
					});
			});
		if (!this.plugin.settings.exportAsHTML) {
			this.settingsPage.createEl("h2", {text: i18next.t("links")});
			this.links(this.plugin.settings.reading);
			this.footnotes(this.plugin.settings.reading);
				
			this.settingsPage.createEl("h2", {text: i18next.t("unconventionalMarkdown.title")});
			this.settingsPage.createEl("i", {text: i18next.t("unconventionalMarkdown.desc")});
			this.highlight(this.plugin.settings.reading);
		}
			
		this.calloutTitle(this.plugin.settings.reading);
			
		if (!this.plugin.settings.exportAsHTML) {
			this.settingsPage.createEl("h2", {text: i18next.t("other")});
			this.hardBreak(this.plugin.settings.reading);
			new Setting(this.settingsPage)
				.setName(i18next.t("spaceSize.title"))
				.setDesc(i18next.t("spaceSize.desc"))
				.addText((text) => {
					text
						.setPlaceholder("-1")
						.setValue(String(this.plugin.settings.spaceReadingSize))
						.onChange(async (value) => {
							this.plugin.settings.spaceReadingSize = Number(value);
							await this.plugin.saveSettings();
						});
				});
		}
		
		this.regexReplacementButton(this.plugin.settings.reading);
	}
	
	renderEdit() {
		this.settingsPage.empty();
		this.settingsPage.createEl("h1", {text: i18next.t("edit.desc")});
		new Setting(this.settingsPage)
			.setName(i18next.t("wikiToMarkdown.title"))
			.setDesc(i18next.t("wikiToMarkdown.desc"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.wikiToMarkdown)
					.onChange(async (value) => {
						this.plugin.settings.wikiToMarkdown = value;
						await this.plugin.saveSettings();
						this.renderEdit();
					});
			});
			
		new Setting(this.settingsPage)
			.setName(i18next.t("tabToSpace"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.tabToSpace)
					.onChange(async (value) => {
						this.plugin.settings.tabToSpace = value;
						await this.plugin.saveSettings();
						this.renderEdit();
					});
			});
			
		if (this.plugin.settings.tabToSpace) {
			new Setting(this.settingsPage)
				.setName(i18next.t("tabSpaceSize"))
				.addText((text) => {
					text
						.setValue(this.plugin.settings.tabSpaceSize.toString())
						.onChange(async (value) => {
							this.plugin.settings.tabSpaceSize = parseInt(value);
							if (isNaN(this.plugin.settings.tabSpaceSize)) {
								this.plugin.settings.tabSpaceSize = 4;
								text.inputEl.style.borderColor = "red";
							} else {
								text.inputEl.style.borderColor = "";
							}
							await this.plugin.saveSettings();
						});
				});
		}
		this.settingsPage.createEl("h2", {text: i18next.t("links")});
		if (this.plugin.settings.wikiToMarkdown) {
			this.links(this.plugin.settings.editing);
		}
		this.footnotes(this.plugin.settings.editing);
		this.settingsPage.createEl("h2", {text: i18next.t("unconventionalMarkdown.title")});
		this.settingsPage.createEl("i", {text: i18next.t("unconventionalMarkdown.desc")});
		this.calloutTitle(this.plugin.settings.editing);
		this.highlight(this.plugin.settings.editing);
		this.settingsPage.createEl("h2", {text: i18next.t("other")});
		this.hardBreak(this.plugin.settings.editing);
		
		this.regexReplacementButton(this.plugin.settings.editing);
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
			.setClass("copy-reading-in-markdown-dp")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("obsidian", i18next.t("callout.obsidian"))
					.addOption("strong", i18next.t("callout.strong"))
					.addOption("remove", i18next.t("callout.remove"))
					.setValue(settings.callout)
					.onChange(async (value) => {
						settings.callout = value as CalloutKeepTitle;
						await this.plugin.saveSettings();
					});
			});
	}
	
	footnotes(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("removeFootnotesLinks.title"))
			.setDesc(i18next.t("removeFootnotesLinks.desc"))
			.setClass("copy-reading-in-markdown-dp")
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
			.setClass("copy-reading-in-markdown-dp")
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
					.buttonEl.style.width = "100%";
			})
			.infoEl.style.display = "none";
	}
}
