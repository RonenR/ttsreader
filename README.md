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

See 'test.html' for a complete example.

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

# Important practical non-obvious lessons we learned about tts:
1. You cannot send too many chars to REMOTE tts voice. It jams. Probably - the whole text is processed at once, and some mp3 is generated on the server?
   1. 38,000 is too much. It basically never starts.
   2. Local voices (at least on mac) worked well.
2. With Google's voices - they will use the correct voice only sometimes. It's not consistent at all! (On Mac.) // TODO: Test on Windows! 
   1. Solution: If you send a single utterance - it reads with a consistent voice.
   2. Problem: if they get the wrong voice - it will mess up reading for a large portion of the text...
   3. Sent google a bug report: https://bugs.chromium.org/p/chromium/issues/detail?id=1344469
3. onboundary does not work with Google voices. So - we have to send small chunks anyhow...
4. Of course - the famous google voice terminating itself after some circa 15 secs...