# Tailwind and shadcn/ui provide the responsive visual system

Mindi uses Tailwind CSS and selectively installed shadcn/ui components, styled with Gruvbox-dark semantic tokens, instead of MUI or an all-inclusive component library. shadcn Dialog is used at desktop widths and shadcn Sheet at mobile widths through a shared responsive overlay wrapper; shadcn Sonner provides non-blocking notices. This keeps components locally customizable and avoids a heavyweight runtime UI kit while retaining accessible primitives.
