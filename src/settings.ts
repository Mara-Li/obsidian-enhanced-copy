import { PluginSettingTab, App, Setting } from "obsidian";
import CopyReadingInMarkdown from "./main";
import i18next from "i18next";
import {ApplyingToView, CalloutKeepTitle, ConversionOfFootnotes, ConversionOfLinks} from "./interface";
export class CopyReadingInMarkdownSettingsTab extends PluginSettingTab {
	plugin: CopyReadingInMarkdown;
	constructor(app: App, plugin: CopyReadingInMarkdown) {
		super(app, plugin);
		this.plugin = plugin;
	}
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h1", { text: i18next.t("settings") });
		
		new Setting(containerEl)
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
		
		if (this.plugin.settings.applyingTo !== ApplyingToView.edit) {
			new Setting(containerEl)
				.setName(i18next.t("copyAsHTML"))
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.exportAsHTML)
						.onChange(async (value) => {
							this.plugin.settings.exportAsHTML = value;
							await this.plugin.saveSettings();
							this.display();
						});
				});
		}
		if (!this.plugin.settings.exportAsHTML) {
			containerEl.createEl("h2", {text: i18next.t("links")});
			new Setting(containerEl)
				.setName(i18next.t("copyLinksAsText.title"))
				.setDesc(i18next.t("copyLinksAsText.desc"))
				.setClass("copy-reading-in-markdown-dp")
				.addDropdown((dropdown) => {
					dropdown
						.addOption("keep", i18next.t("copyLinksAsText.keep"))
						.addOption("remove", i18next.t("copyLinksAsText.remove"))
						.addOption("external", i18next.t("copyLinksAsText.external"))
						.setValue(this.plugin.settings.convertLinks)
						.onChange(async (value) => {
							this.plugin.settings.convertLinks = value as ConversionOfLinks;
							await this.plugin.saveSettings();
						});
				});
			new Setting(containerEl)
				.setName(i18next.t("removeFootnotesLinks.title"))
				.setDesc(i18next.t("removeFootnotesLinks.desc"))
				.setClass("copy-reading-in-markdown-dp")
				.addDropdown((dropdown) => {
					dropdown
						.addOption("keep", i18next.t("removeFootnotesLinks.keep"))
						.addOption("remove", i18next.t("removeFootnotesLinks.remove"))
						.addOption("format", i18next.t("removeFootnotesLinks.format"))
						.setValue(this.plugin.settings.removeFootNotesLinks)
						.onChange(async (value) => {
							this.plugin.settings.removeFootNotesLinks = value as ConversionOfFootnotes;
							await this.plugin.saveSettings();
						});
				});
			
			containerEl.createEl("h2", {text: i18next.t("unconventionalMarkdown.title")});
			containerEl.createEl("i", {text: i18next.t("unconventionalMarkdown.desc")});
			new Setting(containerEl)
				.setName(i18next.t("highlight.title"))
				.setDesc(i18next.t("highlight.desc"))
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.highlight)
						.onChange(async (value) => {
							this.plugin.settings.highlight = value;
							await this.plugin.saveSettings();
						});
				});
		}
		
		new Setting(containerEl)
			.setName(i18next.t("callout.title"))
			.setDesc(i18next.t("callout.desc"))
			.setClass("copy-reading-in-markdown-dp")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("obsidian", i18next.t("callout.obsidian"))
					.addOption("strong", i18next.t("callout.strong"))
					.addOption("remove", i18next.t("callout.remove"))
					.setValue(this.plugin.settings.calloutTitle)
					.onChange(async (value) => {
						this.plugin.settings.calloutTitle = value as CalloutKeepTitle;
						await this.plugin.saveSettings();
					});
			});
		
		if (!this.plugin.settings.exportAsHTML) {
			containerEl.createEl("h2", {text: i18next.t("other")});
			
			new Setting(containerEl)
				.setName(i18next.t("hardBreaks.title"))
				.setDesc(i18next.t("hardBreaks.desc"))
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.hardBreaks)
						.onChange(async (value) => {
							this.plugin.settings.hardBreaks = value;
							await this.plugin.saveSettings();
						});
				});
		}
	}
}
