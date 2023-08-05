/**
 * @author Trganda
 * @source https://github.com/trganda/obsidian-attachment-management/blob/main/src/log.ts
 */
import { Platform } from "obsidian";


export function devLog(...args: unknown[]) {
	if (Platform.isDesktop) {
		if (process.env.BUILD_ENV) {
			let callFunction = new Error().stack?.split("\n")[2].trim();
			callFunction = callFunction?.substring(callFunction.indexOf("at ") + 3, callFunction.lastIndexOf(" ("));
			callFunction = callFunction!.replace("Object.callback", "");
			callFunction = callFunction.length > 0 ? callFunction : "main";
			const date = new Date().toISOString().slice(11, 23);
			console.log(`[${date}](${callFunction}):\n`, ...args);
		}
	}
}
