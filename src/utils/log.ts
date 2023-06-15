/**
 * @author Trganda
 * @source https://github.com/trganda/obsidian-attachment-management/blob/main/src/log.ts
 */

export const DEBUG = process.env.BUILD_ENV;

export function devLog(...args: unknown[]) {
	if (DEBUG) {
		let callFunction = new Error().stack?.split("\n")[2].trim();
		callFunction = callFunction?.substring(callFunction.indexOf("at ") + 3, callFunction.lastIndexOf(" ("));
		callFunction = callFunction.replace("Object.callback", "");
		callFunction = callFunction.length > 0 ? callFunction : "main";
		const date = new Date().toISOString().slice(11, 23);
		console.log(`[${date}](${callFunction}):\n`, ...args);
	}
}