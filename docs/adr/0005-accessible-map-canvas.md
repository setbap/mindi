# The Map canvas uses one active-descendant focus host

Mindi exposes the layout-owned canvas as one labelled, tabbable focus host whose `aria-activedescendant` represents the domain Focused Node; the Node browser remains the semantic tree alternative. This prevents React Flow graph-editor focus, selection, and arrow-move defaults from becoming a second interaction model while preserving a visible focus ring, keyboard exit route, and concise assistive-technology feedback.
