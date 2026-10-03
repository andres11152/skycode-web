// `ViewTransition` solo existe en los tipos canary de React: el App Router de
// Next.js usa su propio React canary en runtime (ver
// node_modules/next/dist/docs/01-app/02-guides/view-transitions.md), pero
// `@types/react` estable no lo declara. Esta referencia trae el tipo sin
// cambiar la versión de React instalada.
/// <reference types="react/canary" />
