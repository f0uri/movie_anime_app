/// <reference types="vite/client" />
declare module '*?url' {
  const src: string
  export default src
}
declare module 'mammoth/mammoth.browser.js' {
  const m: any
  export default m
}
