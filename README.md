# GoDAM Screen Recorder
<img width="1280" height="800" alt="Image 1" src="https://github.com/user-attachments/assets/93b0ef91-8b5c-4acb-ac44-94415c3cc7f4" />

The free and privacy-friendly screen recorder with no limits 🎥

[Get it now - it's free!](https://godam.io)

GoDAM is a powerful privacy-friendly screen recorder and annotation tool to make better videos for work, education, and more. You can create stunning product demos, tutorials, presentations, or share feedback with your team - all for free.

## Table of contents

- [Features](#features)
- [Creating a development version](#creating-a-development-version)
- [Libraries used](#libraries-used)

## Features

🎥 Record your browser tab, a selected screen area, the entire desktop, any application window, or directly from your camera.<br>
🎙️ Record your microphone or internal audio, and use features like push to talk<br>
✏️ Annotate by drawing anywhere on the screen, adding text, arrows, shapes, and more<br>
✨ Use AI-powered camera backgrounds or blur to enhance your recordings<br>
🔎 Zoom in smoothly in your recordings to focus on specific areas<br>
🪄 Blur out any sensitive content of any page to keep it private<br>
👀 Highlight your clicks and cursor, and go in spotlight mode<br>
⏱️ Set up alarms to automatically stop your recording<br>
⚙️ Set a countdown, hide parts of the UI, or move it anywhere<br>
…and much more - all for free & no sign in needed!

## Creating a development version

1. Clone this repository.
2. Run `npm install` to install the dependencies.
3. Run `npm start`.
4. Load the extension by going to `chrome://extensions/` , and [enabling developer mode](https://developer.chrome.com/docs/extensions/mv2/faq/#:~:text=You%20can%20start%20by%20turning,a%20packaged%20extension%2C%20and%20more.).
5. Click on `Load unpacked extension`.
6. Select the `build` folder.


## Libraries used

- [FFmpeg WASM](https://ffmpegwasm.netlify.app/) for editing and encoding videos
- [Tensorflow](https://github.com/tensorflow/tfjs) with the [Selfie Segmentation](https://blog.tensorflow.org/2022/01/body-segmentation.html) model
- [Fabric.js](https://github.com/fabricjs/fabric.js) for drawing and annotating
- [Radix Primitives](https://www.radix-ui.com/primitives) for the UI components
- [react-color](https://uiwjs.github.io/react-color/) for the color wheel
- [localForage](https://github.com/localForage/localForage) to help store videos offline with IndexedDB
- [Wavesurfer.js](https://wavesurfer.xyz/) to create audio waveforms in the popup and the editor
- [React Advanced Cropper](https://advanced-cropper.github.io/react-advanced-cropper/) for the cropping UI in the editor
- [fix-webm-duration](https://github.com/yusitnikov/fix-webm-duration) to add missing metadata to WEBM files

