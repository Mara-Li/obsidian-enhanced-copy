import i18next from "i18next";
import { type App, Modal, Notice, Setting } from "obsidian";

import {
	CopySettingsView,
	type EnhancedCopySettings,
	type GlobalSettings,
	type ReplaceText,
} from "./interface";

export class AllReplaceTextModal extends Modal {
	replaceText: ReplaceText[];
	onSubmit: (result: ReplaceText[]) => void;

	constructor(
		app: App,
		replaceText: ReplaceText[],
		onSubmit: (result: ReplaceText[]) => void
	) {
		super(app);
		this.onSubmit = onSubmit;
		this.replaceText = replaceText;
	}

	validateRegex(pattern: string): boolean {
		try {
			if (pattern.match(/^\/.*\/([gmiyus]+)?$/)) {
				const flags = pattern.replace(/^\/.*\/([gmiyus]+)?$/, "$1");
				const regex = pattern.replace(/^\/(.*)\/(.*)$/, "$1");
				new RegExp(regex, flags.length > 0 ? flags : undefined);
			}
			return true; //valid or string
		} catch (_e) {
			return false;
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("enhanced-copy");
		new Setting(contentEl)
			.setName(i18next.t("modal.replaceText.title"))
			.setClass("modal-title")
			.addButton((button) =>
				button
					.setIcon("plus")
					.setTooltip(i18next.t("common.add"))
					.onClick(() => {
						this.replaceText.unshift({
							pattern: "",
							replacement: "",
						});
						this.onOpen();
					})
			);

		for (const replacer of this.replaceText) {
			new Setting(contentEl)
				.addText((text) =>
					text
						.setPlaceholder(i18next.t("common.pattern"))
						.setValue(replacer.pattern)
						.onChange(async (value) => {
							replacer.pattern = value;
							text.inputEl.setAttribute("data-pattern", value);
						})
						.inputEl.classList.add("full-width")
				)
				.addText((text) =>
					text
						.setPlaceholder(i18next.t("common.replacement"))
						.setValue(replacer.replacement)
						.onChange(async (value) => {
							replacer.replacement = value;
							text.inputEl.setAttribute("data-replacement", value);
						})
						.inputEl.classList.add("full-width")
				)
				/** Allow to change order with two arrow up / down **/
				.addExtraButton((button) =>
					button
						.setIcon("chevron-up")
						.setTooltip(i18next.t("modal.replaceText.up"))
						.onClick(() => {
							const index = this.replaceText.indexOf(replacer);
							if (index <= 0) {
								return;
							}
							this.replaceText.splice(index, 1);
							this.replaceText.splice(index - 1, 0, replacer);
							this.onOpen();
						})
				)
				.addExtraButton((button) =>
					button
						.setIcon("chevron-down")
						.setTooltip(i18next.t("modal.replaceText.down"))
						.onClick(() => {
							const index = this.replaceText.indexOf(replacer);
							if (index >= this.replaceText.length - 1) {
								return;
							}
							this.replaceText.splice(index, 1);
							this.replaceText.splice(index + 1, 0, replacer);
							this.onOpen();
						})
				)
				.addExtraButton((button) =>
					button
						.setIcon("trash")
						.setTooltip(i18next.t("common.delete"))
						.onClick(() => {
							const index = this.replaceText.indexOf(replacer);
							if (index > -1) {
								this.replaceText.splice(index, 1);
								this.onOpen();
							}
						})
				)
				.infoEl.classList.add("hide-info");
		}
		new Setting(contentEl)
			.addButton((button) =>
				button
					.setButtonText(i18next.t("common.save"))
					.setCta()
					.onClick(async () => {
						for (const replacer of this.replaceText) {
							if (!this.validateRegex(replacer.pattern)) {
								new Notice(`Invalid regex for ${replacer.pattern}`);
								//search the faulty input
								const input = contentEl.querySelector(
									`[data-pattern="${replacer.pattern}"]`
								);
								if (input) input.addClass("error");
								return;
							}
						}
						this.onSubmit(this.replaceText);
						this.close();
					})
			)
			.addButton((button) =>
				button
					.setButtonText(i18next.t("common.cancel"))
					.setWarning()
					.onClick(async () => {
						this.close();
					})
			);
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class EnhancedCopyViewModal extends Modal {
	settings: EnhancedCopySettings;
	from: CopySettingsView;
	to: CopySettingsView;
	onSubmit: (result: EnhancedCopySettings) => void;

	constructor(
		app: App,
		settings: EnhancedCopySettings,
		onSubmit: (result: EnhancedCopySettings) => void
	) {
		super(app);
		this.onSubmit = onSubmit;
		this.settings = settings;
		this.from = CopySettingsView.Reading;
		this.to = CopySettingsView.Editing;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("enhanced-copy");

		const profileOptions: Record<string, string> = {};
		for (const profile of this.settings.profiles) {
			if (!profile.name) continue;
			profileOptions[profile.name] = profile.name;
		}

		new Setting(contentEl)
			.setName(i18next.t("common.from"))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						reading: i18next.t("modal.copyView.reading"),
						editing: i18next.t("modal.copyView.editing"),
						...profileOptions,
					})
					.setValue(this.from)
					.onChange(async (value) => {
						this.from = value as CopySettingsView;
					})
					.selectEl.classList.add("full-width")
			)
			.infoEl.classList.add("min-width");
		new Setting(contentEl)
			.setName(i18next.t("common.to"))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						reading: i18next.t("modal.copyView.reading"),
						editing: i18next.t("modal.copyView.editing"),
						...profileOptions,
					})
					.setValue(this.to)
					.onChange(async (value) => {
						this.to = value as CopySettingsView;
					})
					.selectEl.classList.add("full-width")
			)
			.infoEl.classList.add("min-width");

		new Setting(contentEl)
			.addButton((button) =>
				button
					.setButtonText(i18next.t("modal.copyView.copy"))
					.setCta()
					.onClick(async () => {
						if (this.from === this.to) {
							return;
						}
						let override: GlobalSettings | undefined;
						switch (this.from) {
							case CopySettingsView.Reading:
								override = this.settings.reading;
								break;
							case CopySettingsView.Editing:
								override = this.settings.editing;
								break;
							default: {
								const profile = this.settings.profiles.find(
									(profile) => profile.name === this.from
								);
								if (profile) {
									override = profile;
								}
							}
						}

						if (!override) return;
						switch (this.to) {
							case CopySettingsView.Reading:
								this.settings.reading = override;
								break;
							case CopySettingsView.Editing:
								this.settings.editing = override;
								break;
							default: {
								const profileIndex = this.settings.profiles.findIndex(
									(profile) => profile.name === this.to
								);
								if (profileIndex) {
									this.settings.profiles[profileIndex] = override;
								}
							}
						}
						this.onSubmit(this.settings);
						this.close();
					})
			)
			.addButton((button) =>
				button
					.setButtonText(i18next.t("common.cancel"))
					.setWarning()
					.onClick(async () => {
						this.close();
					})
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class NameProfile extends Modal {
	name: string = "";
	onSubmit: (result: string) => void;
	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("enhanced-copy");
		new Setting(contentEl)
			.setName(i18next.t("common.profile"))
			.setClass("modal-title")
			.addText((text) =>
				text
					.setPlaceholder(i18next.t("common.profile"))
					.setValue(this.name)
					.onChange(async (value) => {
						this.name = value;
					})
					.inputEl.classList.add("full-width")
			);

		new Setting(contentEl)
			.addButton((button) =>
				button
					.setButtonText(i18next.t("common.save"))
					.setCta()
					.onClick(async () => {
						this.onSubmit(this.name);
						this.close();
					})
			)
			.addButton((button) =>
				button
					.setButtonText(i18next.t("common.cancel"))
					.setWarning()
					.onClick(async () => {
						this.close();
					})
			);
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
