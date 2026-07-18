# Node Markdown is rendered without raw HTML

Mindi renders Node Markdown as CommonMark plus GFM while escaping raw HTML. Links permit only HTTP(S) and mailto destinations and open outside the app with `noopener noreferrer`; task-list controls are display-only. Images may load when available, but an offline or failed image becomes an alt-text button/link. This retains familiar note syntax without adding an HTML execution surface or making remote assets a prerequisite for reading a Map.
