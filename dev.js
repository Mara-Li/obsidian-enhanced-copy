
/* eslint-disable @typescript-eslint/no-var-requires */
require("dotenv").config();
const fs = require("fs");
const c = require("ansi-colors");
const { execSync } = require("child_process");
const path = require("path");
let vaultDev = process.env.VAULT_DEV || "";
//get args "--prod" or "--dev"
const args = process.argv.slice(2);

if (args.length > 0 && args[0] === "--prod") {
	vaultDev = process.env.VAULT || "";
}
let msg = vaultDev.trim().length > 0 ? `-v ${c.underline(vaultDev)}` : "";
const cmd = vaultDev.trim().length > 0 ? `-v ${vaultDev}` : "";

const pluginDir = path.join(vaultDev, ".obsidian", "plugins", "copy-reading-in-markdown", ".hotreload");

if (!fs.existsSync(pluginDir)) {
	console.log(c.yellow.underline(".hotreload"));
	fs.mkdirSync(pluginDir);
}

const command = `obsidian-plugin dev --with-stylesheet src/styles.css src/main.ts ${cmd}`;
console.log(c.blue.italic(`${c.bold.red(">")} obsidian-plugin dev ${c.yellowBright.underline("--with-stylesheet src/styles.css")} src/main.ts ${msg}`));
execSync(command, { stdio: "inherit" });

