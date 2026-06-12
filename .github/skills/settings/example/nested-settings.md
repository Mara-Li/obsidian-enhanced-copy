# Advanced: nested settings storage

> [!important] Keep settings flat when you can
> Flat JSON is the path of least resistance. The framework's default `control` binding reads and writes `this.plugin.settings[key]` directly. If you're starting a new plugin, flatten the shape (`editorFontSize` rather than `editor.fontSize`) and skip this recipe.

This page is for plugins that already ship nested settings JSON and can't reshape the file without a migration. Out of the box, `control: { key: 'foo' }` only reads/writes top-level keys — it can't reach into nested objects. By overriding `getControlValue` and `setControlValue` on your settings tab, you can use **dot-notation keys** (`editor.fontSize`) and still write fully declarative `control` definitions.

## The settings shape

```ts
interface MySettings {
    editor: {
        fontSize: number;
        tabSize: number;
    };
    sync: {
        enabled: boolean;
        interval: number;
    };
    appearance: {
        accentColor: string;
        showLineNumbers: boolean;
    };
}

const DEFAULT_SETTINGS: MySettings = {
    editor: { fontSize: 14, tabSize: 4 },
    sync: { enabled: false, interval: 60 },
    appearance: { accentColor: '#7c3aed', showLineNumbers: true },
};
```

## Dot-path helpers

Recursive get/set on a `'a.b.c'` path. The set helper creates intermediate objects as it walks, so partial settings JSON (e.g. a user upgrading from an older plugin version) doesn't blow up.

```ts
function getPath(obj: any, path: string): unknown {
    let parts = path.split('.');
    let cursor: any = obj;
    for (let part of parts) {
        if (cursor === null || cursor === undefined) return undefined;
        cursor = cursor[part];
    }
    return cursor;
}

function setPath(obj: any, path: string, value: unknown): void {
    let parts = path.split('.');
    let last = parts.pop()!;
    let cursor: any = obj;
    for (let part of parts) {
        if (cursor[part] === null || typeof cursor[part] !== 'object') {
            cursor[part] = {};
        }
        cursor = cursor[part];
    }
    cursor[last] = value;
}
```

## Plugin and SettingTab

The plugin loads/saves settings the usual way — `loadData` / `saveData` round-trip the nested shape directly. The settings tab overrides the two binding hooks so `control: { key: 'editor.fontSize' }` reads from and writes to the nested location.

```ts
import { App, Plugin, PluginSettingTab } from 'obsidian';

export default class MyPlugin extends Plugin {
    settings: MySettings;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new MyTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class MyTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    // The framework calls this for every control's initial render.
    getControlValue(key: string): unknown {
        return getPath(this.plugin.settings, key);
    }

    // The framework calls this on every user change. Persist after writing.
    async setControlValue(key: string, value: unknown): Promise<void> {
        setPath(this.plugin.settings, key, value);
        await this.plugin.saveSettings();
    }

    getSettingDefinitions() {
        return [
            // General — no heading
            {
                name: 'Accent color',
                control: { type: 'color' as const, key: 'appearance.accentColor' },
            },

            {
                type: 'group' as const,
                heading: 'Editor',
                items: [
                    {
                        name: 'Font size',
                        control: { type: 'number' as const, key: 'editor.fontSize', min: 8, max: 32 },
                    },
                    {
                        name: 'Tab size',
                        control: { type: 'number' as const, key: 'editor.tabSize', min: 1, max: 8 },
                    },
                    {
                        name: 'Show line numbers',
                        control: { type: 'toggle' as const, key: 'appearance.showLineNumbers' },
                    },
                ],
            },

            {
                type: 'group' as const,
                heading: 'Sync',
                items: [
                    {
                        name: 'Enable sync',
                        control: { type: 'toggle' as const, key: 'sync.enabled' },
                    },
                    {
                        name: 'Interval (seconds)',
                        desc: 'How often to check for changes.',
                        visible: () => this.plugin.settings.sync.enabled,
                        control: { type: 'number' as const, key: 'sync.interval', min: 5 },
                    },
                ],
            },
        ];
    }
}
```

Notes on the example:

- The `key` literal is a path, not a property name. `editor.fontSize` is two property lookups, not one key called `'editor.fontSize'`.
- The `visible` predicate on `sync.interval` reads through the nested shape directly (`this.plugin.settings.sync.enabled`) — it doesn't go through `getControlValue`. Predicates are plain functions; they touch state however your plugin stores it.
- `setControlValue` is `async` so the framework's auto-save is awaited before the next render. Returning a `Promise<void>` is supported by the binding contract.

## What you give up

- **Compile-time `key` checking.** Dot-notation strings aren't statically verifiable against a nested type — `key: 'editor.fontSiz'` (typo) compiles. If you need it, generate a literal-union type for your dot-paths and pass it as the `K` parameter to `SettingDefinitionItem<K>` / `SettingControl<K>`.
- **One source of truth for defaults.** The framework's per-control `defaultValue` only fires when `getControlValue` returns `undefined` — fine for missing leaf keys, but you have to seed the *shape* of the nested objects yourself (via `Object.assign` in `loadSettings`, as above) or `setPath` won't have anywhere to write.

## When this isn't enough

If your plugin keeps settings in something more exotic than a plain nested object — a Svelte store, an immutable update mechanism, a reactive proxy — the same two overrides still apply. Just have `getControlValue` read through your store's accessor and `setControlValue` go through its mutation API. The framework doesn't care how the value is stored; it only cares that it can ask for one and hand back a new one.
