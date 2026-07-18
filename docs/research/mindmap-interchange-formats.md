# Mind-map interchange formats

**Ticket:** Research mind-map interchange formats  
**Scope:** Compare established interchange formats with the information Mindi needs to exchange one Map faithfully: a forest of ordered Nodes, raw Markdown, color-slot references, chosen Node widths, and stable identifiers. This is decision support only; it does not select Mindi's product format.  
**Date:** 2026-07-18  
**Sources:** Format specifications and first-party project documentation/source only.

## Requirements being evaluated

Mindi's existing domain language matters here. A Map is a non-empty **forest** of ordered Roots; every Node stores raw Markdown, a width, and a **color slot** (`1`–`9`) whose actual color is resolved from a Palette. Nodes need stable identities for links and validation. An export intended as a Mindi backup must round-trip every one of those facts, rather than merely reproduce a similar outline.

“Native” below means the published format gives the fact a defined representation that another conforming implementation can understand. “Extension only” means it can be serialized somehow, but interoperability and preservation by another tool are not guaranteed.

## Options matrix

| Format | Forest / ordered children | Raw Markdown | Color slots (not just hex) | User Node width | Stable identifiers | Lossless Mindi round-trip | Interchange posture |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FreeMind / Freeplane `.mm` | One root only; child XML order represents siblings | No; `TEXT` and HTML/XHTML rich content, not Markdown | No defined palette-slot concept; color/style values are concrete styling | Yes, Freeplane has min/max width; FreeMind has geometry/styling attributes | Yes | No | Useful best-effort import/export adapter, not Mindi's backup format |
| OPML 2.0 | Multiple top-level `outline`s and nested, ordered child elements | No defined Markdown field; `text` is required and may contain encoded HTML | No standard color-slot meaning | No | No standard ID field | No | Strong generic outline interchange; extension namespace could carry Mindi data, but foreign processors may ignore it |
| CommonMark | Ordered nested lists can represent a forest-like outline | Yes, as document/node body text | No | No | No | No | Human-readable outline export/import, not a semantic Map interchange format |
| Mindi-versioned JSON | Can represent the domain directly | Yes | Yes | Yes | Yes | Yes, if schema/version validation and migrations are specified | Candidate native backup/interchange envelope; decide separately |

## Findings by format

### FreeMind and Freeplane XML

