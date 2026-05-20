import type { App } from "obsidian";

import type EnhancedCopy from "../main";

type RegexMarkRule = {
	hide?: boolean;
	regex?: RegExp;
	patternSubRegex?: {
		open: RegExp | null;
		close: RegExp | null;
	};
	shouldSkip?: (activeMode?: "source" | "preview") => boolean;
};

type RegexMarkSettings = {
	mark?: RegexMarkRule[];
};

type RegexMarkPlugin = {
	settings?: RegexMarkSettings;
};

function getRegexMarkPlugin(app: App): RegexMarkPlugin | null {
	const pluginManager = (app as App & { plugins?: unknown }).plugins as {
		getPlugin?: (id: string) => RegexMarkPlugin | null;
		plugins?: Record<string, RegexMarkPlugin>;
	};
	return (
		pluginManager?.getPlugin?.("regex-mark") ??
		pluginManager?.plugins?.["regex-mark"] ??
		null
	);
}

export function applyRegexMarkRules(markdown: string, plugin: EnhancedCopy): string {
	const regexMark = getRegexMarkPlugin(plugin.app);
	const rules = regexMark?.settings?.mark ?? [];
	if (!rules.length) return markdown;

	let transformed = markdown;
	for (const rule of rules) {
		if (
			!rule.hide ||
			(rule.shouldSkip && rule.shouldSkip("source")) ||
			!(rule.regex instanceof RegExp)
		) {
			continue;
		}

		const openRegex = rule.patternSubRegex?.open;
		const closeRegex = rule.patternSubRegex?.close;

		transformed = transformed.replace(rule.regex, (match) => {
			let cleaned = match;
			if (openRegex) cleaned = cleaned.replace(openRegex, "");
			if (closeRegex) cleaned = cleaned.replace(closeRegex, "");
			return cleaned;
		});
	}

	return transformed;
}
