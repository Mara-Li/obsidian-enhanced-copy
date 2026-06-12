---
name: settings
description: Author or migrate community-plugin setting tabs (PluginSettingTab) in Obsidian. Covers the declarative getSettingDefinitions() API introduced in 1.13.0 and the recommended pattern for supporting older app versions alongside it. Use when working on a class that extends PluginSettingTab, when migrating an imperative display() override, when adding a new settings page, or when adopting new control types (file, folder, textarea, number, validate, nested pages), conditional visibility/disabled predicates, mutable lists with addItem, render cleanup, SettingPage#hide, or reacting to external state changes from a settings tab. Triggers include "migrate plugin settings", "PluginSettingTab", "getSettingDefinitions", "support old Obsidian versions for settings", "settings validation", "settings page navigation", "conditional settings", "show setting based on", "disable setting when", "refreshDomState", "SettingPage hide", "settings cleanup", "react to vault changes in settings", "mutable list of settings", "addItem".
---

# Authoring Obsidian plugin settings

This skill is for community plugins that extend `PluginSettingTab`. Obsidian 1.13.0 introduced a declarative API (`getSettingDefinitions()`) that replaces the imperative `display()` body for the common case. The framework still calls `display()` on older versions and as a fallback when no definitions are returned, so plugins can adopt the new API without dropping support for older app versions.

## Quick decision

| Your plugin's `minAppVersion` | What to do |
|---|---|
| `>= 1.13.0` | Implement `getSettingDefinitions()` only. Delete `display()`. |
| `< 1.13.0` and you want to adopt the new API | Implement `getSettingDefinitions()` AND keep `display()`. The framework picks the right one per host. |
| `< 1.13.0` and you don't need the new features | Leave the plugin as-is. The new API is opt-in. |

