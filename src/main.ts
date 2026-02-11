import { deepmerge as merge } from "deepmerge-ts";
import i18next from "i18next";
import { Plugin } from "obsidian";
import { EnhancedCopyCore } from "./core";
import { resources, translationLanguage } from "./i18n/i18next";
import {
	DEFAULT_SETTINGS,
	type EnhancedCopySettings,
	type ProfileCSS,
} from "./interface";
import { EnhancedCopySettingTab } from "./settings";

export default class EnhancedCopy extends Plugin {
	settings: EnhancedCopySettings = DEFAULT_SETTINGS;
	core!: EnhancedCopyCore;
	profileCSS: ProfileCSS = new Map();
	profileAlreadyIn: Map<string, string> = new Map();

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

		this.core = new EnhancedCopyCore(this);
		await this.core.setup();
		this.profileCSS = this.core.profileCSS;
		this.profileAlreadyIn = this.core.profileAlreadyIn;
	}

	async onunload() {
		console.log(`CopyReadingInMarkdown v.${this.manifest.version} unloaded.`);
		await this.core.teardown();
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
}
