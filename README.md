# Copy Reading In Markdown

Copy a selection in reading view while keeping the markdown formatting

## 🛠️ Usage

- Select the text you want to copy
- Open the command palette
- Select `Copy selected text`

> **Note**  
> The goal is to replace the native copy function of Obsidian. You can set the command on <kbd>CTRL</kbd> + <kbd>C</kbd> (<kbd>⌘</kbd>+<kbd>C</kbd> on MacOS)
> Some selection doesn't work as in the native copy in Obsidian, but I didn't find a way to process the native copy function in the plugin.

> **Warning**  
> It is possible that the command doesn't work on mobile, as the use of command palette unselects the text.

## ⚙️ Settings

You can adjust the way the content is copied in the settings.

First, you need to set the view mode to use. You can choose between:
- `reading`: Only the selected text in reading view will be edited
- `editing` : Only the selected text in editing view will be edited
- `all` : The selected text will be edited in both views

You can also choose to add a command for each copy-mode. It will create a command for :
- Reading view (with checkCallback)
- Editing view
- Non markdown view (canvas, database-plugin...)

Finally, you can to choose to override the default copy (from menu and the <kbd>CTRL</kbd>/<kbd>⌘</kbd> + <kbd>C</kbd>). Pretty useful for mobile!

> [!Note]
> The default copy is disabled on canvas, so I advice you to use the command separator to set an hotkey/button for "other" view & use the default copy on markdown view (reading and LP/source mode). 

The reading view and editing view have ~ the same settings, but you need to set them separately. It will allow having different copy settings for each view.

### Common settings

These settings are the same for both views. As they are separate for each view, if you want some edit in the two views, you need to set them twice.
It is done on purpose to prevent surprise when you use the plugin on editing view but don't want some changes.

> **Info**
> The button in the first tab "copy" will allow you to copy the settings for one view to the other. 

- You can change the aspect of the links:
    - `Keep` : Don't change the link (so they will be in `[link](url)` format)
    - `Remove all` : Remove all the links, and keep only the alias (so `[link](url)` will be `link`)
    - `Remove only for internal links` : Remove only the internal links (so `[link](url)` will be `link` but `[link](https://example.com)` will be `[link](https://example.com)`)
- Same, you can change the footnote settings: 
    - `Keep` : Don't change the footnote (so they will be in the strange format of Obsidian turndown: `footnote[[1]](#fn-1-xxx)`)
    - `Remove all` : Remove all the footnotes, and keep only the alias (so `footnote[[1]](#fn-1-xxx)` will be `footnote`)
    - `Format as [^1]`: Convert `footnote[[1]](#fn-1-xxx)` to `footnote[^1]` 
  These settings will also fix the "markdown contents," aka the footnote at the end of the documents. 
  > **Info**  
  > With the **format** option, if you copy multiple footnote, they will be `[^1]:` `[^2]:` etc..., not a numbered list!
- Unconventional markdown: 
  - Highlight: Remove `==` around the highlighted text
  - Fix callout:
    - `Obsidian format` : Keep the same format 
    - `Type to strong` : Convert all in blockquote and transform the type to bold: `> [!info]` will become `> **Info**` (à la GitHub Callout)
    - `Simple blockquote` : Remove type, keep title and convert to blockquote.
- Other:
  - Strict line breaks: Add two spaces at the end of each line
- Regex replacement: You can add more replacement to the copy with the button that will open a modal. Note that the replacement will be done **after all other changes**. 

### Not common settings
#### Reading view

- You can copy to HTML but it will disable all the other options.
- Space number : By default, turndown will convert tabulation to 4 spaces. You can change this size here.

#### Editing view

- Convert wikilinks to Markdown links: Convert `[[link]]` to `[link](link)`. Needed to convert the links (as in reading view).
- Convert tabulation to space and choose the size 


## 📝 Limitations

- For a strange reason, the first line of a blockquote / list / callout is not selected totally properly as HTML. If you want to format only a part of this, you need to select the line before (or after). You can use "invisible" characters, `$~~$` for example. 
- Not support Mathjax copying (as you can't select them in reading view).
- In reading view, already "HTML writing" are not copied as HTML (like `<b>…</b>`). They are copied as markdown, or only the text is copied (if not basic html). You can prevent this using the `data-type="html"` attribute on the element. For example, `b data-type="html"` will be copied as `<b>…</b>`.
- Selecting text with image will copy the name of the image. If you want to copy the image, you need to select the image itself (not the text).

## 📥 Installation

- [ ] From Obsidian's community plugins
- [x] Using BRAT with `https://github.com/Lisandra-dev/obsidian-enhanced-copy`
- [x] From the release page:
    - Download the latest release
    - Unzip `obsidian-enhanced-copy.zip` in `.obsidian/plugins/` path
    - In Obsidian settings, reload the plugin
    - Enable the plugin

## 🤖 Developing

To make changes to this plugin, first ensure you have the dependencies installed. First, don't forget that you need Node. The package manager used in the project is `pnpm` so you need to install it globally.

```
npm i pnpm -g
pnpm install
```

To start building the plugin with what mode enabled run the following command:

```
pnpm run dev
```

> **Note**  
> If you haven't already installed the hot-reload-plugin you'll be prompted to. You need to enable that plugin in your obsidian vault before hot-reloading will start. You might need to refresh your plugin list for it to show up.
> To start a release build run the following command:

```
pnpm run build
```


> **Note**  
> You can use the `.env` file with adding the key `VAULT_DEV` to specify the path to your Obsidian (development) vault. This will allow you to test your plugin without specify each times the path to the vault.


### 📤 Export

You can use the `npm run export` command to export your plugin to your Obsidian Main Vault. To do that, you need the `.env` file with the following content:

```dotenv
VAULT=path/to/main/vault
VAULT_DEV=path/to/dev/vault
```

### 🎼 Languages

- [x] English
- [x] French

To add a translation:
- Fork the repository
- Add the translation in the `src/i18n/locales` folder with the name of the language (ex: `fr.json`)
- Copy the content of the [`en.json`](./src/i18n/locales/en.json) file in the new file
- Translate the content
- Create a pull request

---

<sub>This plugin was generated by <a href="https://www.npmjs.com/package/@lisandra-dev/create-obsidian-plugin">create-obsidian-plugin</a></sub>
