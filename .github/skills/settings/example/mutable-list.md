# Mutable lists with `type: 'list'`

A `SettingDefinitionList` (`type: 'list'`) is a group configured for user-managed rows: drag-to-reorder, delete via button or Delete/Backspace, an empty state, and a platform-appropriate add affordance.

## When to use it

Any time the user adds, removes, or reorders rows of the same kind: watched folders, tag aliases, custom commands, blocked patterns. Distinct from a plain `type: 'group'`, which is just a heading + a static list.

## Canonical example

A "watched folders" feature: the user adds folder paths, can reorder them, and can delete them. `addItem` renders the add affordance (a `+` button in the list header on desktop, a tappable `+ {name}` row below the list on mobile).

```ts
{
    type: 'list',
    heading: 'Watched folders',
    emptyState: 'No folders being watched yet.',
    addItem: {
        name: 'Add folder',
        action: () => this.openAddFolderModal(),
    },
    search: this.plugin.settings.folders.length > 0
        ? (search) => search
            .setPlaceholder('Filter folders…')
            .onChange(query => this.filterRows(query))
        : undefined,
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
    items: this.plugin.settings.folders.map((path): SettingDefinition => ({
        name: path,
        searchable: false,
    })),
}
```

## Why each piece

- **`type: 'list'`** — the visual treatment (drag handle column, delete affordance, denser rows) and unlocks `emptyState`, `onReorder`, `onDelete`, and `addItem`.
- **`emptyState`** — shown when `items` is empty. Plain string or `DocumentFragment`.
- **`addItem`** — renders a platform-appropriate add affordance. On desktop, a `+` button in the list header (with `name` as the tooltip). On mobile, a tappable `+ {name}` row appended below the list. The mobile row is not part of the indexed `items` — it doesn't appear in search and doesn't shift `onDelete`/`onReorder` indices.
- **`search`** — optional in-group filter. Returning `undefined` (vs. a callback) hides the input entirely; conditioning on `items.length > 0` keeps the header clean when empty.
- **`onReorder`** — the framework adds drag handles and calls back with `(oldIndex, newIndex)`. The DOM is already reordered for you; just update your data and save. No `this.update()` needed.
- **`onDelete`** — adds a delete button to each row AND wires Delete/Backspace on the focused row. Always call `this.update()` after, since removing an entry changes the items array.
- **`items.map(... searchable: false)`** — `searchable: false` keeps every individual row out of the global settings search. Without it, every folder path would surface as a separate result.

## Action-only rows

For lists where each row is a "click to do something" entry (e.g. a row of registered commands the user can pin), use `SettingDefinitionAction` instead of a plain definition:

```ts
items: availableCommands.map((cmd): SettingDefinitionAction => ({
    name: cmd.name,
    searchable: false,
    action: () => {
        this.plugin.settings.pinned.push(cmd.id);
        void this.plugin.saveData(this.plugin.settings);
        this.update();
    },
})),
```

The framework styles the row clickable and calls `action` when the user clicks. No `render` needed.
