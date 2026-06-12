# Migration: `display()` → `getSettingDefinitions()`

A worked before/after for a small plugin tab. Three settings: a toggle, a dropdown with a default value, and a text input that needs custom validation.

This example shows two migration paths:
- **Path A — clean migration** (bump `minAppVersion: 1.13.0`): delete `display()`, write only `getSettingDefinitions()`.
- **Path B — dual support** (keep older `minAppVersion`): keep `display()`, add `getSettingDefinitions()` alongside it.

Choose Path B only if you have an existing user base on Obsidian < 1.13.0 that you can't drop. Otherwise prefer Path A — it's simpler and avoids maintaining two implementations.

## Before (both paths start here)

```ts
import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MySettings {
    enabled: boolean;
    mode: 'fast' | 'thorough';
    cacheKey: string;
}

class MyTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Enable feature')
            .setDesc('Turns the feature on or off.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.enabled = value;
                    await this.plugin.saveData(this.plugin.settings);
                }));

        new Setting(containerEl)
            .setName('Mode')
            .addDropdown(dropdown => dropdown
                .addOption('fast', 'Fast')
                .addOption('thorough', 'Thorough')
                .setValue(this.plugin.settings.mode ?? 'fast')
                .onChange(async (value) => {
                    this.plugin.settings.mode = value as 'fast' | 'thorough';
                    await this.plugin.saveData(this.plugin.settings);
                }));

        new Setting(containerEl)
            .setName('Cache key')
            .setDesc('Alphanumeric only.')
            .addText(text => text
                .setPlaceholder('default')
                .setValue(this.plugin.settings.cacheKey)
                .onChange(async (value) => {
                    let trimmed = value.trim();
                    if (!/^[a-z0-9]*$/i.test(trimmed)) return;
                    this.plugin.settings.cacheKey = trimmed;
                    await this.plugin.saveData(this.plugin.settings);
                }));
    }
}
```

## Path A: clean migration (1.13.0+)

```ts
import { App, PluginSettingTab } from 'obsidian';

interface MySettings {
    enabled: boolean;
    mode: 'fast' | 'thorough';
    cacheKey: string;
}

class MyTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    getSettingDefinitions() {
        return [
            {
                name: 'Enable feature',
                desc: 'Turns the feature on or off.',
                control: { type: 'toggle' as const, key: 'enabled' },
            },
            {
                name: 'Mode',
                control: {
                    type: 'dropdown' as const,
                    key: 'mode',
                    defaultValue: 'fast',
                    options: { fast: 'Fast', thorough: 'Thorough' },
                },
            },
            {
                name: 'Cache key',
                desc: 'Alphanumeric only.',
                control: {
                    type: 'text' as const,
                    key: 'cacheKey',
                    placeholder: 'default',
                    validate: (value: string) =>
                        /^[a-z0-9]*$/i.test(value.trim()) ? undefined : 'Use letters and digits only.',
                },
            },
        ];
    }
}
```

**What changed from Before:**

- `display()` is gone. The framework renders from the array.
- All three settings collapse to `control` definitions. The framework reads `this.plugin.settings[key]`, writes changes back, and calls `saveData()` for you.
- The `cacheKey` rejection-on-invalid logic moved from a custom `onChange` into a `validate` callback. The framework now shows an inline error message when the input doesn't match.
- Imports drop `Setting` (no longer needed).

Update your manifest:

```json
{
    "minAppVersion": "1.13.0"
}
```

## Path B: dual support (keep older `minAppVersion`)

Keep `display()` exactly as it is, and add `getSettingDefinitions()` alongside it. On Obsidian 1.13.0+, the framework calls `getSettingDefinitions()` and skips `display()`. On older versions, `display()` runs as it always has.

```ts
import { App, PluginSettingTab, Setting } from 'obsidian';

interface MySettings {
    enabled: boolean;
    mode: 'fast' | 'thorough';
    cacheKey: string;
}

class MyTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    // 1.13.0+: framework calls this and skips display().
    // Controls bind to this.plugin.settings[key] via the default
    // getControlValue/setControlValue.
    getSettingDefinitions() {
        return [
            {
                name: 'Enable feature',
                desc: 'Turns the feature on or off.',
                control: { type: 'toggle' as const, key: 'enabled' },
            },
            {
                name: 'Mode',
                control: {
                    type: 'dropdown' as const,
                    key: 'mode',
                    defaultValue: 'fast',
                    options: { fast: 'Fast', thorough: 'Thorough' },
                },
            },
            {
                name: 'Cache key',
                desc: 'Alphanumeric only.',
                control: {
                    type: 'text' as const,
                    key: 'cacheKey',
                    placeholder: 'default',
                    validate: (value: string) =>
                        /^[a-z0-9]*$/i.test(value.trim()) ? undefined : 'Use letters and digits only.',
                },
            },
        ];
    }

    // < 1.13.0: framework calls this. Keep your original imperative implementation.
    display(): void {
        let { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Enable feature')
            .setDesc('Turns the feature on or off.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.enabled = value;
                    await this.plugin.saveData(this.plugin.settings);
                }));

        // …mode and cacheKey settings unchanged from Before
    }
}
```

**Notes on Path B:**

- `PluginSettingTab` is a 2-argument constructor on every version — same `super(app, plugin)` regardless of `minAppVersion`.
- `PluginSettingTab.getControlValue` / `setControlValue` default to reading and writing `this.plugin.settings`, so `control` definitions bind correctly on 1.13.0+ without any extra wiring.
- The two implementations have to stay in sync — every time you add a setting in one, add it in the other. This is real maintenance overhead; reconsider Path A.
- Once your user base on < 1.13.0 is small enough, delete the `display()` method and bump `minAppVersion` to `1.13.0`.

## When to keep `render` (instead of `control`)

In Path A above, the `cacheKey` validation moved from a hand-rolled `onChange` into `validate`. That works whenever the rejection is purely about the value's shape (regex, range, format). But there are cases where `control` + `validate` isn't enough and `render` is the right tool:

- **Side effects** on change (call a method, update a status bar, refresh another view).
- **Inverted or derived values** (toggle drives a string config, slider drives a complex calculation).
- **Custom suggesters** beyond `file`/`folder` (e.g. a command picker, tag picker).

For these, a `render` callback gives you full control over the `Setting` row.

For **conditional visibility** based on another setting's value, don't use `render` — use the `visible` predicate. See the SKILL.md section on "Conditional visibility and disabled state".
