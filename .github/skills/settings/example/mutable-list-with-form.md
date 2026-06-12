# Mutable list with an input form

A pattern for mutable lists where a new entry comes from a small input form (not a single inline field). The form lives in a `Modal` so it can host one or more inputs, validate before appending, and stay out of the list's flow until the user explicitly opens it.

`addItem` already handles platform splits: on desktop it renders a `+` button in the list header, on mobile a tappable `+ {name}` row below the list. Both routes call the same `action`, which opens the modal.

## When to reach for this pattern

- Entries can't be entered in a single inline text field — you need a label, a help line, validation, or multiple fields.
- The list itself stays clean (no perpetual empty input row at the bottom).
- The form needs to live in a `Modal` because of the above.

If a single inline `text` input is enough (e.g. tag aliases), the simpler search-as-quick-add pattern from [mutable-list.md](mutable-list.md) is a better fit.

## Code

```ts
let values: string[] = this.plugin.settings.entries ?? [];

let save = async (newValues: string[]) => {
    this.plugin.settings.entries = newValues;
    await this.plugin.saveData(this.plugin.settings);
    this.update();
};

return [
    {
        type: 'list',
        emptyState: 'No entries yet.',
        addItem: {
            name: 'Add entry',
            action: () => {
                new AddEntryModal(this.app, values, entry => save([...values, entry])).open();
            },
        },
        onDelete: (idx) => save(values.filter((_, i) => i !== idx)),
        items: values.map((value): SettingDefinition => ({
            name: value,
            searchable: false,
        })),
    },
];
```

The framework draws the desktop `+` button and the mobile row from one `addItem` definition — there's no manual `Platform.isMobile` branching at the call site.

## The form modal

A small `Modal` subclass that hosts the form, validates, and returns the entry. Real implementations typically need at least a label, an input, and validation feedback — that's enough that a single inline text field on the list would feel cramped.

```ts
import { App, Modal, ButtonComponent, TextComponent, displayTooltip } from 'obsidian';

class AddEntryModal extends Modal {
    private input: TextComponent;

    constructor(app: App, private existing: string[], private onAdd: (entry: string) => void) {
        super(app);
        this.modalEl.addClass('mod-lg');
        this.setTitle('Add entry');

        this.input = new TextComponent(this.contentEl)
            .setPlaceholder('e.g. archive/');

        this.input.inputEl.addEventListener('keydown', (evt) => {
            if (!evt.isComposing && evt.key === 'Enter') {
                evt.preventDefault();
                this.submit();
            }
        });

        let buttonsEl = this.contentEl.createDiv({ cls: 'modal-button-container' });
        new ButtonComponent(buttonsEl)
            .setButtonText('Add')
            .setCta()
            .onClick(() => this.submit());
        new ButtonComponent(buttonsEl)
            .setButtonText('Cancel')
            .onClick(() => this.close());
    }

    onOpen() {
        this.input.inputEl.focus();
    }

    private submit() {
        let value = this.input.getValue().trim();
        if (!value) {
            displayTooltip(this.input.inputEl, 'Required', { classes: ['mod-error'] });
            return;
        }
        if (this.existing.includes(value)) {
            displayTooltip(this.input.inputEl, 'Already in the list', { classes: ['mod-error'] });
            return;
        }
        this.onAdd(value);
        this.close();
    }
}
```

Notes:

- `mod-lg` on `modalEl` is the project convention for any modal containing inputs — it prevents layout shift when the mobile soft keyboard appears.
- Validation uses `displayTooltip` (public) for an inline error indicator instead of a separate error label. Keeps the form short; matches what core does.
- The constructor takes the existing list so the modal can detect duplicates without round-tripping through the parent.

If you need more than one field — say, a name + a path — replace the single `TextComponent` with a small column of fields. The pattern stays the same: validate in `submit()`, call `onAdd` once, then `close()`.

## Why this works on both platforms

`addItem` is the only affordance you need to declare. The framework chooses the right rendering:

- **Desktop**: a `+` icon in the list header — exactly where users look for chrome actions. `name` becomes the hover tooltip.
- **Mobile**: a tappable `+ {name}` row appended below the list — full-width and unmistakable, even when the list is empty.

The same `action` callback fires from either path. Validation and persistence are unified through the modal.

## API gap

While converting this example from core, one helper stood out as a candidate for the plugin API:

| Symbol | Where used in core | Plugin workaround | Worth exposing? |
|---|---|---|---|
| `FormModal` (and `FormField`) | Core's `AddExclusionModal` extends `FormModal` for CTA + Cancel + `mod-form-sheet` styling, plus a mobile header with X / ✓ buttons. | Build on `Modal` directly with a manual `modal-button-container` (~25 lines, shown above). | **Maybe.** `FormModal` is small and self-contained, and the mobile header treatment is a real ergonomic win that's tedious to replicate. Worth revisiting when the next plugin author asks for it. The `Modal` workaround is short enough not to be a blocker. |

Everything else in the example is on the public API: `Modal`, `ButtonComponent`, `TextComponent`, `displayTooltip`, `SettingDefinitionAction`, and the `type: 'list'` group props (`addItem`, `emptyState`, `onDelete`, `onReorder`).