FreeMind's official XML Schema declares a `map` with a required version and one top-level `node`; it is therefore a single-root tree, not Mindi's multi-Root forest. The same schema permits unbounded nested `node` elements, whose XML document order is the only natural sibling ordering. [FreeMind XSD](https://sourceforge.net/p/freemind/code/ci/master/tree/freemind/freemind.xsd), [FreeMind file-format page](https://freemind.sourceforge.io/wiki/index.php/File_format).

The format supplies an XML `ID`, text, concrete colors, layout/style fields, and rich-content containers. Freeplane's official test maps demonstrate `ID`, `TEXT`, `COLOR`, `BACKGROUND_COLOR`, `MAX_WIDTH`, `MIN_WIDTH`, nested nodes, and HTML in `richcontent`; its scripting reference calls the rich content HTML and exposes both raw HTML and plain-text views. That can preserve an imported Freeplane width or concrete color in a conversion, but neither project defines Mindi's symbolic palette-slot reference or raw Markdown as the Node content. [Freeplane structured test map](https://raw.githubusercontent.com/freeplane/freeplane/1.13.x/freeplane_framework/test_data/StructuredMapTest.mm), [Freeplane rich-text test map](https://raw.githubusercontent.com/freeplane/freeplane/1.13.x/freeplane_framework/test_data/RichtextTests.mm), [Freeplane scripting reference](https://docs.freeplane.org/scripting/Reference.html).

Freeplane's published format documentation also points to its XML schema, which defines a single root Node and width/ID fields. [Freeplane document format](https://docs.freeplane.org/attic/old-mediawiki-content/Document_Format.html), [Freeplane schema](https://github.com/igor-go/mm_xslt_exports/blob/master/freeplane_1.3.x.xsd).

Thus an `.mm` importer should make explicit conversion choices: either reject a file that cannot become one Mindi Map without loss, or convert its sole root and children while mapping concrete colors/HTML into Mindi's supported equivalents. Exporting a Mindi forest needs a synthetic root, which is itself a lossy interoperability convention. Neither format specification establishes that an unknown Mindi extension will survive another editor's save cycle, so it cannot promise lossless Mindi round-trip.

### OPML 2.0

OPML is explicitly an outline exchange format. Its body contains one or more `outline` elements, and an `outline` has required `text`, zero or more further attributes, and zero or more nested `outline` elements. XML order supplies top-level and sibling order, so it represents Mindi's forest shape without a synthetic root. [OPML 2.0 specification](https://opml.org/spec2.opml).

However, each outline's defined data is named string attributes. `text` is the required display text; it *may* contain encoded HTML markup, but the spec does not define a Markdown field, Node ID, width, palette slot, or a shared palette. OPML permits namespace-defined extensions, and says processors should ignore attributes they do not understand. That makes a documented Mindi extension possible, but also proves that a generic OPML round-trip cannot be relied upon to retain Mindi-specific attributes. [OPML 2.0 specification](https://opml.org/spec2.opml).

OPML is consequently attractive as a deliberately lossy, broadly recognizable outline export/import path. It should not be presented as a lossless backup unless the product owns both ends and specifies a namespaced Mindi profile.

### CommonMark outline Markdown

CommonMark is a specification for structured plain-text documents. Its block grammar defines list items and lists, including nested lists; that preserves a visible ordered outline and its textual Markdown source. [CommonMark specification: lists](https://spec.commonmark.org/0.31.2/#lists), [CommonMark specification: list items](https://spec.commonmark.org/0.31.2/#list-items).

It is not a mind-map data schema: the specification has no Map/Node identifier, parent-reference, width, color, palette, or layout metadata. Headings and lists also leave conversion policy open (for example whether a heading is a Root or a title). Markdown is therefore the best human-readable content/outline export, but cannot be Mindi's lossless record format. GitHub-flavored Markdown does not change that conclusion; its official syntax extensions add authoring features, not a standardized mind-map metadata model. [GitHub Flavored Markdown specification](https://github.github.com/gfm/).

### A versioned Mindi JSON envelope

JSON itself is only a syntax, not a third-party interchange profile. That is an advantage for a native Mindi export: a small versioned envelope can directly model Map metadata, ordered `rootIds`, a keyed Node collection with `id`, `parentId`, `childIds`, raw `markdown`, `width`, and `colorSlot`, plus the Palette version/value data needed to interpret a slot. It can validate Mindi's non-empty-Map invariant before import and migrate known older versions at the boundary.

This would be an application-defined format rather than a standard understood by other mind-mapping programs. Its lossless guarantee is consequently realistic only if Mindi publishes the schema, pins a format version, validates imports, and maintains migrations. It remains the only option above capable of representing all current domain facts without an undocumented extension or conversion.

## Recommendation posture for the later format decision

Keep two concerns separate:

1. **Native backup / faithful Mindi-to-Mindi transfer:** evaluate a custom, versioned JSON envelope as the primary candidate. It is the only option that naturally carries raw Markdown, symbolic color slots, widths, IDs, ordered Roots, and validation/migration semantics.
2. **Interoperability / human-readable exports:** evaluate OPML, `.mm`, and CommonMark as optional adapters with explicit, documented loss rules. OPML preserves forest outline shape best; Markdown preserves human-editable raw content best; `.mm` targets FreeMind/Freeplane users but requires the most semantic conversion.

The product-format ticket still needs to decide whether external import/export ships in the initial scope, the exact JSON schema and versioning policy, palette scope, handling of unsupported rich content/styles, and how an imported single-root or empty/out-of-domain document is reported to the user.

## Primary sources

| Source | What it establishes |
| --- | --- |
| [FreeMind XSD](https://sourceforge.net/p/freemind/code/ci/master/tree/freemind/freemind.xsd) | XML map/node structure, IDs, concrete styling and rich-content elements. |
| [FreeMind file-format page](https://freemind.sourceforge.io/wiki/index.php/File_format) | The XSD is the project's format documentation for FreeMind 1.0.1. |
| [Freeplane document format](https://docs.freeplane.org/attic/old-mediawiki-content/Document_Format.html) and [schema](https://github.com/igor-go/mm_xslt_exports/blob/master/freeplane_1.3.x.xsd) | Freeplane format documentation and schema. |
| [Freeplane structured map](https://raw.githubusercontent.com/freeplane/freeplane/1.13.x/freeplane_framework/test_data/StructuredMapTest.mm) and [rich-text map](https://raw.githubusercontent.com/freeplane/freeplane/1.13.x/freeplane_framework/test_data/RichtextTests.mm) | First-party concrete format fixtures for IDs, widths, colors, hierarchy, and HTML rich content. |
| [Freeplane scripting reference](https://docs.freeplane.org/scripting/Reference.html) | HTML/plain-text node-content vocabulary. |
| [OPML 2.0 specification](https://opml.org/spec2.opml) | Multiple top-level outlines, nested outlines, text and extension rules. |
| [CommonMark specification](https://spec.commonmark.org/0.31.2/) and [GFM specification](https://github.github.com/gfm/) | Standard Markdown document/list grammar and GFM's scope. |

