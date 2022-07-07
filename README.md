# ttsreader is a Text to Speech wrapper, reader / player and helpers for the web-speech-api speech synthesis

[See published npm package https://www.npmjs.com/package/ttsreader](https://www.npmjs.com/package/ttsreader)

It is the engine behind the popular [ttsreader.com online text & website reader](https://ttsreader.com/) , as well as:
- [Audactive - voice enabled learning resources](https://audactive.com/)
- [Speechnotes' (online dictation notepad) proof read capability](https://speechnotes.co/)
- [Speechnlogger's speak out loud](https://speechlogger.com/)


## Import:

To use in your own html / js code use one of the following methods:
  - `<script src="https://unpkg.com/ttsreader/build/bundle.min.js"></script>`
  - Or - download the following built file /build/bundle.min.js and use directly in your code `<script src="bundle.min.js"></script>`
  - Or - for Node based projects: `npm i ttsreader`

## How to use?

### The tts engine itself:

`let tts = wsGlobals.TtsEngine;`
OR
`import {TtsEngine} from "tts-engine"`

Then:
        
        tts.init({
            onInit: (voices) => {
                console.log('init tts with voices: ', voices);
                let ul = document.querySelector('ul');
                if (ul) {
                    for (const voice of voices) {
                        let el = document.createElement("li");
                        el.innerHTML = voice.name + ", " + voice.lang + ", " + voice.voiceURI;
                        ul.append(el);
                    }
                }
            },

            onStart: () => {
                console.log('tts started');
                // Update UI, such as: currentEl.scrollIntoView();
            },

            onDone: () => {
                console.log('tts done');
                // Move to next speakable text here if needed.
            }
        });

        function speak() {
            tts.speakOut(currentEl.innerHTML);
        }

        function stop() {
            tts.stop();
        }

### The player widget:
`import {MicWidget} from "./widgets/mic-widget.jsx";`
`import {render} from "react-dom";`

`let container = document.createElement('div');
container.setAttribute("style","text-align:right;margin-top:10px");
render(<MicWidget
isDictationEnabled = {Boolean(window.webkitSpeechRecognition)}
blockId = {element.id}
onStart = {onMicStart}
onStop = {onMicStop}
isSelectionDisabled={Boolean(expectedInputLang)}
lang = {expectedInputLang || docInputLang || appState.prefs.dictationLangCode || "en"}
setDictationLanguage = {setDictationLanguage}
registerToAppState={registerToAppState}
/>, container);
element.append(container);`
        
## Showcases

This is used on the following sites:
- [Speechnotes - Lightweight Speech Recognizing Notepad](https://speechnotes.co/)
- [TTSReader - Online Text To Speech Reader](https://ttsreader.com/)

## TODOs:

- Utils to 'cut' large texts into smaller sections.
- Generic Player with UI, with options to play
  - text
  - element and its contents 

# How to contribute & publish updates to this package?
- This package is published both on GitHub and on npmjs:
  - https://www.npmjs.com/package/ttsreader
  - https://github.com/RonenR/ttsreader
- To publish an updated version - simply run `npm publish`, it will commit & push updates both to github and npm.

