# Snip — Design Language

Inspired by lovable.dev: warm-gradient glow, pill chat-input, generously-rounded
cards, clean bold type — rendered here as a **dark-mode** interpretation.

---

## Color Tokens

| Token              | Value                        | Role                         |
|--------------------|------------------------------|------------------------------|
| `--bg-base`        | `#0C0B0F`                    | Page background              |
| `--bg-surface`     | `#141219`                    | Cards & containers           |
| `--bg-elevated`    | `#1C1A23`                    | Input shell, elevated panels |
| `--text-primary`   | `#F4F0EC`                    | Headlines & body             |
| `--text-muted`     | `#7A7688`                    | Labels, meta, table headers  |
| `--text-dim`       | `#4A4856`                    | Placeholders, disabled       |
| `--border`         | `rgba(255,255,255,0.07)`     | Subtle dividers / card edges |
| `--border-focus`   | `rgba(240,45,138,0.45)`      | Focus rings                  |

---

## Accent Gradient

Palette reference: **coral** `#FF5E57` · **hot-pink** `#F02D8A` · **orange** `#FF8040`

| Token          | Value                                                                              |
|----------------|------------------------------------------------------------------------------------|
| `--accent`     | `linear-gradient(135deg, #FF5E57 0%, #F02D8A 50%, #FF8040 100%)`                  |
| `--glow-bg`    | `radial-gradient(ellipse 90% 55% at 50% 0%, rgba(240,45,138,0.22) 0%, rgba(255,94,87,0.15) 40%, transparent 70%)` |
| `--glow-btn`   | `0 0 24px rgba(240,45,138,0.50), 0 2px 8px rgba(255,94,87,0.40)`                  |
| `--shadow-card`| `0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.50)`                     |

---

## Typography

```
font-stack : 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif
--text-xs  : 0.75rem
--text-sm  : 0.875rem
--text-base: 1rem
--text-lg  : 1.125rem
--text-hero: clamp(2.25rem, 5vw, 3.5rem)  weight 800  letter-spacing -0.03em
subline    : --text-lg  weight 400  color --text-muted
```

---

## Spacing

```
--space-xs  : 0.5rem    — tight inner padding, badge insets
--space-sm  : 0.875rem  — compact row/column gaps
--space-md  : 1.5rem    — card padding, section gaps
--space-lg  : 2.5rem    — between major sections
--space-xl  : 4rem      — hero vertical breathing room
```

---

## Radii, Borders & Shadows

| Token           | Value     | Used for                        |
|-----------------|-----------|---------------------------------|
| `--radius-card` | `20px`    | Link table card, notices        |
| `--radius-input`| `16px`    | Chat-style form shell           |
| `--radius-btn`  | `10px`    | "Shorten" action button         |
| `--radius-pill` | `9999px`  | Hit-count badge                 |

Card border: `1px solid var(--border)` + `var(--shadow-card)`
Focus ring: `0 0 0 3px rgba(240,45,138,0.18)` + `border-color var(--border-focus)`

---

## Element Mapping

| Snip UI element      | Design role                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| `<h1>` + tagline     | **Hero** — `--text-hero` w-800, gradient text fill; muted subline; `--glow-bg` radial blob anchored at `top 50%` |
| URL `<form>`         | **Chat-style input shell** — `--bg-elevated` surface, `--radius-input`, inset padding, focus ring; gradient "Shorten" button with `--glow-btn` |
| Success notice       | Rounded notice card (`--radius-card`), `rgba(30,255,140,0.05)` tint, `rgba(30,255,140,0.20)` border; short URL coloured with `--accent` gradient text |
| Error notice         | Rounded notice card, `rgba(255,59,59,0.08)` tint, `rgba(255,59,59,0.25)` border; text `#FF8A80` |
| Links table          | `--bg-surface` card with `--radius-card`, `--border`, `--shadow-card`; small-caps header row; gradient-filled code links; hit count in `--radius-pill` badge |