The dual-implementation pattern is detailed in [Supporting older app versions](#supporting-older-app-versions). Most of this document is about the declarative API itself.

## Setup

```ts
interface MySettings { foo: boolean; folder: string }

class MyTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    getSettingDefinitions() {
        return [/* … */];
    }
}
```

`control: { key: '…' }` definitions bind to `this.plugin.settings[key]` by default — the framework reads with `getControlValue`, writes with `setControlValue`, and calls `saveData` for you. Both methods default to reading and writing `this.plugin.settings`; override them only when settings live somewhere else.

If your existing plugin already ships **nested** settings JSON (e.g. `{ editor: { fontSize: … } }`) and you can't reshape it, `control` keys can be extended to dot-notation paths by overriding `getControlValue`/`setControlValue` — see [examples/nested-settings.md](examples/nested-settings.md). Prefer flat keys for new plugins.

## Prefer `control` for simple bindings

A `control` definition reads and writes a single key on `plugin.settings`. The framework calls `saveData` for you.

```ts
{ name: 'Open in foreground', control: { type: 'toggle', key: 'foo' } }

{ name: 'Default mode', control: {
    type: 'dropdown',
    key: 'mode',
    defaultValue: 'edit',
    options: { edit: 'Editing', read: 'Reading' },
}}

{ name: 'Folder name', control: { type: 'text', key: 'folder', placeholder: '/' } }

{ name: 'Notes', control: { type: 'textarea', key: 'notes', rows: 4 } }

{ name: 'Cache size', control: { type: 'number', key: 'cacheMb', min: 1, max: 500, defaultValue: 50 } }

{ name: 'Volume', control: { type: 'slider', key: 'volume', min: 0, max: 100, step: 1 } }

{ name: 'Template file', control: { type: 'file', key: 'template', filter: f => f.extension === 'md' } }

{ name: 'Output folder', control: { type: 'folder', key: 'outputDir', includeRoot: true } }

{ name: 'Accent color', control: { type: 'color', key: 'accent' } }
```

`defaultValue` is the fallback when the stored value is `undefined`/`null`.

**Control types:**

| Type | Stored value | Notes |
|---|---|---|
| `toggle` | `boolean` | |
| `dropdown` | `string` | `options: { value: 'Display', … }` |
| `text` | `string` | `placeholder?` |
| `textarea` | `string` | `placeholder?`, `rows?` |
| `number` | `number` | `min?`, `max?`, `step?`, `placeholder?`. Commits on blur/Enter. Out-of-range and unparseable input shows an inline error and rejects the change. |
| `slider` | `number` | `min`, `max`, `step` all required |
| `file` | `string` (path) | `filter?: (file: TFile) => boolean`, `placeholder?` |
| `folder` | `string` (path) | `filter?: (folder: TFolder) => boolean`, `includeRoot?` (default `false`), `placeholder?` |
| `color` | `string` (hex) | |

## `validate`: reject invalid values

Every `control` accepts an optional `validate` callback. Return a non-empty string to reject the change and surface it as an inline error below the input. Return `void`/`undefined`/empty string to accept and persist.

```ts
{
    name: 'File extension',
    control: {
        type: 'text',
        key: 'extension',
        validate: (value) => /\s/.test(value) ? 'Extension cannot contain spaces.' : undefined,
    },
}
```

Async validators work too — return a `Promise<string | void>`.

**Important semantics:**

- `validate` is a UI gate, not a data invariant. The stored value may already be invalid when the setting is rendered (e.g. data from an older version of your plugin). The framework runs `validate` once on mount and shows the message if the seeded value fails; it does **not** modify or replace the stored value.
- If your plugin needs to enforce invariants on stored data, validate again when reading your settings — don't rely on `validate` alone.
- Most useful on text-bearing controls (`text`, `textarea`, `number`, `file`, `folder`).

## Conditional visibility and disabled state

Two predicates toggle a setting's state without rebuilding the tab:

- `visible` on any definition (including groups, lists, and pages) — hides the row when `false`. A hidden row is also excluded from global settings search for that render.
- `disabled` on a `control` or on an `action` definition — disables interaction without hiding the row.

Both accept `boolean | (() => boolean)`. The function form is re-evaluated on every DOM-state refresh. For `control` definitions the framework refreshes automatically after every change. After mutating dependent state from a `render` callback or other imperative path, call `this.refreshDomState()` to re-run the predicates without a full re-render.

```ts
getSettingDefinitions() {
    return [
        { name: 'Enable advanced mode', control: { type: 'toggle', key: 'advanced' } },
        {
            name: 'Debug log level',
            desc: 'Only relevant when advanced mode is on.',
            visible: () => this.plugin.settings.advanced,
            control: { type: 'dropdown', key: 'logLevel', options: { info: 'Info', verbose: 'Verbose' } },
        },
        {
            name: 'Cache size',
            control: {
                type: 'number',
                key: 'cacheMb',
                min: 1,
                disabled: () => !this.plugin.settings.advanced,
            },
        },
    ];
}
```

**`visible` vs `disabled`:** use `visible` when the setting is irrelevant in the current configuration (nothing meaningful for the user to read or change). Use `disabled` when the setting is meaningful but currently locked (a prerequisite isn't met, a paid feature isn't unlocked) — keep it visible so the user understands the option exists.

**When to use `update()` instead:** `refreshDomState` only re-evaluates predicates on already-rendered items. If the *set* of definitions changes (rows added or removed), call `this.update()` to rebuild from `getSettingDefinitions()`.

## Use `render` for everything else

When a setting needs anything beyond a simple bind — side effects, custom UI, suggesters not covered by `file`/`folder`, custom controls — use a `render` callback. For hiding rows based on another setting, use the [`visible` predicate](#conditional-visibility-and-disabled-state) instead.

```ts
{
    name: 'Enable feature X',
    render: (setting) => {
        setting.addToggle(toggle => toggle
            .setValue(this.plugin.settings.featureX)
            .onChange(async (value) => {
                this.plugin.settings.featureX = value;
                this.plugin.applyFeatureX();
                await this.plugin.saveData(this.plugin.settings);
            }));
    },
}
```

**Always `await this.plugin.saveData(this.plugin.settings)` after mutating settings inside `render`** — the framework only saves automatically for `control` bindings.

When the *set* of definitions changes (rows added or removed), call `this.update()` from the parent's `onChange` to rebuild. (Don't use `this.display()` for this — see [Common pitfalls](#common-pitfalls).) For pure show/hide, prefer the [`visible` predicate](#conditional-visibility-and-disabled-state).

### Cleanup

If the `render` callback subscribes to anything that outlives the DOM — a `ResizeObserver`, a `MutationObserver`, a `setInterval`, or anything that wouldn't be garbage-collected when the row is removed — return a cleanup function. The framework invokes it before the row is torn down (re-render, page navigation, tab switch, or modal close).

```ts
{
    name: 'Live preview',
    render: (setting) => {
        let previewEl = setting.controlEl.createDiv('preview');
        let observer = new ResizeObserver(() => {
            previewEl.setText(`${previewEl.clientWidth}px`);
        });
        observer.observe(previewEl);
        return () => observer.disconnect();
    },
}
```

- **Don't** clean up plain DOM listeners attached to elements inside the `Setting` row — they go with the DOM.
- **Don't** register workspace/vault events in `render` — they should live as long as the plugin. Register them on the plugin instance instead. See [Reacting to external state changes](#reacting-to-external-state-changes).
- Cleanup is **not guaranteed** when the host window is destroyed (e.g. renderer crash). For state that *must* be released, register it on the plugin.

## Custom storage with `getControlValue` / `setControlValue`

`control` definitions read and write `this.plugin.settings` by default — `key: 'foo'` corresponds to `this.plugin.settings.foo`, and the framework calls `this.plugin.saveData(this.plugin.settings)` on every change. If your plugin keeps settings somewhere else (a Svelte store, a reactive proxy, an immutable update mechanism), override the two binding hooks:

```ts
class MyTab extends PluginSettingTab {
    plugin: MyPlugin;

    getControlValue(key: string): unknown {
        return this.plugin.getStateValue(key);
    }

    async setControlValue(key: string, value: unknown): Promise<void> {
        await this.plugin.updateState(key, value);
    }

    getSettingDefinitions() { /* … */ }
}
```

The framework calls `getControlValue(key)` on every render and `setControlValue(key, value)` on every user change. Returning a `Promise<void>` from `setControlValue` is supported — the framework awaits it. Predicates like `visible` and `disabled` don't go through these hooks; they read state directly.

For nested settings (`'editor.fontSize'` style dot-paths), see [examples/nested-settings.md](examples/nested-settings.md).

## Group with `SettingDefinitionGroup`

Inline groups give a heading and shared layout to related settings.

```ts
{
    type: 'group',
    heading: 'Advanced',
    items: [
        { name: 'Debug logging', control: { type: 'toggle', key: 'debug' } },
        { name: 'Cache size', control: { type: 'number', key: 'cacheMb', min: 1 } },
    ],
}
```

Groups also accept `search` (a search input in the header), `extraButtons` (header-level action buttons), `cls` (extra CSS class on the group element), and `visible` (hide the group entirely).

## Mutable lists with `type: 'list'`

For collections the user adds, removes, or reorders, use `type: 'list'` instead of `'group'`. A list is rendered with a denser visual style and supports `emptyState`, `onDelete`, `onReorder`, and `addItem` (a platform-appropriate add affordance — a `+` button in the header on desktop, a tappable row below the list on mobile).

```ts
{
    type: 'list',
    heading: 'Watched folders',
    emptyState: 'No folders being watched yet.',
    addItem: {
        name: 'Add folder',
        action: () => this.openAddFolderModal(),
    },
    onReorder: async (oldIndex, newIndex) => {
        let folders = this.plugin.settings.folders;
        let [moved] = folders.splice(oldIndex, 1);
        folders.splice(newIndex, 0, moved);
        await this.plugin.saveData(this.plugin.settings);
    },
    onDelete: async (idx) => {
        this.plugin.settings.folders.splice(idx, 1);
        await this.plugin.saveData(this.plugin.settings);
        this.update();
    },
    items: this.plugin.settings.folders.map((path) => ({
        name: path,
        searchable: false,
    })),
}
```

See [examples/mutable-list.md](examples/mutable-list.md) for the full canonical pattern. When new entries need a multi-field form (not a single inline input), open a `Modal` from `addItem.action` — see [examples/mutable-list-with-form.md](examples/mutable-list-with-form.md).

## Sub-pages with `SettingDefinitionPage`

Use sparingly — only break a section out into a sub-page when the parent tab is too long to scan, or the section is a self-contained concept.

Two forms:

- **Declarative (`items`)** — content is a list of definitions. The framework renders the page automatically.
- **Imperative (`page`)** — content is rendered by a `SettingPage` subclass. Use when the page's UI is dynamic or can't be expressed as a list of definitions.

Pages can be nested. Page names must be unique among their siblings at the same depth (the framework warns at the console when duplicates are detected).

For imperative pages, override `hide()` to release anything that outlives the DOM (timers, observers). It runs when the user navigates away, the containing tab is switched, or the settings modal is closed — but **not** when the host window is destroyed without a graceful close.

See [examples/page-navigation.md](examples/page-navigation.md).

## Reacting to external state changes

If the tab displays state that changes elsewhere — vault contents, the list of enabled plugins, a value the plugin computes in the background — the tab goes stale while the user has it open. Call `this.update()` to re-run `getSettingDefinitions()` and rebuild.

Register the listeners on the **plugin**, not the settings tab. `Plugin` is a `Component`; `registerEvent` ties the listener's lifetime to plugin unload. A settings tab is built and discarded on every modal open — registering events on the tab would leak or require manual bookkeeping.

```ts
import { Plugin, debounce } from 'obsidian';

export default class MyPlugin extends Plugin {
    settingTab: MyTab;

    async onload() {
        await this.loadSettings();
        this.settingTab = new MyTab(this.app, this);
        this.addSettingTab(this.settingTab);

        let refresh = debounce(() => this.settingTab.update(), 200, true);
        this.registerEvent(this.app.vault.on('create', refresh));
        this.registerEvent(this.app.vault.on('delete', refresh));
        this.registerEvent(this.app.vault.on('rename', refresh));
    }
}
```

`update()` is safe to call when the modal is closed — it refreshes the tab's stored definitions and the search index. The next modal open shows fresh content. Debounce bursty events so a folder-wide rename doesn't trigger one re-render per file.

**Don't reach for external events to hide a row based on another setting's value** — that's what the [`visible` predicate](#conditional-visibility-and-disabled-state) is for. External events are for state your plugin doesn't itself own.

## Style guide

### Sentence case for all UI text

Names, descriptions, headings, button labels, placeholders — anything the user reads in your tab. Only the first word and proper nouns are capitalized.

- ✅ "Template folder location" — ❌ "Template Folder Location"
- ✅ "Create new note" — ❌ "Create New Note"

### No top-level heading

Don't add a "General", "Settings", or plugin-name heading at the top of the tab. The tab title in the sidebar already names the plugin.

```ts
// ❌ don't
return [
    { type: 'group', heading: 'My Plugin', items: [/* … */] },
];

// ✅ do
return [
    { name: 'Foo', control: { type: 'toggle', key: 'foo' } },
    { name: 'Bar', control: { type: 'toggle', key: 'bar' } },
];
```

### Headings only when there are multiple sections

If the whole tab is one section, don't put any group heading. Add headings only once you have two or more distinct sections to separate.

When there are multiple sections and one is "general", leave the general settings at the top with no heading and start headings at the second section. (Mirrors what Obsidian's core tabs do — see Settings → Appearance.)

```ts
return [
    // General — no heading
    { name: 'Default folder', control: { type: 'folder', key: 'folder' } },
    { name: 'Open on launch', control: { type: 'toggle', key: 'openOnLaunch' } },

    // Subsequent sections get headings
    { type: 'group', heading: 'Appearance', items: [/* … */] },
    { type: 'group', heading: 'Advanced', items: [/* … */] },
];
```

### Don't repeat "settings" in headings

Everything under the tab is settings; saying so in every heading is redundant.

- ✅ "Advanced" — ❌ "Advanced settings"
- ✅ "Templates" — ❌ "Settings for templates"

### Save on change, not on submit

A setting in the tab persists the moment the user changes it. `control` definitions auto-save; in `render`, `await this.plugin.saveData(this.plugin.settings)` from inside `onChange`. Never gate persistence on the user navigating away.

If a setting is too complex to commit per keystroke — multiple required fields, cross-field validation, an entry that's only meaningful when fully constructed — it doesn't belong directly in the tab. Surface it through a `Modal` with explicit Save/Cancel and have the tab store the result. Settings tabs and sub-pages aren't forms.

### One control per setting row

Each row should have a single mutable control.

- ✅ One row → one toggle, one dropdown, one text input.
- ❌ Two text inputs in one row, or a text input next to a dropdown.

Multiple controls per row stack vertically on mobile, breaking the tab's visual rhythm and harming readability. When you genuinely need to capture multiple values together (name + path, start + end), use the [mutable list with a form modal](examples/mutable-list-with-form.md) pattern: the tab shows a list of finished entries, and an Add button opens the modal that builds one.

### Avoid textareas in the main tab

A `textarea` is much taller than every other control and disrupts the regular row rhythm of the tab. If you need to collect multi-line text, move it into a form modal (see [examples/mutable-list-with-form.md](examples/mutable-list-with-form.md)) or — when the textarea has to live on the tab — push it to the bottom so it doesn't break the flow of the settings above it.

### Keep descriptions short

`desc` is for a single sentence explaining what the setting does, not for warnings or paragraphs of context. Long descriptions push the next row off-screen, disrupt scanning, and aren't guaranteed to be read.

If the user needs to acknowledge a warning before a setting takes effect — a destructive action, an irreversible migration, a feature with non-obvious consequences — put the warning in a `Modal` with an explicit confirm step. If the user needs background context to understand the setting, link to a docs page from `desc` rather than inlining it.

## Supporting older app versions

If your plugin's `minAppVersion` is below 1.13.0 and you want to use the new declarative API, **keep your existing `display()` implementation alongside `getSettingDefinitions()`**. The framework picks the right path per host:

- **Obsidian 1.13.0+**: `getSettingDefinitions()` runs; `display()` is **not called** when it returns a non-empty array.
- **Obsidian < 1.13.0**: `getSettingDefinitions()` doesn't exist as a concept; `display()` runs as the plugin's setting tab has always done.

```ts
class MyTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    // 1.13.0+: framework uses this and skips display().
    // Controls bind to this.plugin.settings[key] via the default
    // getControlValue/setControlValue.
    getSettingDefinitions() {
        return [/* … */] as SettingDefinitionItem[];
    }

    // < 1.13.0: framework calls this. Your original imperative implementation.
    display(): void {
        let { containerEl } = this;
        containerEl.empty();
        new Setting(containerEl)
            .setName('Foo')
            .addToggle(t => t.setValue(this.plugin.settings.foo).onChange(async v => {
                this.plugin.settings.foo = v;
                await this.plugin.saveData(this.plugin.settings);
            }));
        // …rest of imperative code
    }
}
```

**Notes:**

- The constructor passes `(app, plugin)` to `super()` — `PluginSettingTab` is a 2-argument constructor on every version. No generic, no third argument.
- `PluginSettingTab.getControlValue` / `setControlValue` default to reading and writing `this.plugin.settings`, so `control` definitions bind correctly on 1.13.0+ without any extra wiring.
- The two implementations have to stay in sync — every time you add a setting to one, add it to the other. This is real maintenance overhead; consider whether bumping `minAppVersion` is a better path.

If you only care about the new API and don't want to maintain two implementations, set `minAppVersion: 1.13.0` in your plugin's manifest and write `getSettingDefinitions()` alone.

## Migration recipe

For a tab that currently overrides `display()`:

1. Decide whether you'll bump `minAppVersion` to 1.13.0 or maintain both code paths. See [Supporting older app versions](#supporting-older-app-versions).
2. Add a `getSettingDefinitions()` method returning a `SettingDefinitionItem[]`.
3. For each old `new Setting(containerEl).setName(…).addToggle(t => t.setValue(s.foo).onChange(v => { s.foo = v; await plugin.saveData(s) }))`, write `{ name, desc, control: { type: 'toggle', key: 'foo' } }`. Each `key` corresponds to a property on `this.plugin.settings`.
4. Move any value-shape validation (regex, range, format) from a custom `onChange` into a `validate` callback on the control.
5. Anything that's not a one-key bind stays as a `render` callback. Drop the `setName`/`setDesc` calls inside — the renderer applies them from the definition.
6. For dynamic lists (registered items, user-managed entries), use `type: 'list'` + `addItem` — see [examples/mutable-list.md](examples/mutable-list.md).
7. If going 1.13.0-only: delete the `display()` override and unused imports (typically `Setting`).
8. Smoke-test in a real vault (see [Verification](#verification)).

A worked before/after lives in [examples/migration-simple.md](examples/migration-simple.md).

## Common pitfalls

- `control`, `render`, and `action` on a definition are mutually exclusive — TypeScript will reject more than one.
- `getSettingDefinitions()` runs on every `update()` AND once when the tab is registered (for search indexing). Keep it cheap — no I/O, no network calls.
- `desc` on a definition accepts a `string` or `DocumentFragment`. For rich descriptions with formatting/links, pass a `DocumentFragment` built with `createFragment(...)`.
- A `render` callback does not auto-save. Always `await this.plugin.saveData(this.plugin.settings)` after mutating settings.
- To re-render the tab when the *set* of definitions changes (list mutations, adding/removing rows), call `this.update()`. For interdependent show/hide or enabled state, use `visible`/`disabled` + `this.refreshDomState()` instead — cheaper and preserves DOM. `display()` is bypassed entirely on 1.13.0+ when `getSettingDefinitions()` returns a non-empty array, so calling `display()` won't refresh anything declarative.
- For local search/filter inside a custom group, store `Map<string, Setting>` in `render` callbacks and toggle `setting.settingEl` from the search handler. Don't query the DOM.
- Page names must be unique among their siblings at the same depth, or path-based navigation will misbehave. The framework logs a `console.error` when duplicates are detected.
- `validate` doesn't replace the stored value. If your stored settings might be invalid (loaded from an older plugin version), validate when reading too.

## Settings inside a Modal

If your plugin opens a `Modal` that needs setting rows, you can construct `Setting` and `SettingGroup` directly against the modal's `contentEl`. The declarative system is for `PluginSettingTab` only — modals build their UI imperatively.

## Verification

After authoring or migrating a tab:

1. Build the plugin (`npm run build` or `npm run dev`).
2. Open the plugin's settings tab in Obsidian.
3. Walk top to bottom: every setting renders, every control reflects the current value, every change persists across a reload.
4. Open the global settings search; confirm each setting is findable by name (and `aliases`, if set).
5. For `validate`: try entering invalid input. Confirm the inline error message appears and the value isn't saved. Reload the plugin — the previously-stored value should still be there.
6. For `type: 'list'` groups: add, delete, reorder. Confirm `plugin.settings` is saved after each action.
7. For sub-pages: open and back-navigate.
8. If supporting older app versions: install your plugin on an Obsidian version below 1.13.0 and verify `display()` still renders the settings correctly.

Type checks and tests verify code correctness, not feature correctness — the smoke test is the only way to confirm the tab actually works.