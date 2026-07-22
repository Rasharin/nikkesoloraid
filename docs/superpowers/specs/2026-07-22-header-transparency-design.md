# Header Transparency Design

## Goal

Keep the header's existing size, position, content alignment, and full-width background coverage while making the background approximately 50% transparent.

## Design

- Apply one shared translucent color to both the header element and its full-width `::before` background extension.
- Use `color-mix(in srgb, var(--bg) 50%, transparent)` so dark and light themes derive transparency from the existing header color.
- Preserve the existing `backdrop-blur`, stacking context, spacing, and header content opacity.
- Do not apply `opacity` to the header element because that would fade the logo, navigation text, and buttons.

## Validation

- Assert that the shared header background rule uses the 50% color mix.
- Assert that the full-width pseudo-element uses the same background value.
- Run the header regression tests, full test suite, lint for changed files, and a production build.
- In the browser, verify that the header content remains fully opaque and both viewport edges use the same translucent background layer.
