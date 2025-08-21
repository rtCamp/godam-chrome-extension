# GoDAM Screen Recorder
<img width="1280" height="800" alt="Image 1" src="https://github.com/user-attachments/assets/93b0ef91-8b5c-4acb-ac44-94415c3cc7f4" />

With the GoDAM Chrome Extension, you can record your screen, explain clearly using the pen or highlighter tools, store videos directly in your GoDAM workspace, and share a link that collects timestamped comments and emoji reactions - turning feedback into a conversation, not a back-and-forth.

## Table of contents

- [Features](#features)
- [Creating a development version](#creating-a-development-version)
- [Libraries used](#libraries-used)

## Features

- Record Screen, Tab, or Window - Easily capture your full screen, an app window, or a browser tab — ideal for walkthroughs, bug reports, or tutorials.
- Draw While Recording - Use annotation tools like pen, highlighter, and shapes to guide attention and explain things visually — no editing needed later.
- Automatic Upload to GoDAM - Once you're done, your video is automatically uploaded to your secure GoDAM workspace. No need to export or manage files.
- One-Click Sharing - From GoDAM Central Media Manager, you can copy and share a link of the recorded video to teammates, clients, or stakeholders.
- Get Feedback Like a Conversation - The shared video link opens a clean video page with feedback tools — viewers can react with emojis or leave timestamped comments, turning your video into a collaborative space.
- Organized in Your Media Library - All recordings are saved in your central GoDAM dashboard for easy access, reuse, and sharing.

You’ll need an active GoDAM account. Sign up here:  https://godam.io/pricing


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

