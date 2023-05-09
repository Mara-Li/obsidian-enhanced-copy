
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config(); 
// eslint-disable-next-line @typescript-eslint/no-var-requires
const c = require("ansi-colors");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require("child_process");
let vaultDev = process.env.VAULT_DEV || "";
let msg = "";
if (vaultDev.trim().length > 0) {
	vaultDev = `-v ${vaultDev}`;
	msg = `-v ${c.underline(process.env.VAULT_DEV)}`;
}
const command = `obsidian-plugin dev src/main.ts ${vaultDev}`;
console.log(c.blue.italic(`${c.bold.red(">")} obsidian-plugin dev src/main.ts ${msg}`));
execSync(command, { stdio: "inherit" });