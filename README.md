# Copy Reading In Markdown

Copy a selection in reading view while keeping the markdown formatting

## ⚙️ Usage

- Select the text you want to copy
- Open the command palette
- Select `Copy Reading In Markdown`

> **Info**  
> The goal is to replace the native copy function of Obsidian. You can set the command on <kbd>CTRL</kbd> + <kbd>C</kbd> (<kbd>⌘</kbd>+<kbd>C</kbd> on MacOS)

> **Warning**  
> It is possible that the command doesn't work on mobile, as the use of command palette unselects the text.

## 📝 Limitations

- Callout blocks are not supported (they are copied as blockquote)
- For a strange reason, the first line of a blockquote (only that is selected) is not copied as a blockquote. If you select the line before, they are... Same if the line is "empty" (or use invisible characters like `$~~$`).
- Footnotes are... Strange. They are copied as links, not the content of the footnote.
- Not support Mathjax copying (as you can't select them in reading view).
- In reading view, already "HTML writing" are not copied as HTML (like `<b>…</b>`). They are copied as markdown, or only the text is copied (if not basic html). You can prevent this with adding the class `.no-convert` to the html element, like `<b class="no-convert">…</b>`.

## 📥 Installation

- [ ] From Obsidian's community plugins
- [x] Using BRAT with `https://github.com/Lisandra-dev/copy-reading-in-markdown`
- [x] From the release page:
- Download the latest release
- Unzip `copy-reading-in-markdown.zip` in `.obsidian/plugins/` path
- In Obsidian settings, reload the plugin
- Enable the plugin

## 🤖 Developing

To make changes to this plugin, first ensure you have the dependencies installed.

```
npm install
```

To start building the plugin with what mode enabled run the following command:

```
npm run dev
```

> **Note**  
> If you haven't already installed the hot-reload-plugin you'll be prompted to. You need to enable that plugin in your obsidian vault before hot-reloading will start. You might need to refresh your plugin list for it to show up.
> To start a release build run the following command:

```
npm run build
```

### 📤 Export

You can use the `npm run export` command to export your plugin to your Obsidian Main Vault. To do that, you need the `.env.json` file with the following content:

```dotenv
VAULT=path/to/main/vault
VAULT_DEV=path/to/dev/vault
```


---

<sub>This plugin was generated by <a href="https://www.npmjs.com/package/@lisandra-dev/create-obsidian-plugin">create-obsidian-plugin</a></sub>
