import type EnhancedCopy from "../main";

const defaultCSS = `
/* =========================
   Base document
   ========================= */

body {
  font-family: Calibri, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.45;
}

/* =========================
   Paragraphs & text
   ========================= */

p {
  margin: 0 0 8pt 0;
}

strong {
  font-weight: 700;
}

em {
  font-style: italic;
}

del {
  text-decoration: line-through;
}

/* Highlight / ==mark== */
mark {
  background-color: #fff2a8;
  color: inherit;
  padding: 0 2px;
}

/* =========================
   Headings
   ========================= */

h1 {
  font-size: 20pt;
  font-weight: 700;
  margin: 16pt 0 8pt;
}

h2 {
  font-size: 16pt;
  font-weight: 700;
  margin: 14pt 0 6pt;
}

h3 {
  font-size: 14pt;
  font-weight: 700;
  margin: 12pt 0 6pt;
}

h4 {
  font-size: 12pt;
  font-weight: 600;
  margin: 10pt 0 4pt;
}

h5 {
  font-size: 11pt;
  font-weight: 600;
  margin: 8pt 0 4pt;
}

h6 {
  font-size: 10pt;
  font-weight: 600;
  margin: 6pt 0 4pt;
}

/* =========================
   Lists
   ========================= */

ul,
ol {
  margin: 6pt 0 6pt 18pt;
  padding: 0;
}

li {
  margin: 2pt 0;
}

/* =========================
   Blockquote
   ========================= */

blockquote {
  margin: 8pt 0;
  padding: 6pt 12pt;
  border-left: 3pt solid #cccccc;
  color: #555;
}

/* =========================
   Code
   ========================= */

code {
  font-family: Consolas, "Courier New", monospace;
  font-size: 10pt;
  padding: 1pt 4pt;
  border-radius: 3pt;
}

pre {
  font-family: Consolas, "Courier New", monospace;
  font-size: 10pt;
  padding: 8pt;
  border-radius: 4pt;
  white-space: pre-wrap;
  margin: 8pt 0;
}

pre code {
  background: none;
  padding: 0;
}

/* =========================
   Links
   ========================= */

a {
  color: #0563c1;
  text-decoration: underline;
}

/* =========================
   Horizontal rule
   ========================= */

hr {
  border: none;
  border-top: 1pt solid #cccccc;
  margin: 12pt 0;
}

/* =========================
   Tables
   ========================= */

table {
  border-collapse: collapse;
  margin: 8pt 0;
}

th,
td {
  border: 1pt solid #cccccc;
  padding: 4pt 6pt;
}

th {
  background: #f0f0f0;
  font-weight: 700;
}

/* =========================
   Keyboard input
   ========================= */

kbd {
  font-family: Consolas, monospace;
  font-size: 9pt;
  border: 1pt solid #ccc;
  border-radius: 3pt;
  padding: 1pt 4pt;
  background: #f8f8f8;
}

/* =========================
   Sup / Sub
   ========================= */

sup {
  vertical-align: super;
  font-size: 75%;
}

sub {
  vertical-align: sub;
  font-size: 75%;
}` as const;

export async function loadCssFile(
	plugin: EnhancedCopy,
	cssFilePath?: string
): Promise<string> {
	if (!cssFilePath) {
		return defaultCSS;
	}
	const cssFile = await plugin.app.vault.adapter.exists(cssFilePath);
	if (!cssFile) {
		console.warn(`CSS file not found at path: ${cssFilePath}. Using default CSS.`);
		return defaultCSS;
	}
	try {
		const css = await plugin.app.vault.adapter.read(cssFilePath);
		verifyCssContent(css);
		return css;
	} catch (error) {
		console.error(
			`Error reading CSS file at path: ${cssFilePath}. Using default CSS.`,
			error
		);
		return defaultCSS;
	}
}

function verifyCssContent(cssContent: string): boolean {
	const styleSheet = new CSSStyleSheet();
	styleSheet.replaceSync(cssContent);
	// Check if the stylesheet has any rules, which indicates valid CSS
	return styleSheet.cssRules.length > 0;
}
