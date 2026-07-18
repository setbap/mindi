# Markdown rendering security and GFM support

**Ticket:** Research Markdown rendering security and GFM support  
**Scope:** Evidence for a later product decision about how Mindi renders a Node's
stored raw Markdown. This note deliberately does **not** choose the product
policy.  
**Sources:** Primary project documentation, the GFM specification, the HTML
Standard, and the Clipboard API specification.  
**Date:** 2026-07-19

## Context

Each Mindi **Node** stores raw Markdown. The display renderer must remain safe
for locally authored, imported, and pasted content alike. Offline availability
does not make imported or pasted content trusted: it only changes where the
renderer runs.

## What the selected renderer supports by default

`react-markdown` builds React elements from its Markdown/remark/rehype pipeline
instead of rendering a string through `dangerouslySetInnerHTML`; its maintainers
describe the default as safe. It follows CommonMark by default, and its
documentation states that `remark-gfm` adds full GFM support. [react-markdown
README](https://github.com/remarkjs/react-markdown#what-is-this),
[syntax and GFM support](https://github.com/remarkjs/react-markdown#syntax)

`remark-gfm` supplies these GFM extensions: autolink literals, footnotes,
strikethrough, tables, and task lists. It parses and serializes Markdown; it
does not itself decide how Markdown becomes HTML/React. [remark-gfm
README](https://github.com/remarkjs/remark-gfm#what-is-this)

This gives the later product decision a narrow baseline: CommonMark plus
`remark-gfm` can support ordinary note syntax without adding a raw-HTML parser,
syntax-highlighting transform, or MDX/JSX execution surface.

## Raw HTML: evidence and decision options

CommonMark/GFM recognize HTML-looking text as raw HTML. GFM's `tagfilter`
extension filters a small named set of dangerous raw tags, but the spec still
defines a general raw-HTML construct; its tag filter is not a complete HTML
sanitizer. [GFM raw HTML](https://github.github.com/gfm/#raw-html), [GFM
disallowed raw HTML](https://github.github.com/gfm/#disallowed-raw-html-extension-)

By default, `react-markdown` typically escapes HTML. Its `skipHtml` option can
instead ignore HTML completely. Enabling actual HTML rendering requires
`rehype-raw`; the project explicitly frames that as appropriate only in a
trusted environment and notes its approximately 60 kB minzipped cost. [HTML in
markdown](https://github.com/remarkjs/react-markdown#appendix-a-html-in-markdown),
[options](https://github.com/remarkjs/react-markdown#options)

The dependent product ticket can choose between:

| Option | Consequence |
| --- | --- |
| Escape raw HTML (react-markdown baseline) | Preserves source visibly as text; no raw HTML execution/rendering surface. |
| Ignore raw HTML (`skipHtml`) | Removes raw HTML from display; simpler display but source and preview differ more visibly. |
| Render raw HTML (`rehype-raw`) | Enables an HTML feature surface; requires a deliberate sanitization policy and an additional bundle cost. |

If raw HTML is ever chosen, `rehype-sanitize` is the relevant first-party
sanitizer. It drops anything not explicitly allowed by its schema and defaults
to GitHub-style sanitation. Its examples remove event handlers, JavaScript URLs,
scripts, iframes, and unsafe properties. The project recommends sanitizing
whenever authors or plugins are not completely trusted. [rehype-sanitize
README](https://github.com/rehypejs/rehype-sanitize#what-is-this), [unsafe
example](https://github.com/rehypejs/rehype-sanitize#use)

The sanitizer's schema covers allowed tag names, attributes, and URL protocols;
extensions should be narrowly constrained. It also protects against DOM
clobbering through its default schema/prefixing facilities. [hast-util-sanitize
schema](https://github.com/syntax-tree/hast-util-sanitize#schema),
[rehype-sanitize clobbering example](https://github.com/rehypejs/rehype-sanitize#example-headings-dom-clobbering)

## URLs and link behaviour

`react-markdown` applies `defaultUrlTransform` unless a caller replaces it. The
default allows `http`, `https`, `irc`, `ircs`, `mailto`, and `xmpp`, plus
relative URLs. The maintainers explicitly warn that making `urlTransform`
less restrictive creates XSS vectors. [react-markdown URL
transform](https://github.com/remarkjs/react-markdown#defaulturltransformurl),
[security guidance](https://github.com/remarkjs/react-markdown#security)

GFM autolinking accepts more than just web URLs: its grammar permits arbitrary
URI schemes in angle-bracket autolinks, and its extension also recognizes
several bare URL forms. Consequently, a GFM parser alone is not a protocol
policy; the renderer transform remains the enforcement boundary. [GFM
autolinks](https://github.github.com/gfm/#autolinks), [extended
autolinks](https://github.github.com/gfm/#autolinks-extension)

`react-markdown` has no built-in `linkTarget` setting in current releases; the
maintainers direct users to a plugin such as `rehype-external-links` if they
want target behaviour. A custom `a` component is also an available render
boundary. [removed `linkTarget`](https://github.com/remarkjs/react-markdown/blob/main/changelog.md#remove-linktarget),
[custom components](https://github.com/remarkjs/react-markdown#appendix-b-components)

The later UX decision has two straightforward options:

| Option | Consequence |
| --- | --- |
| Same-context links | No new-tab policy or `rel` attributes are needed; navigation leaves the app shell. |
| New-tab external links | Set `target="_blank"` in one centralized anchor policy and explicitly add `rel="noopener noreferrer"` if privacy as well as opener isolation is desired. The HTML Standard makes `_blank` noopener by default unless `rel=opener` is present; `noreferrer` additionally suppresses referrer information. [HTML Standard](https://html.spec.whatwg.org/multipage/links.html#link-type-noopener), [HTML Standard on `noreferrer`](https://html.spec.whatwg.org/dev/links.html#link-type-noreferrer) |

Images are part of Markdown's ordinary HTML-equivalent output (`img` receives a
`src`), so the product decision should separately say whether remote images are
rendered, blocked, or represented as links. They are not needed to support the
GFM feature set. [react-markdown components](https://github.com/remarkjs/react-markdown#appendix-b-components)

## Plugin and component boundary

The `react-markdown` maintainers warn that remark plugins, rehype plugins, and
custom components can independently be unsafe, even though the base component
is safe. If transformations are added, they recommend `rehype-sanitize` after
them to protect the resulting tree. [react-markdown security](https://github.com/remarkjs/react-markdown#security),
[rehype-sanitize recommendation](https://github.com/rehypejs/rehype-sanitize#when-should-i-use-this)

For the implementer, this means a small, explicit plugin allowlist is auditable;
arbitrary plugin registration or rendering untrusted custom components is not.
If a future feature adds an unsafe transform (for example raw HTML parsing),
sanitization must be the final tree-safety step after that transform. This last
ordering statement is an implementation inference from the documented fact
that plugins can be unsafe and sanitization operates on the resulting HAST.

## Paste and source normalization implications

The Clipboard API exposes `text/plain` and `text/html` separately on paste;
web applications can read a chosen format from `ClipboardEvent.clipboardData`.
[Clipboard API paste formats](https://www.w3.org/TR/clipboard-apis/#mandatory-data-types),
[ClipboardEvent API](https://www.w3.org/TR/clipboard-apis/#clipboardevent-clipboarddata)

For an editor that stores raw Markdown, accepting `text/plain` preserves the
user's Markdown source and avoids converting untrusted clipboard HTML into a
new HTML feature surface. This is an implementation recommendation, not a
product decision. If a later import/paste feature elects to convert rich HTML
to Markdown, it needs a separately specified, tested conversion policy; browser
clipboard HTML is a distinct representation and may be supplied unsanitized.
[Clipboard unsanitized data types](https://www.w3.org/TR/clipboard-apis/#unsanitized-data-types)

Avoid destructive generic whitespace normalization at the storage boundary:
CommonMark/GFM assign meaning to indentation, blank lines, trailing spaces or
backslashes before line breaks, and table alignment. For example, GFM defines
hard breaks using two trailing spaces or a backslash, while soft breaks may
render differently. [GFM hard and soft line
breaks](https://github.github.com/gfm/#hard-line-breaks), [GFM soft line
breaks](https://github.github.com/gfm/#soft-line-breaks)

## Questions for the dependent product decision

1. Should raw HTML be escaped, ignored, or supported with an explicitly
   versioned sanitizer schema?
2. Which URL schemes, if any, should be narrower than react-markdown's default
   GitHub-like allowlist?
3. Do external links open in the same context or a new tab, and should external
   images be rendered at all?
4. Which GFM features are display-only versus interactive (notably task-list
   checkboxes)?
5. Is paste plain-text-only in v1, and if so, which minimal line-ending
   canonicalization is permitted without altering Markdown meaning?

## Evidence-based baseline, not a decision

The lowest-complexity safe combination supported by the primary sources is
`react-markdown` with `remark-gfm`, no `rehype-raw`, and the untouched default
URL transform. The dependent ticket must still make the user-facing decisions
about escaped-versus-ignored HTML, external-link/image behavior, task-list
interaction, and paste semantics.
