import i18next from "i18next";
import {App, Modal, Setting} from "obsidian";

import {CopySettingsView, EnhancedCopySettings, ReplaceText} from "./interface";

export class AllReplaceTextModal extends Modal {
	replaceText: ReplaceText[];
	onSubmit: (result: ReplaceText[]) => void;

	constructor(app: App, replaceText: ReplaceText[], onSubmit: (result: ReplaceText[]) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.replaceText = replaceText;
	}


	onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		contentEl.addClass("enhanced-copy");
		new Setting(contentEl)
			.setName(i18next.t("modal.replaceText.title"))
			.setClass("modal-title")
			.addButton(button => button
				.setIcon("plus")
				.setTooltip(i18next.t("common.add"))
				.onClick(() => {
					this.replaceText.push({
						pattern: "",
						replacement: "",
					});
					this.onOpen();
				})
			);

		for (const replacer of this.replaceText) {
			new Setting(contentEl)
				.addText(text => text
					.setPlaceholder(i18next.t("common.pattern"))
					.setValue(replacer.pattern)
					.onChange(async (value) => {
						replacer.pattern = value;
					})
					.inputEl.classList.add("full-width")
				)
				.addText(text => text
					.setPlaceholder(i18next.t("common.replacement"))
					.setValue(replacer.replacement)
					.onChange(async (value) => {
						replacer.replacement = value;
					})
					.inputEl.classList.add("full-width")
				)
			/** Allow to change order with two arrow up / down **/
				.addExtraButton(button => button
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
				.addExtraButton(button => button
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
				.addExtraButton(button => button
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
			.addButton(button => button
				.setButtonText(i18next.t("common.save"))
				.setCta()
				.onClick(async () => {
					this.onSubmit(this.replaceText);
					this.close();
				}))
			.addButton(button => button
				.setButtonText(i18next.t("common.cancel"))
				.setWarning()
				.onClick(async () => {
					this.close();
				}));			
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

	constructor(app: App, settings: EnhancedCopySettings, onSubmit: (result: EnhancedCopySettings) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.settings = settings;
		this.from = CopySettingsView.reading;
		this.to = CopySettingsView.editing;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		contentEl.addClass("enhanced-copy");
		new Setting(contentEl)
			.setName(i18next.t("common.from"))
			.addDropdown(dropdown => dropdown
				.addOptions({
					reading: i18next.t("modal.copyView.reading"),
					editing: i18next.t("modal.copyView.editing"),
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
			.addDropdown(dropdown => dropdown
				.addOptions({
					reading: i18next.t("modal.copyView.reading"),
					editing: i18next.t("modal.copyView.editing"),
				})
				.setValue(this.to)
				.onChange(async (value) => {
					this.to = value as CopySettingsView;
				})
				.selectEl.classList.add("full-width")
			)
			.infoEl.classList.add("min-width");

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText(i18next.t("modal.copyView.copy"))
				.setCta()
				.onClick(async () => {
					if (this.from === this.to) {
						return;
					}
					const overrides = this.from === CopySettingsView.editing ? this.settings.editing : this.settings.reading;
					if (this.to === CopySettingsView.reading) {
						this.settings.reading = overrides;
					} else {
						this.settings.editing = overrides;
					}
					this.onSubmit(this.settings);
					this.close();
				}))
			.addButton(button => button
				.setButtonText(i18next.t("common.cancel"))
				.setWarning()
				.onClick(async () => {
					this.close();
				}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
