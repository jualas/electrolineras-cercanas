/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_PRIVATE_TOKEN?: string
  readonly VITE_DEV_API_PROXY?: string
  readonly VITE_GOOGLE_MAPS_JS_API_KEY?: string
  readonly VITE_MAP_PROVIDER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
