import { moment } from "obsidian";

import * as en from "./locales/en.json";
import * as fr from "./locales/fr.json";

export const resources = {
	en: { translation: en },
	fr: { translation: fr },
} as const;

const localeUsed = window.localStorage.language || moment.locale();

export const translationLanguage = Object.keys(resources).find((i) => i == localeUsed)
	? localeUsed
	: "en";
