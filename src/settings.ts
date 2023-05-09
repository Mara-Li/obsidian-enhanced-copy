import { PluginSettingTab, App, Setting } from "obsidian";
import CopyReadingInMarkdown from "./main";
import i18next from "i18next";
import {ConversionOfFootnotes, ConversionOfLinks} from "./interface";
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
		containerEl.createEl("h2", { text: i18next.t("links") });
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
		
		containerEl.createEl("h2", { text: i18next.t("unconventionalMarkdown.title") });
		containerEl.createEl("i", { text: i18next.t("unconventionalMarkdown.desc") });
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
}
