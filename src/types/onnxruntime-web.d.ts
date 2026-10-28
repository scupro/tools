// Mirrors `node_modules/onnxruntime-web/types.d.ts` (same content as upstream).
// TypeScript cannot pick that file up on its own: the package ships a
// `package.json` "exports" map with no "types" condition, so the declarations
// it points at via the "types" field are ignored.
declare module 'onnxruntime-web' {
  export * from 'onnxruntime-common';
}

declare module 'onnxruntime-web/wasm' {
  export * from 'onnxruntime-web';
}