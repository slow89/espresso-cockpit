always use pnpm

Streamline Gateway source of truth: https://github.com/tadelv/reaprime
when questions depend on gateway behavior, APIs, deployment details, or browser/runtime details, inspect that repo before answering
when the user says `redeploy`, treat it as the tablet redeploy workflow in this repo: inspect `scripts/deploy-tablet-skin.mjs` and `README.md` if needed, then run `pnpm deploy:tablet` unless the user asks for a dry run or only wants an explanation
for tablet deploy troubleshooting, check `.env`/environment expectations first, especially `TABLET_GATEWAY_ORIGIN`, plus optional `SKIN_DEPLOY_HOST` and `SKIN_DEPLOY_PORT`

before making changes, inspect the relevant files with rg/sed and understand the local pattern instead of guessing

in react, prefer external stores with zustand, derived state, router loaders, and event handlers over new useEffect/useRef

do not mirror query/store state into local component state unless it is an editable draft or temporary interaction state

if adding useEffect, useRef, or local mirrored state, justify it in the final response

the react compiler is enabled, so do not add manual memoization with useMemo/useCallback unless there is a specific need

refer to the react docs guidance on "you might not need an effect": https://react.dev/learn/you-might-not-need-an-effect

if a component starts getting large, extract subcomponents or helpers instead of growing a single file indefinitely; prefer doing this before a component exceeds roughly 300 lines

after UI-heavy changes, prefer running a quick browser smoke check in addition to automated tests when practical

before finishing, remove duplicate tailwind classes, dead branches, and redundant state introduced during the change

when verifying work, prefer `pnpm check` as the default end-to-end validation command
