# piper-tts-web (vendored)

Unmodified `dist/` files from [`@mintplex-labs/piper-tts-web@1.0.5`](https://www.npmjs.com/package/@mintplex-labs/piper-tts-web)
(MIT licence), a fork of `@diffusionstudio/vits-web`, which runs [Piper](https://github.com/rhasspy/piper)
neural voices (MIT) in the browser with onnxruntime-web.

At runtime it loads:
- `onnxruntime-web/wasm` — mapped by the import map in `index.html` to onnxruntime-web 1.18.0 on jsDelivr
- the ONNX runtime `.wasm` files from cdnjs, and the Piper phonemizer from jsDelivr
- voice models from `huggingface.co/diffusionstudio/piper-voices`, cached in the browser's private file system (OPFS)
