# Dice Roll Plugin — Design Spec

## Entry Points

| Trigger | Behaviour |
|---|---|
| Lasso / Selection button | Immediately parse OCR'd text as dice notation → skip input screen → show result. If parsing fails, fall back to input screen pre-populated with raw OCR text + inline error |
| Side button | Show empty text input with placeholder `"Enter dice notation (e.g. 4d6, 2d20+3)"` |

## Supported Dice

d4, d6, d8, d10, d12, d20, d100 only. Any other die type returns a clear inline error.

## Notation Syntax

| Pattern | Example |
|---|---|
| `NdX` | `4d6` |
| `NdX+N` / `NdX-N` | `2d8+3`, `1d20-1` |
| `NdX+NdY` | `2d6+1d4` |

Parsing is case-insensitive. Whitespace is stripped before parsing.

## Dice Visuals

Each die face is drawn as a **number inside a shape outline** (black outline, white fill, black number — optimised for e-ink):

| Die | Shape |
|---|---|
| d4 | Triangle |
| d6 | Square |
| d8 | Diamond |
| d10 | Pentagon |
| d12 | Hexagon |
| d20 | Circle |
| d100 | Circle (double-outlined) |

## Animation (toggle)

- **On:** 2–3 frame shuffle — each die rapidly flips through random numbers, then lands on the final result
- **Off:** Result appears immediately
- Toggle state persists across sessions via AsyncStorage

## UI Layout (single scrollable screen)

```
┌─────────────────────────────────┐
│  [Text input: dice notation   ] │
│  [         Roll button        ] │
│  [Error message if any        ] │
│  ─────────────────────────────  │
│  Animation: [toggle ON/OFF]     │
│  ─────────────────────────────  │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐       │  ← dice faces grid
│  │ 4 │ │ 2 │ │ 6 │ │ 5 │       │    wraps at ~4–5/row
│  └───┘ └───┘ └───┘ └───┘       │
│                                 │
│  Total: 17                      │
│                                 │
│  [Copy Total]  [Insert Dice]    │
│  [        Close               ] │
└─────────────────────────────────┘
```

- Dice grid wraps automatically (~4–5 dice per row)
- **Copy Total** — copies the total number to clipboard
- **Insert Dice** — inserts a rasterised PNG of the dice faces into the current note (falls back to text art if sn-plugin-lib does not support image insertion)

## Error Handling

Inline message displayed below the text input. Examples:
- `"Unknown die type: d99. Supported: d4, d6, d8, d10, d12, d20, d100"`
- `"Invalid notation. Try: 4d6, 2d20+3, 1d8+1d6"`
- `"Number of dice must be between 1 and 100"`

## Persistence

| Data | Persisted |
|---|---|
| Animation toggle | Yes (AsyncStorage) |
| Last notation | No |
| Roll history | No |

## Development Loop

Green-red-green cycle using `./buildPlugin.sh`:
1. Confirm green build
2. Add feature
3. Run `./buildPlugin.sh`
4. Debug errors
5. Confirm green build
6. Commit
7. Repeat
