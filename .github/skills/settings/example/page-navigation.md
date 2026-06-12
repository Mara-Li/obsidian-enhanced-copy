# Sub-pages with `SettingDefinitionPage`

A page is a navigable entry on the parent tab — clicking it slides in a sub-page with a back button. Use sparingly.

## When to break out a sub-page

- The parent tab is too long to scan, and a coherent section can be hidden behind a single chevron row.
- The section has its own conceptual scope (a dictionary, a font picker, an ignore list).

If the section is just two or three settings, leave them on the parent tab. If it doesn't share a clear concept with its neighbors, leave it.

Pages can nest — `SettingDefinitionPage.items` accepts other pages. **Page names must be unique among their siblings at the same depth** (the framework warns in the console when duplicates are detected, since path-based navigation breaks otherwise).

## Two forms

### Declarative (`items`) — preferred

The page content is a list of definitions. The framework renders the page automatically.

```ts
{
    type: 'page',
    name: 'Advanced',
    desc: 'Power-user options.',
    items: [
        { name: 'Debug logging', control: { type: 'toggle', key: 'debug' } },
        { name: 'Verbose errors', control: { type: 'toggle', key: 'verbose' } },
        {
            type: 'group',
            heading: 'Cache',
            items: [
                { name: 'Cache size (MB)', control: { type: 'slider', key: 'cacheMb', min: 1, max: 500, step: 1 } },
                { name: 'Clear cache', action: () => this.plugin.clearCache() },
            ],
        },
    ],
}
```

Always start here. Reach for the imperative form only when this can't express what you need.

### Imperative (`page`) — for dynamic content

When the page's UI is computed from runtime state, or interleaves rendered content with imperative DOM, subclass `SettingPage` and pass a factory:

```ts
import { SettingPage, Setting } from 'obsidian';

class StatusPage extends SettingPage {
    constructor(private plugin: MyPlugin) {
        super();
        this.title = 'Status';
    }

    display() {
        this.containerEl.empty();

        let stats = this.plugin.computeStats();
        this.containerEl.createEl('h3', { text: `${stats.totalEntries} entries` });
        this.containerEl.createEl('p', { text: `Last sync: ${stats.lastSync}` });

        new Setting(this.containerEl)
            .setName('Refresh now')
            .addButton(btn => btn
                .setButtonText('Refresh')
                .onClick(async () => {
                    await this.plugin.sync();
                    this.display();
                }));
    }
}

// In getSettingDefinitions():
{
    type: 'page',
    name: 'Status',
    page: () => new StatusPage(this.plugin),
}
```

The factory runs each time the page is opened. `display()` runs whenever the page needs to redraw — call `this.display()` from inside the page itself to refresh after state changes.

`items` and `page` are mutually exclusive. Provide one or the other.

### Cleanup with `hide()`

Override `hide()` to release anything that outlives the DOM — timers, observers, registered events on objects the plugin doesn't own. The framework calls `hide()` when the user navigates away, the containing tab is switched, or the settings modal is closed.

```ts
class StatusPage extends SettingPage {
    private timer: number;

    display() {
        this.containerEl.empty();
        this.containerEl.createEl('p', { text: `Last sync: ${new Date().toLocaleTimeString()}` });
        this.timer = window.setInterval(() => this.display(), 1000);
    }

    hide() {
        window.clearInterval(this.timer);
    }
}
```

`hide()` is **not guaranteed** to run when the host window is destroyed without a graceful close (e.g. renderer crash). For state that *must* be released, register it on the plugin instead — plugin unload always runs on graceful shutdown.

## Conditionally showing a page

`SettingDefinitionPage` accepts a `visible` predicate just like a regular definition. To show or hide a navigable entry based on another setting's value, set `visible` on the page:

```ts
return [
    { name: 'Always-visible setting', control: { type: 'toggle', key: 'advanced' } },
    {
        type: 'page',
        name: 'Advanced',
        visible: () => this.plugin.settings.advanced,
        items: [/* … */],
    },
];
```

`visible` is re-evaluated on every DOM-state refresh, and `control` changes trigger one automatically — no `this.update()` needed.

## What you don't get

There is no public `Setting.setNavigable()` and no way to open a `SettingPage` from inside a `render` callback. If the page itself depends on state more complex than a single setting value (e.g. the parent computes which items it should contain), build the items array inside `getSettingDefinitions()` and call `this.update()` from the upstream change.
