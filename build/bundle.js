(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
window.wsGlobals = window.wsGlobals || {};
window.wsGlobals.TtsEngine = require("./index").TtsEngine;

},{"./index":5}],2:[function(require,module,exports){
const { ServerVoices } = require("./serverVoices");

const SERVER_TTS_ENDPOINT_PRODUCTION = "https://us-central1-ttsreader.cloudfunctions.net/tts";
const SERVER_TTS_ENDPOINT_LOCAL = "http://127.0.0.1:5001/ttsreader/us-central1/tts";

// Set to true for local server:
const shouldUseLocalWhenInLocalhost = false;

const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const SERVER_TTS_ENDPOINT = (isDev && shouldUseLocalWhenInLocalhost) ? SERVER_TTS_ENDPOINT_LOCAL : SERVER_TTS_ENDPOINT_PRODUCTION;
window.SERVER_TTS_ENDPOINT = SERVER_TTS_ENDPOINT;

class ServerTts {
    static voices = ServerVoices.voices;

    static buffer = [];
    static currentAudio = null;

    static listener = {
        onInit: (voices) => { console.log('onInit ', voices); },
        onStart: (id) => { console.log('onStart ', id); },
        onDone: (id) => { console.log('onDone ', id); },
        onError: (id, error) => { console.log('onError ', id, error); },
        onReady: (id) => { console.log('onReady ', id); }, // ✅ new callback
    };

    static getVoices() {
        return ServerTts.voices;
    }

    static init(listener) {
        if (listener) ServerTts.listener = listener;
        ServerTts.listener.onInit(ServerTts.voices);
    }

    // We got here - only if not in buffer, or has error.
    static async bufferNewUtterance (
        text, voiceURI, langBCP47, rate, id, authToken, onSuccess, onError, isTest = false,
        tryCount = 0 ) {
        let utterance = { text, voiceURI, langBCP47, rate, id, wasPlayed: false, audio: null, renderStatus: "waiting", onSuccess, onError };
        console.log('Buffering: ', utterance.id);
        tryCount = tryCount || 0;

        async function tryAgain(waitInMs, maxTries) {
            // Wait for waitInMs[ms] and try again:
            await new Promise(resolve => setTimeout(resolve, waitInMs));
            if (tryCount < maxTries) {
                console.log(`Retrying to generate audio for ${utterance.id}, attempt ${tryCount + 1}`);
                ServerTts.bufferNewUtterance(text, voiceURI, langBCP47, rate, id, authToken, onSuccess, onError, isTest, tryCount + 1);
            } else {
                console.error(`Failed to generate audio for ${utterance.id} after 3 attempts`);
                // Take it out of the buffer, as it failed to generate:
                ServerTts.buffer = ServerTts.buffer.filter(u => u.id !== id);
                onError("Failed buffering ", utterance.id);
            }
        }

        // Make sure it's not already in the buffer, as we don't want duplicates, errors, etc.
        ServerTts.buffer = ServerTts.buffer.filter(u => u.id !== id);
        ServerTts.buffer.push(utterance); // So we know it's in the process of being generated.

        // If not in buffer, generate audio - and if successful, add it to the buffer.
        // If audio generation fails, for a reason other than 429 - try again after 500ms, up to 3 times.
        // If it fails with 429 - it means user's quota reached.

        // Now - let's generate the audio:
        console.log('generating audio for: ', utterance);
        fetch(SERVER_TTS_ENDPOINT, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: text,
                lang: langBCP47,
                voice: voiceURI,
                rate: utterance.rate >= 0.95 ? 1 : utterance.rate,
                isTest: Boolean(isTest)
            })
        })
            .then(response => {
                if (response.ok) {
                    return response.blob();
                } else {
                    if (response.status === 429) {
                        // Take it out of the buffer, as it failed to generate:
                        ServerTts.buffer = ServerTts.buffer.filter(u => u.id !== id);
                        // User reached his quota, notify the listener:
                        onError(429);
                    } else {
                        tryAgain(500, 3); // Retry after 500ms, up to 3 times
                    }
                    return Promise.reject(); // Stop the chain
                }

            })
            .then(blob => {
                console.log("Got AUDIO for: ", utterance.text);
                const url = URL.createObjectURL(blob);
                utterance.audio = (new Audio(url));
                utterance.audio.setAttribute("preload", "auto");
                utterance.audio.addEventListener("playing", () => {
                    console.log((Date.now() % 60000) + ' Ronen log20250106: audio is actually audible now, after: ' + (Date.now() - ServerTts.timeStart) + "ms");
                });
                //utterance.audio.load();
                utterance.blob = blob; // 👈 this line is here to prevent G.C. from cleaning the blob
                utterance.audio.playbackRate = utterance.rate >= 0.95 ? utterance.rate : 1,
                utterance.renderStatus = "done"; // Mark as done
                utterance.onSuccess(utterance); // ✅ Notify that audio is ready

                try {
                    // While we're at it, let's remove the first utterances so that we don't memory leak:
                    while ((ServerTts.buffer.length > 50 && ServerTts.buffer[0].wasPlayed) || ServerTts.buffer.length > 50) {
                        ServerTts.buffer.shift();
                    }
                } catch (e) {
                    // Do nothing, as we'll just keep it in the buffer.
                }
            })
            .catch(err => {
                tryAgain(500, 3); // Retry after 500ms, up to 3 times
            });
    }

    // Send the blob onSuccess, where there's no need to buffer it - eg - it was for direct download:
    static async generateAudioSync(text, voiceURI, langBCP47, rate, id, authToken, onSuccess, onError, optionalParamsAsJson) {
        let utterance = { text, voiceURI, langBCP47, rate, id, wasPlayed: false, audio: null };
        console.log('Generating: ', utterance.id);

        let quality = "48khz_192kbps"; // default
        if (optionalParamsAsJson && optionalParamsAsJson.quality) {
            quality = optionalParamsAsJson.quality;
        }

        try {
            const response = await fetch(SERVER_TTS_ENDPOINT, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: text,
                    lang: langBCP47,
                    voice: voiceURI,
                    rate: rate,
                    quality: quality
                })
            });

            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            // ✅ Notify that audio is ready
            onSuccess(url); // Sends the blob URL, where the audio is stored. Client can take
                            //  it from there to Audio element: audio.src = url; or new Audio(url);


            /* TODO: Downloadable wavs should be handled as follows here in the comment:
            const audioElement = new Audio(url);
            const audioURL = url;
            if (audioURL) {
                const link = document.createElement('a');
                link.href = audioURL;
                link.download = 'longer-test-4-steve.wav';
                document.body.appendChild(link);
                link.click();
                // Clean up
                document.body.removeChild(link);
            }*/
        } catch (error) {
            onError(error.message);
            return;
        }
    }

    static timeStart = Date.now();

    static async speakUtterance(utterance, listener, authToken = null) {
        ServerTts.stop(); // Safe to run even if not playing.
        let id = utterance.id;
        let waited = 0;
        while (!utterance.audio && waited < 1000) { // Wait 1 second max - user is expecting play to start instantly...
            await new Promise(r => setTimeout(r, 200));
            waited += 200;
            utterance = getUtterance(); // refresh in case it got updated
        }
        if (!utterance.audio) {
            // Do a reset - remove from buffer, then buffer again - and speak onready:
            if (authToken) {
                ServerTts.buffer = ServerTts.buffer.filter(u => u.id !== utterance.id);
                ServerTts.bufferNewUtterance(utterance.text, utterance.voiceURI, utterance.langBCP47, utterance.rate, utterance.id, authToken,
                    (newUtterance)=> {
                        ServerTts.speakUtterance(newUtterance, {
                            onStart: this.listener.onStart,
                            onDone: this.listener.onDone,
                            onError: this.listener.onError
                        }); // We'll not pass auth - as we want to limit this to a single attempt.
                    },
                    (error)=> {
                        console.error('Error buffering utterance: ', error);
                        this.listener.onError(error);
                    },
                    utt.isTest
                );
            } else {
                listener.onError("Utterance has no audio");
            }
            return;
        }

        // Utterance is ready to play -> Play it:
        ServerTts.currentAudio = utterance.audio;
        ServerTts.currentAudio.playbackRate = utterance.rate >= 0.95 ? utterance.rate : 1;
        ServerTts.currentAudio.onended = () => {
            console.log((Date.now() % 60000) + ' Ronen log20250106: audio ended');
            utterance.wasPlayed = true;
            listener.onDone(id);
        };
        ServerTts.currentAudio.onerror = () => {
            listener.onError("Audio playback failed with onerror " + utterance.audio.length);
            // Remove from buffer, as it failed to play, maybe it's corrupt.
            ServerTts.buffer = ServerTts.buffer.filter(u => u.id !== utterance.id);
            listener.onDone(id);
        };
        listener.onStart(id);

        console.log((Date.now() % 60000) + ' Ronen log20250106: started audio.play()');
        ServerTts.timeStart = Date.now();
        ServerTts.currentAudio.play().catch(err => {
            // Remove from buffer, as it failed to play, maybe it's corrupt.
            listener.onError("Audio playback failed with exception: " + err.message);
            utterance.wasPlayed = false;
            listener.onDone(id);
        });
    }

    /*static async speak(id, listener) {
        console.log('Got speak request, id: ', id);
        const getUtterance = () => ServerTts.buffer.find(u => u.id === id);
        let utterance = getUtterance();
        if (!utterance) return listener.onError("Utterance not found in buffer");

        return ServerTts.speakUtterance(utterance, listener);
    }*/

    static stop() {
        console.log('Got stop request, current audio: ', ServerTts.currentAudio);
        if (ServerTts.currentAudio) {
            ServerTts.currentAudio.pause();
            ServerTts.currentAudio.currentTime = 0;
        }
        if (ServerTts.buffer && ServerTts.buffer.length > 0) {
            // Iterate through the buffer and set all onSuccess to () => {} to avoid unintended playbacks.
            ServerTts.buffer.forEach(u => {
                if (u.onSuccess) {
                    u.onSuccess = () => {}; // Clear the onSuccess callback to avoid unintended playbacks.
                }
            });
        }
    }
}

if (typeof module != 'undefined') {
    module.exports = { ServerTts };
}
},{"./serverVoices":3}],3:[function(require,module,exports){

// More voices can be selected here from GCP: https://cloud.google.com/text-to-speech/docs/list-voices-and-types
// Here from MS: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts
// MS voice gallery: https://speech.microsoft.com/portal/4b57c39c5b624408ad37b9f87600d23d/voicegallery

/*Aria.mp3
Christopher.mp3
Eric.mp3
Jenny.mp3
Libby.mp3
Lily.mp3
Mark.mp3
Michelle.mp3
Noah.mp3
Olivia.mp3
Ryan.mp3*/

class ServerVoices {
    static voices = [
        {
            voiceURI: "ttsreaderServer.azure.en-US-ShimmerTurboMultilingualNeural",
            name: "Shimmer Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-US-SerenaMultilingualNeural",
            name: "Serena Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-US-PhoebeMultilingualNeural",
            name: "Phoebe Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-US-AvaMultilingualNeural",
            name: "Ava Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-US-NancyMultilingualNeural",
            name: "Nancy Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-US-DerekMultilingualNeural",
            name: "Derek Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-US-DavisMultilingualNeural",
            name: "Davis Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-GB-LibbyNeural",
            name: "Libby Premium",
            lang: "en-GB",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-US-ChristopherMultilingualNeural",
            name: "Christopher Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-GB-OllieMultilingualNeural",
            name: "Ollie",
            lang: "en-GB",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-GB-SoniaNeural",
            name: "Sonia",
            lang: "en-GB",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-GB-AbbiNeural",
            name: "Abbi",
            lang: "en-GB",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.es-ES-SaulNeural",
            name: "Saul",
            lang: "es-ES",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.es-ES-VeraNeural",
            name: "Vera",
            lang: "es-ES",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.es-ES-AlvaroNeural",
            name: "Alvaro",
            lang: "es-ES",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.es-ES-ElviraNeural",
            name: "Elvira",
            lang: "es-ES",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.it-IT-MarcelloMultilingualNeural",
            name: "Marcello Premium",
            lang: "it-IT",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.it-IT-IsabellaNeural",
            name: "Isabella Premium",
            lang: "it-IT",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.hi-IN-ArjunNeural",
            name: "Arjun Premium",
            lang: "hi-IN",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.hi-IN-AartiNeural",
            name: "Aarti Premium",
            lang: "hi-IN",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.ar-EG-SalmaNeural",
            name: "Salma Premium",
            lang: "ar-EG",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.ar-EG-ShakirNeural",
            name: "Shakir Premium",
            lang: "ar-EG",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-US-AriaNeural",
            name: "Aria Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-US-NovaTurboMultilingualNeural",
            name: "Nova Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-US-AdamMultilingualNeural",
            name: "Adam Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.core1.f1",
            name: "נעמי חדש נסיוני",
            lang: "he-IL",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.core1.f3",
            name: "רחל חדש נסיוני",
            lang: "he-IL",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.core1.f2",
            name: "אסתר חדש נסיוני",
            lang: "he-IL",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.core1.m1",
            name: "דודו חדש נסיוני",
            lang: "he-IL",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.fr-FR-VivienneMultilingualNeural",
            name: "Vivienne Premium",
            lang: "fr-FR",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.fr-FR-HenriNeural",
            name: "Henri Premium",
            lang: "fr-FR",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.de-DE-ConradNeural",
            name: "Conrad Premium",
            lang: "de-DE",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.de-DE-SeraphinaMultilingualNeural",
            name: "Seraphina Premium",
            lang: "de-DE",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.en-GB-AdaMultilingualNeural",
            name: "Ada Premium",
            lang: "en-GB",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.he-IL-AvriNeural",
            name: "אברי",
            lang: "he-IL",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.he-IL-HilaNeural",
            name: "הילה",
            lang: "he-IL",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
            avatar: "/images/avatars/ttsreaderServer.azure.he-IL-HilaNeural.webp",
            demo: "/audio/ttsreaderServer.azure.he-IL-HilaNeural.mp3",
        },
        {
            voiceURI: "ttsreaderServer.azure.es-MX-JorgeNeural",
            name: "Jorge Premium",
            lang: "es-MX",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
            avatar: "/images/avatars/ttsreaderServer.azure.es-MX-JorgeNeural.webp",
            demo: "/audio/ttsreaderServer.azure.es-MX-JorgeNeural.mp3",
        },
        {
            voiceURI: "ttsreaderServer.azure.es-MX-DaliaNeural",
            name: "Dalia Premium",
            lang: "es-MX",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
            avatar: "/images/avatars/ttsreaderServer.azure.es-MX-DaliaNeural.webp",
            demo: "/audio/ttsreaderServer.azure.es-MX-DaliaNeural.mp3",
        },
        {
            voiceURI: "ttsreaderServer.gcp.en-GB-Standard-A",
            name: "Olivia Premium",
            lang: "en-GB",
            localService: false,
            default: true,
            premiumLevel: 1,
            gender: "f",
            avatar: "/images/avatars/ttsreaderServer.gcp.en-GB-Standard-A.webp",
            demo: "/audio/ttsreaderServer.gcp.en-GB-Standard-A.mp3",
        },
        {
            voiceURI: "ttsreaderServer.gcp.en-GB-Standard-D",
            name: "Noah Premium",
            lang: "en-GB",
            localService: false,
            default: true,
            premiumLevel: 1,
            gender: "m",
            avatar: "/images/avatars/ttsreaderServer.gcp.en-GB-Standard-D.webp",
            demo: "/audio/ttsreaderServer.gcp.en-GB-Standard-D.mp3",
        },
        {
            voiceURI: "ttsreaderServer.gcp.en-GB-Standard-N",
            name: "Lilly Premium",
            lang: "en-GB",
            localService: false,
            default: true,
            premiumLevel: 1,
            gender: "f",
            avatar: "/images/avatars/ttsreaderServer.gcp.en-GB-Standard-N.webp",
            demo: "/audio/ttsreaderServer.gcp.en-GB-Standard-N.mp3",
        },
        {
            voiceURI: "ttsreaderServer.gcp.en-US-Chirp-HD-D",
            name: "John Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
            avatar: "/images/avatars/ttsreaderServer.gcp.en-US-Chirp-HD-D.webp",
            demo: "/audio/ttsreaderServer.gcp.en-US-Chirp-HD-D.mp3",
        },
        /*{
            voiceURI: "ttsreaderServer.gcp.en-US-Chirp-HD-F",
            name: "Sarah Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
            avatar: "/images/avatars/ttsreaderServer.gcp.en-US-Chirp-HD-F.webp",
            demo: "/audio/ttsreaderServer.gcp.en-US-Chirp-HD-F.mp3",
        },
        {
            voiceURI: "ttsreaderServer.gcp.en-US-Chirp-HD-O",
            name: "Rachel Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
            avatar: "/images/avatars/ttsreaderServer.gcp.en-US-Chirp-HD-O.webp",
            demo: "/audio/ttsreaderServer.gcp.en-US-Chirp-HD-O.mp3",
        },
        {
            voiceURI: "ttsreaderServer.gcp.en-GB-Wavenet-N",
            name: "Rebecca Premium",
            lang: "en-GB",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
            avatar: "/images/avatars/ttsreaderServer.gcp.en-GB-Wavenet-N.webp",
            demo: "/audio/ttsreaderServer.gcp.en-GB-Wavenet-N.mp3",
        },*/
    ];
}

if (typeof module != 'undefined') {
    module.exports = { ServerVoices };
}
},{}],4:[function(require,module,exports){
const SHA256 = require("crypto-js/sha256");
const { ServerTts } = require("./serverTts");
console.log(ServerTts);

function codeToLanguageCodeOnly (code) {
    if (code == null || code.length < 2) {
        return "";
    }

    return  code.toLowerCase().split("-")[0].split("_")[0];
}

function doCodesShareLanguage (a,b) {
    return codeToLanguageCodeOnly(a) == codeToLanguageCodeOnly(b);
}

exports.TtsEngine = {

    DEFAULT_LANG: "en",
    voice: {},
    voices: [],
    rate: 1,
    utteranceId: 0,
    startedAndNotTerminatedCounter: 0,
    listener: null,  // includes: {onInit, onStart, onDone, onError}
    utterance: {},

    _googleBugTimeout: null,
    _speakTimeout: null,
    _canceledAtMs: 0,
    _isServerTTS: false,

    _defaultListener: {
        onInit: (voices) => {
            console.log('onInit ', voices);
        },
        onStart: () => {
            console.log('onStart');
        },
        onDone: () => {
            console.log('onDone');
        },
        onError: (error) => {
            console.log('onError ', error);
        },
        onVoicesChanged: (updatedVoices) => {
            console.log('onVoicesChanged ', updatedVoices);
        }
    },

    init: function (listener, isToAddServerTTS, isAppPlaying) {
        if (isAppPlaying) {
            this.isAppPlaying = isAppPlaying;
        }

        if (listener) {
            this.setListener(listener, isToAddServerTTS);
        }

        this._isServerTTS = isToAddServerTTS || false;
        this._populateVoices(isToAddServerTTS);
        speechSynthesis.onvoiceschanged = () => { this._populateVoices(isToAddServerTTS); };
    },

    setListener: function (listener, isToAddServerTTS) {
        this.listener = listener || this._defaultListener;
    },

    removeLocalGoogleVoices: function () {
        this.voicesIncludingGoogle = [...this.voices];
        this.voices=this.voices.filter(v=>!v.voiceURI.includes('Google '));
        if (this.voice && !this.voices.includes(this.voice)) {
            // Set the voice by language:
            let lang = this.voice.lang;
            this.voice = null;
            this.setBestMatchingVoice(null,null,lang);
        }
        this.listener.onVoicesChanged(this.voices);
    },

    bringBackGoogleVoices: function () {
        this.voices = [...this.voicesIncludingGoogle];
        this.voicesIncludingGoogle = null;
        this.listener.onVoicesChanged(this.voices);
    },

    runSilentTest: function () {
        let startTime = Date.now();
        let timer;
        const utterance=new SpeechSynthesisUtterance('hi');
        utterance.volume=0;
        let voice=speechSynthesis.getVoices().find(v=>v.voiceURI==="Google UK English Male");
        if (!voice) {
            return;
        }
        utterance.voice = voice;
        utterance.voiceURI = voice.voiceURI;
        utterance.lang = voice.lang;
        timer = setTimeout(()=>{
            this.removeLocalGoogleVoices();
            if (window.gtag) {
                gtag('event','silent_test_failed',{value:'1'})
            }
        },3000);
        utterance.onstart=()=>{
            console.log('onstart in ' + (Date.now()-startTime));
            clearTimeout(timer);
            if (window.gtag) {
                gtag('event','silent_test_success',{value:'1'})
            }
            if (this.voicesIncludingGoogle) {
                this.bringBackGoogleVoices();
            }
            speechSynthesis.cancel();
        };
        utterance.onend=()=>{
            console.log('onend in ' + (Date.now()-startTime));
            if (window.gtag) {
                gtag('event','silent_test_success',{value:'1'})
            }
            clearTimeout(timer);
        };
        console.log('calling speak: ' + (Date.now()-startTime));
        speechSynthesis.speak(utterance);
    },

    /// Assumes voices was populated.
    /// If voice, voiceURI, lang were not available, then it checks whether the current voice is available to keep.
    /// If current voice is available it is kept. Otherwise, the first voice in list is selected.
    /// NOTE: 'lang' is only lang, no 'locale' - ie no accent
    setBestMatchingVoice: function(voice, voiceURI, lang) {
        if (voiceURI && voiceURI.startsWith("azure.")) {
            // An openenig to support ALL azure voices:
            this.voice = { voiceURI: voiceURI, lang: "en-US", name: voiceURI.replace("azure.", "az.") };
            return voiceURI;
        }

        if (this.voices == null || this.voices.length == 0) {
            return "";
        }

        if ((!voice || !voice.voiceURI) && !voiceURI && !lang) {
            if (this.voice && this.voice.voiceURI) {
                voiceURI = this.voice.voiceURI;
            } else {
                lang = this.DEFAULT_LANG;
            }
        }

        if (voice) {
            voiceURI = voice.voiceURI || voiceURI;
        }

        if (voiceURI) {
            for (const iVoice of this.voices) {
                if (iVoice.voiceURI == voiceURI) {
                    this.voice = iVoice;
                    return iVoice.voiceURI;
                }
            }
        }

        if (lang) {
            // If current voice already has the looked for lang, do nothing:
            if (this.voice && doCodesShareLanguage(this.voice.lang, lang)) {
                return this.voice.voiceURI;
            }

            let filteredVoices = this.voices.filter((iVoice)=>{
                return doCodesShareLanguage(iVoice.lang, lang);
            });

            if (filteredVoices && filteredVoices.length>0) {
                if (filteredVoices.length==1) {
                    this.voice = filteredVoices[0];
                    return this.voice.voiceURI;
                } else if (!lang.startsWith("en") && !lang.startsWith("es")) {
                    this.voice = filteredVoices[0];
                    return this.voice.voiceURI;
                } else {
                    // Now - within those voices - we prefer 'en', 'en-GB', 'en-UK', 'en-US' if lang is en. 'es-ES' if lang is 'es':
                    // local = 1.5 points;
                    // no accent = 4 points; -> tops all combos but local good accent.
                    // good accent = 3 points;
                    // neutral accent = 2 points; -> local tops remote good accent
                    // no score accents = 0 points;

                    let selectedVoiceScore = -1;
                    let selectedVoice;
                    for (const iVoice of filteredVoices) {
                        let score = 0;

                        if (iVoice.localService) {
                            score += 1.5;
                        }

                        if (iVoice.lang.length == 2) {
                            score += 3;
                        } else if (["en-us","en-uk","en-gb","es-es"].indexOf(iVoice.lang.toLowerCase().replace("_","-"))!=-1) {
                            score += 4;
                        } else if (["en-in"].indexOf(iVoice.lang.toLowerCase().replace("_","-"))==-1) {
                            score += 2;
                        }

                        console.log('score: ' + score + ' for: ', iVoice);
                        if (score>selectedVoiceScore) {
                            selectedVoiceScore = score;
                            selectedVoice = iVoice;
                        }
                    }

                    if (selectedVoice) {
                        this.voice = selectedVoice;
                        return this.voice.voiceURI;
                    }
                }
            }
        }

        for (const iVoice of this.voices) {
            this.voice = iVoice;
            if (iVoice.localService) {
                return iVoice.voiceURI;
            }
        }

        return this.voice.voiceURI;
    },

    _populateVoices: function (isToAddServerTTS) {
        // TODO: Add server tts voices if isToAddServerTTS is true.

        let voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length<1) {
            // Wait for webspeech api voices...
            return;
        }

        console.log('populating voices ', isToAddServerTTS );

        if (isToAddServerTTS) {
            // Add server tts voices
            let additionalVoices = ServerTts.getVoices();
            console.log('additionalVoices: ', additionalVoices);
            for (const additionalVoice of additionalVoices) {
                voices.push(additionalVoice);
            }
        }

        if (voices && voices.length>0) {
            this.voices = voices.filter((voice)=>{
                if (!voice.voiceURI.includes("com.apple.eloquence") && !voice.voiceURI.includes("com.apple.speech.synthesis")) {
                    return voice;
                }
            });
            this.setBestMatchingVoice(this.voice, null, null);

            if (this.listener && this.listener.onInit) {
                this.listener.onInit(this.voices);
            }
        }
    },

    setVoiceByUri: function (voiceURI) {
        this.setBestMatchingVoice(null, voiceURI, null);
    },

    getVoiceURI: function () {
        if (!this.voice) {
            this.setBestMatchingVoice();
        }

        if (this.voice) {
            return this.voice.voiceURI;
        }

        return "";
    },

    setRate: function (rate) {
        if (typeof rate == 'string') {
            rate = Number(rate);
        }

        if (isNaN(rate)) {
            return;
        }

        if (rate<0.1) {
            rate = 0.1;
        }

        if (rate>4) {
            rate = 4;
        }

        this.rate = rate;
    },

    isInitiated: function() {
        return this.voices!=null;
    },

    _runOnWebspeechApiStart: function(ev) {
        //console.log("_defaultOnStart utterance ", ev);
        this.startedAndNotTerminatedCounter++;
        this._solveChromeBug();
    },

    _runOnWebspeechApiEnd: function(ev) {
        //console.log("_defaultOnEnd utterance ", ev);
        if (this.startedAndNotTerminatedCounter>0) {
            this.startedAndNotTerminatedCounter--;
        }
        this._clearUtteranceTimeouts();
    },

    _runOnWebspeechApiError: function(ev) {
        //console.log("_defaultOnError utterance ", ev);
        if (this.startedAndNotTerminatedCounter>0) {
            this.startedAndNotTerminatedCounter--;
        }
        this._clearUtteranceTimeouts();
    },

    _clearUtteranceTimeouts: function() {
        if (this._googleBugTimeout != null) {
            window.clearTimeout(this._googleBugTimeout);
            this._googleBugTimeout = null;
        }
    },

    _solveChromeBug: function() {
        if (!this.voice) {
            return;
        }

        if (this.voice.voiceURI.toLowerCase().indexOf("google") === -1) {
            return;
        }

        // pause & resume every few secs:
        this._clearUtteranceTimeouts();
        let self = this;
        this._googleBugTimeout = window.setTimeout(function () {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
            self._solveChromeBug();
        }, 10000);
    },

    _prepareTextForSynthesis: function (text) {
        let decodedText = text;
        decodedText = decodedText.replace("·", ", ");
        decodedText = decodedText.replace("- ", ", ");
        decodedText.trim();
        return decodedText;
    },

    // When done - sends the URL of the audio blob of the generated audio.
    // Where utt = {text, voiceURI, rate} No need for id as it will be generated by the engine.
    generateAudioSync: function (utt, authToken, onDone, onError, optionalParamsAsJson) {
        let id = "" + SHA256(utt.text + utt.langBCP47 + utt.voiceURI + utt.rate);
        ServerTts.generateAudioSync(utt.text, utt.voiceURI, utt.langBCP47, utt.rate, id, authToken, onDone, onError, optionalParamsAsJson);
    },

    //  where utt = {text, voiceURI, rate} No need for id as it will be generated by the engine.
    speakAndBuffer: function(utt, bufferArray, authToken) {
        if (utt.voiceURI.startsWith("ttsreaderServer") || utt.voiceURI.startsWith("azure")) {
            // Server side tts

            let text = this._prepareTextForSynthesis(utt.text);
            if (!text) {
                this.listener.onStart();
                this.listener.onDone();
                return;
            }

            // Generate id by hashing sha256 of: text + voiceURI + rate
            let effectiveRate = utt.rate < 0.95 ? utt.rate : 1;
            let id = "" + SHA256(text + utt.langBCP47 + utt.voiceURI + effectiveRate);

            // Is utt in buffer & renderStatus === "done"? If yes - remove its on ready listener - and simply play it!
            const existingUtt = ServerTts.buffer.find(u => u.id === id);
            if (existingUtt) {
                existingUtt.rate = utt.rate; // Make sure the rate is right priot to playing.
            }
            if (existingUtt && existingUtt.renderStatus === "done") {
                console.log(`Utterance ${id} already in buffer and ready.`);
                existingUtt.wasPlayed = false; // Reset the flag to allow re-use.
                existingUtt.onSuccess = () => {} // Reset the listener to avoid double calls.
                // Play now:
                ServerTts.speakUtterance(existingUtt, {
                    onStart: this.listener.onStart,
                    onDone: this.listener.onDone,
                    onError: this.listener.onError
                });
            } else if (existingUtt && existingUtt.renderStatus === "waiting") {
                console.log(`Utterance ${id} already in buffer and NOT ready.`);
                existingUtt.wasPlayed = false; // Reset the flag to allow re-use.
                // Make sure that it has the correct onAudioReady listener. It may override previous one:
                // TODO: On audio received => speak it. Implement this in ServerTts.js
                existingUtt.onSuccess = () => {
                    console.log(`existingUtt ${id} is onSuccess from 'waiting'`);
                    ServerTts.speakUtterance(existingUtt, {
                        onStart: this.listener.onStart,
                        onDone: this.listener.onDone,
                        onError: this.listener.onError
                    }, authToken);
                };
                existingUtt.onError = () => {
                    console.error('Error buffering utterance: ', error);
                    this.listener.onError(error);
                };

            } else {
                // Either not in buffer, or renderStatus is "error".
                // We will buffer it now and then speak it - or fire error if buffering fails.
                ServerTts.bufferNewUtterance(text, utt.voiceURI, utt.langBCP47, utt.rate, id, authToken,
                    (newUtterance)=> {
                        ServerTts.speakUtterance(newUtterance, {
                            onStart: this.listener.onStart,
                            onDone: this.listener.onDone,
                            onError: this.listener.onError
                        }, authToken);
                    },
                    (error)=> {
                        console.error('Error buffering utterance: ', error);
                        this.listener.onError(error);
                    },
                    utt.isTest
                );
            }

            // Now buffer the rest of the utts if needed:
            let spacer = 1;
            let breaker = false;
            for (const bufferUtt of bufferArray) {
                setTimeout(()=> {
                    if (!this.isAppPlaying() || breaker) {
                        console.log('buffering stopped since app was paused by master');
                        breaker = true;
                        return;
                    }
                    console.log('buffering: ', bufferUtt);
                    let bufferText = this._prepareTextForSynthesis(bufferUtt.text);
                    let bufferId = "" + SHA256(bufferText + bufferUtt.langBCP47 + bufferUtt.voiceURI + (bufferUtt.rate < 0.95 ? bufferUtt.rate : 1));
                    let existingBufferUtt = ServerTts.buffer.find(u => u.id === bufferId);
                    if (!existingBufferUtt || existingBufferUtt.renderStatus === "error") {
                        ServerTts.bufferNewUtterance(bufferText, bufferUtt.voiceURI, bufferUtt.langBCP47, bufferUtt.rate, bufferId, authToken,
                            () => {
                                // Do nothing, it's simply bg buffering.
                            }, (error) => {
                                // Do nothing, it's simply bg buffering.
                            },
                            bufferUtt.isTest
                        );
                    } // Otherwise - it's already in the buffer - do nothing.
                }, spacer * 500);
                spacer++;
            }
        } else {
            // Local tts Web Speech API:
            this.setVoiceByUri(utt.voiceURI);
            // Make sure rate is within (0.5, 2):
            utt.rate = Math.min(utt.rate, 2); // max rate allowed is 2
            utt.rate = Math.max(utt.rate, 0.5); // min rate allowed is 0.5
            this.setRate(utt.rate);
            this.speakOut(utt.text);
        }
    },


    speakOut: function (text) {
        let instance = this;
        if (this.startedAndNotTerminatedCounter>0 || window.speechSynthesis.paused || window.speechSynthesis.pending || window.speechSynthesis.speaking) {
            console.log('tts - ronen1')
            this.stop();
            this._speakTimeout = window.setTimeout(function (){
                instance.speakOut(text);
            }, 200);
            return;
        }

        if (!text) {
            if (this.utterance) {
                this.utterance.onend();
            }
            return;
        }

        text = this._prepareTextForSynthesis(text);

        if (!this.isInitiated()) {
            return false;
        }

        this.utteranceId++;
        let utterance = new SpeechSynthesisUtterance();
        this.utterance = utterance;

        utterance.text = text;

        if (this.voice==null) {
            this.setBestMatchingVoice(null, null, null);
        }
        //console.log('voice is: ', this.voice);
        if (this.voice) {
            utterance.lang = this.voice.lang;
            utterance.voiceURI = this.voice.voiceURI; // For a bug in Chrome on Android.
            utterance.voice = this.voice;
        }
        utterance.rate = this.rate;
        let self = this;

        utterance.onmark = function (ev) {
            console.log('onmark ', ev);
        }

        utterance.onstart = function (ev) {
            if (utterance.voice.voiceURI.toLowerCase().includes("google") || utterance.voiceURI?.toLowerCase()?.includes("google")) {
                console.log('voice URI includes google - do reset');
                self.removeLocalGoogleVoices = function () {
                    console.log("removeLocalGoogleVoices reset");
                };
            }
            console.log('onstart ', ev);
            self._runOnWebspeechApiStart(ev);
            if (self.listener && self.listener.onStart) {
                self.listener.onStart();
            }
        };

        utterance.onboundary = function(event) {
            // TODO: use this to mark specific word.
            console.log('onboundary: ' + event.name + ' boundary reached after ' + event.elapsedTime + ' milliseconds.', event);
            // event looks like:
            /*
            * bubbles: false
              cancelBubble: false
              cancelable: false
              charIndex: 0
              charLength: 1
              composed: false
              currentTarget: SpeechSynthesisUtterance {voiceURI: "Alex", text: "123456789121111 e.g. hi i am john and this is a ra…to type depending on youre your highest WPM rank ", lang: "en-US", voice: SpeechSynthesisVoice, volume: -1, …}
              defaultPrevented: false
              elapsedTime: 176.75999450683594
              eventPhase: 0
              isTrusted: true
              name: "word"
              path: []
              returnValue: true
              srcElement: SpeechSynthesisUtterance {voiceURI: "Alex", text: "123456789121111 e.g. hi i am john and this is a ra…to type depending on youre your highest WPM rank ", lang: "en-US", voice: SpeechSynthesisVoice, volume: -1, …}
              target: SpeechSynthesisUtterance {voiceURI: "Alex", text: "123456789121111 e.g. hi i am john and this is a ra…to type depending on youre your highest WPM rank ", lang: "en-US", voice: SpeechSynthesisVoice, volume: -1, …}
              timeStamp: 24511.29999998375
              type: "boundary"
              utterance: SpeechSynthesisUtterance {voiceURI: "Alex", text: "1234567891211... }
            * */
        }

        utterance.onend = function (ev) {
            //console.log('end');
            self._runOnWebspeechApiEnd(ev);
            if (self.listener && self.listener.onDone) {
                self.listener.onDone();
            }
            utterance = null;
        };

        utterance.onerror = function (ev) {
            //console.log('error ', ev);
            self._runOnWebspeechApiError(ev);
            utterance = null;
        };

        console.log('tts - ronen right away')
        this._speakUtterance(utterance);
    },



    stop() {
        ServerTts.stop(); // Safe to call

        if (this._speakTimeout != null) {
            window.clearTimeout(this._speakTimeout);
            this._speakTimeout = null;
        }

        window.speechSynthesis.cancel();
        this.startedAndNotTerminatedCounter = 0;
        this._canceledAtMs = Date.now();
    },



    _speakUtterance(utterance) {
        if (this._speakTimeout != null) {
            window.clearTimeout(this._speakTimeout);
            this._speakTimeout = null;
        }

        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        //console.log("utterance = ", utterance);
        if (Date.now()-this._canceledAtMs > 100) {
            window.speechSynthesis.speak(utterance);
        } else {
            this._speakTimeout = window.setTimeout(function (){
                window.speechSynthesis.speak(utterance);
            }, 200);
        }
    }
};


},{"./serverTts":2,"crypto-js/sha256":7}],5:[function(require,module,exports){
exports.TtsEngine = require('./helpers/ttsEngine').TtsEngine;
},{"./helpers/ttsEngine":4}],6:[function(require,module,exports){
(function (global){(function (){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory();
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define([], factory);
	}
	else {
		// Global (browser)
		root.CryptoJS = factory();
	}
}(this, function () {

	/*globals window, global, require*/

	/**
	 * CryptoJS core components.
	 */
	var CryptoJS = CryptoJS || (function (Math, undefined) {

	    var crypto;

	    // Native crypto from window (Browser)
	    if (typeof window !== 'undefined' && window.crypto) {
	        crypto = window.crypto;
	    }

	    // Native crypto in web worker (Browser)
	    if (typeof self !== 'undefined' && self.crypto) {
	        crypto = self.crypto;
	    }

	    // Native crypto from worker
	    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
	        crypto = globalThis.crypto;
	    }

	    // Native (experimental IE 11) crypto from window (Browser)
	    if (!crypto && typeof window !== 'undefined' && window.msCrypto) {
	        crypto = window.msCrypto;
	    }

	    // Native crypto from global (NodeJS)
	    if (!crypto && typeof global !== 'undefined' && global.crypto) {
	        crypto = global.crypto;
	    }

	    // Native crypto import via require (NodeJS)
	    if (!crypto && typeof require === 'function') {
	        try {
	            crypto = require('crypto');
	        } catch (err) {}
	    }

	    /*
	     * Cryptographically secure pseudorandom number generator
	     *
	     * As Math.random() is cryptographically not safe to use
	     */
	    var cryptoSecureRandomInt = function () {
	        if (crypto) {
	            // Use getRandomValues method (Browser)
	            if (typeof crypto.getRandomValues === 'function') {
	                try {
	                    return crypto.getRandomValues(new Uint32Array(1))[0];
	                } catch (err) {}
	            }

	            // Use randomBytes method (NodeJS)
	            if (typeof crypto.randomBytes === 'function') {
	                try {
	                    return crypto.randomBytes(4).readInt32LE();
	                } catch (err) {}
	            }
	        }

	        throw new Error('Native crypto module could not be used to get secure random number.');
	    };

	    /*
	     * Local polyfill of Object.create

	     */
	    var create = Object.create || (function () {
	        function F() {}

	        return function (obj) {
	            var subtype;

	            F.prototype = obj;

	            subtype = new F();

	            F.prototype = null;

	            return subtype;
	        };
	    }());

	    /**
	     * CryptoJS namespace.
	     */
	    var C = {};

	    /**
	     * Library namespace.
	     */
	    var C_lib = C.lib = {};

	    /**
	     * Base object for prototypal inheritance.
	     */
	    var Base = C_lib.Base = (function () {


	        return {
	            /**
	             * Creates a new object that inherits from this object.
	             *
	             * @param {Object} overrides Properties to copy into the new object.
	             *
	             * @return {Object} The new object.
	             *
	             * @static
	             *
	             * @example
	             *
	             *     var MyType = CryptoJS.lib.Base.extend({
	             *         field: 'value',
	             *
	             *         method: function () {
	             *         }
	             *     });
	             */
	            extend: function (overrides) {
	                // Spawn
	                var subtype = create(this);

	                // Augment
	                if (overrides) {
	                    subtype.mixIn(overrides);
	                }

	                // Create default initializer
	                if (!subtype.hasOwnProperty('init') || this.init === subtype.init) {
	                    subtype.init = function () {
	                        subtype.$super.init.apply(this, arguments);
	                    };
	                }

	                // Initializer's prototype is the subtype object
	                subtype.init.prototype = subtype;

	                // Reference supertype
	                subtype.$super = this;

	                return subtype;
	            },

	            /**
	             * Extends this object and runs the init method.
	             * Arguments to create() will be passed to init().
	             *
	             * @return {Object} The new object.
	             *
	             * @static
	             *
	             * @example
	             *
	             *     var instance = MyType.create();
	             */
	            create: function () {
	                var instance = this.extend();
	                instance.init.apply(instance, arguments);

	                return instance;
	            },

	            /**
	             * Initializes a newly created object.
	             * Override this method to add some logic when your objects are created.
	             *
	             * @example
	             *
	             *     var MyType = CryptoJS.lib.Base.extend({
	             *         init: function () {
	             *             // ...
	             *         }
	             *     });
	             */
	            init: function () {
	            },

	            /**
	             * Copies properties into this object.
	             *
	             * @param {Object} properties The properties to mix in.
	             *
	             * @example
	             *
	             *     MyType.mixIn({
	             *         field: 'value'
	             *     });
	             */
	            mixIn: function (properties) {
	                for (var propertyName in properties) {
	                    if (properties.hasOwnProperty(propertyName)) {
	                        this[propertyName] = properties[propertyName];
	                    }
	                }

	                // IE won't copy toString using the loop above
	                if (properties.hasOwnProperty('toString')) {
	                    this.toString = properties.toString;
	                }
	            },

	            /**
	             * Creates a copy of this object.
	             *
	             * @return {Object} The clone.
	             *
	             * @example
	             *
	             *     var clone = instance.clone();
	             */
	            clone: function () {
	                return this.init.prototype.extend(this);
	            }
	        };
	    }());

	    /**
	     * An array of 32-bit words.
	     *
	     * @property {Array} words The array of 32-bit words.
	     * @property {number} sigBytes The number of significant bytes in this word array.
	     */
	    var WordArray = C_lib.WordArray = Base.extend({
	        /**
	         * Initializes a newly created word array.
	         *
	         * @param {Array} words (Optional) An array of 32-bit words.
	         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.lib.WordArray.create();
	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
	         */
	        init: function (words, sigBytes) {
	            words = this.words = words || [];

	            if (sigBytes != undefined) {
	                this.sigBytes = sigBytes;
	            } else {
	                this.sigBytes = words.length * 4;
	            }
	        },

	        /**
	         * Converts this word array to a string.
	         *
	         * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
	         *
	         * @return {string} The stringified word array.
	         *
	         * @example
	         *
	         *     var string = wordArray + '';
	         *     var string = wordArray.toString();
	         *     var string = wordArray.toString(CryptoJS.enc.Utf8);
	         */
	        toString: function (encoder) {
	            return (encoder || Hex).stringify(this);
	        },

	        /**
	         * Concatenates a word array to this word array.
	         *
	         * @param {WordArray} wordArray The word array to append.
	         *
	         * @return {WordArray} This word array.
	         *
	         * @example
	         *
	         *     wordArray1.concat(wordArray2);
	         */
	        concat: function (wordArray) {
	            // Shortcuts
	            var thisWords = this.words;
	            var thatWords = wordArray.words;
	            var thisSigBytes = this.sigBytes;
	            var thatSigBytes = wordArray.sigBytes;

	            // Clamp excess bits
	            this.clamp();

	            // Concat
	            if (thisSigBytes % 4) {
	                // Copy one byte at a time
	                for (var i = 0; i < thatSigBytes; i++) {
	                    var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                    thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
	                }
	            } else {
	                // Copy one word at a time
	                for (var j = 0; j < thatSigBytes; j += 4) {
	                    thisWords[(thisSigBytes + j) >>> 2] = thatWords[j >>> 2];
	                }
	            }
	            this.sigBytes += thatSigBytes;

	            // Chainable
	            return this;
	        },

	        /**
	         * Removes insignificant bits.
	         *
	         * @example
	         *
	         *     wordArray.clamp();
	         */
	        clamp: function () {
	            // Shortcuts
	            var words = this.words;
	            var sigBytes = this.sigBytes;

	            // Clamp
	            words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
	            words.length = Math.ceil(sigBytes / 4);
	        },

	        /**
	         * Creates a copy of this word array.
	         *
	         * @return {WordArray} The clone.
	         *
	         * @example
	         *
	         *     var clone = wordArray.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);
	            clone.words = this.words.slice(0);

	            return clone;
	        },

	        /**
	         * Creates a word array filled with random bytes.
	         *
	         * @param {number} nBytes The number of random bytes to generate.
	         *
	         * @return {WordArray} The random word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.lib.WordArray.random(16);
	         */
	        random: function (nBytes) {
	            var words = [];

	            for (var i = 0; i < nBytes; i += 4) {
	                words.push(cryptoSecureRandomInt());
	            }

	            return new WordArray.init(words, nBytes);
	        }
	    });

	    /**
	     * Encoder namespace.
	     */
	    var C_enc = C.enc = {};

	    /**
	     * Hex encoding strategy.
	     */
	    var Hex = C_enc.Hex = {
	        /**
	         * Converts a word array to a hex string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The hex string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var hexChars = [];
	            for (var i = 0; i < sigBytes; i++) {
	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                hexChars.push((bite >>> 4).toString(16));
	                hexChars.push((bite & 0x0f).toString(16));
	            }

	            return hexChars.join('');
	        },

	        /**
	         * Converts a hex string to a word array.
	         *
	         * @param {string} hexStr The hex string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
	         */
	        parse: function (hexStr) {
	            // Shortcut
	            var hexStrLength = hexStr.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < hexStrLength; i += 2) {
	                words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
	            }

	            return new WordArray.init(words, hexStrLength / 2);
	        }
	    };

	    /**
	     * Latin1 encoding strategy.
	     */
	    var Latin1 = C_enc.Latin1 = {
	        /**
	         * Converts a word array to a Latin1 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The Latin1 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var latin1Chars = [];
	            for (var i = 0; i < sigBytes; i++) {
	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                latin1Chars.push(String.fromCharCode(bite));
	            }

	            return latin1Chars.join('');
	        },

	        /**
	         * Converts a Latin1 string to a word array.
	         *
	         * @param {string} latin1Str The Latin1 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
	         */
	        parse: function (latin1Str) {
	            // Shortcut
	            var latin1StrLength = latin1Str.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < latin1StrLength; i++) {
	                words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
	            }

	            return new WordArray.init(words, latin1StrLength);
	        }
	    };

	    /**
	     * UTF-8 encoding strategy.
	     */
	    var Utf8 = C_enc.Utf8 = {
	        /**
	         * Converts a word array to a UTF-8 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The UTF-8 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            try {
	                return decodeURIComponent(escape(Latin1.stringify(wordArray)));
	            } catch (e) {
	                throw new Error('Malformed UTF-8 data');
	            }
	        },

	        /**
	         * Converts a UTF-8 string to a word array.
	         *
	         * @param {string} utf8Str The UTF-8 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
	         */
	        parse: function (utf8Str) {
	            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
	        }
	    };

	    /**
	     * Abstract buffered block algorithm template.
	     *
	     * The property blockSize must be implemented in a concrete subtype.
	     *
	     * @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
	     */
	    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
	        /**
	         * Resets this block algorithm's data buffer to its initial state.
	         *
	         * @example
	         *
	         *     bufferedBlockAlgorithm.reset();
	         */
	        reset: function () {
	            // Initial values
	            this._data = new WordArray.init();
	            this._nDataBytes = 0;
	        },

	        /**
	         * Adds new data to this block algorithm's buffer.
	         *
	         * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
	         *
	         * @example
	         *
	         *     bufferedBlockAlgorithm._append('data');
	         *     bufferedBlockAlgorithm._append(wordArray);
	         */
	        _append: function (data) {
	            // Convert string to WordArray, else assume WordArray already
	            if (typeof data == 'string') {
	                data = Utf8.parse(data);
	            }

	            // Append
	            this._data.concat(data);
	            this._nDataBytes += data.sigBytes;
	        },

	        /**
	         * Processes available data blocks.
	         *
	         * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
	         *
	         * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
	         *
	         * @return {WordArray} The processed data.
	         *
	         * @example
	         *
	         *     var processedData = bufferedBlockAlgorithm._process();
	         *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
	         */
	        _process: function (doFlush) {
	            var processedWords;

	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;
	            var dataSigBytes = data.sigBytes;
	            var blockSize = this.blockSize;
	            var blockSizeBytes = blockSize * 4;

	            // Count blocks ready
	            var nBlocksReady = dataSigBytes / blockSizeBytes;
	            if (doFlush) {
	                // Round up to include partial blocks
	                nBlocksReady = Math.ceil(nBlocksReady);
	            } else {
	                // Round down to include only full blocks,
	                // less the number of blocks that must remain in the buffer
	                nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
	            }

	            // Count words ready
	            var nWordsReady = nBlocksReady * blockSize;

	            // Count bytes ready
	            var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

	            // Process blocks
	            if (nWordsReady) {
	                for (var offset = 0; offset < nWordsReady; offset += blockSize) {
	                    // Perform concrete-algorithm logic
	                    this._doProcessBlock(dataWords, offset);
	                }

	                // Remove processed words
	                processedWords = dataWords.splice(0, nWordsReady);
	                data.sigBytes -= nBytesReady;
	            }

	            // Return processed words
	            return new WordArray.init(processedWords, nBytesReady);
	        },

	        /**
	         * Creates a copy of this object.
	         *
	         * @return {Object} The clone.
	         *
	         * @example
	         *
	         *     var clone = bufferedBlockAlgorithm.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);
	            clone._data = this._data.clone();

	            return clone;
	        },

	        _minBufferSize: 0
	    });

	    /**
	     * Abstract hasher template.
	     *
	     * @property {number} blockSize The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
	     */
	    var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
	        /**
	         * Configuration options.
	         */
	        cfg: Base.extend(),

	        /**
	         * Initializes a newly created hasher.
	         *
	         * @param {Object} cfg (Optional) The configuration options to use for this hash computation.
	         *
	         * @example
	         *
	         *     var hasher = CryptoJS.algo.SHA256.create();
	         */
	        init: function (cfg) {
	            // Apply config defaults
	            this.cfg = this.cfg.extend(cfg);

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this hasher to its initial state.
	         *
	         * @example
	         *
	         *     hasher.reset();
	         */
	        reset: function () {
	            // Reset data buffer
	            BufferedBlockAlgorithm.reset.call(this);

	            // Perform concrete-hasher logic
	            this._doReset();
	        },

	        /**
	         * Updates this hasher with a message.
	         *
	         * @param {WordArray|string} messageUpdate The message to append.
	         *
	         * @return {Hasher} This hasher.
	         *
	         * @example
	         *
	         *     hasher.update('message');
	         *     hasher.update(wordArray);
	         */
	        update: function (messageUpdate) {
	            // Append
	            this._append(messageUpdate);

	            // Update the hash
	            this._process();

	            // Chainable
	            return this;
	        },

	        /**
	         * Finalizes the hash computation.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} messageUpdate (Optional) A final message update.
	         *
	         * @return {WordArray} The hash.
	         *
	         * @example
	         *
	         *     var hash = hasher.finalize();
	         *     var hash = hasher.finalize('message');
	         *     var hash = hasher.finalize(wordArray);
	         */
	        finalize: function (messageUpdate) {
	            // Final message update
	            if (messageUpdate) {
	                this._append(messageUpdate);
	            }

	            // Perform concrete-hasher logic
	            var hash = this._doFinalize();

	            return hash;
	        },

	        blockSize: 512/32,

	        /**
	         * Creates a shortcut function to a hasher's object interface.
	         *
	         * @param {Hasher} hasher The hasher to create a helper for.
	         *
	         * @return {Function} The shortcut function.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
	         */
	        _createHelper: function (hasher) {
	            return function (message, cfg) {
	                return new hasher.init(cfg).finalize(message);
	            };
	        },

	        /**
	         * Creates a shortcut function to the HMAC's object interface.
	         *
	         * @param {Hasher} hasher The hasher to use in this HMAC helper.
	         *
	         * @return {Function} The shortcut function.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
	         */
	        _createHmacHelper: function (hasher) {
	            return function (message, key) {
	                return new C_algo.HMAC.init(hasher, key).finalize(message);
	            };
	        }
	    });

	    /**
	     * Algorithm namespace.
	     */
	    var C_algo = C.algo = {};

	    return C;
	}(Math));


	return CryptoJS;

}));
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"crypto":8}],7:[function(require,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(require("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Initialization and round constants tables
	    var H = [];
	    var K = [];

	    // Compute constants
	    (function () {
	        function isPrime(n) {
	            var sqrtN = Math.sqrt(n);
	            for (var factor = 2; factor <= sqrtN; factor++) {
	                if (!(n % factor)) {
	                    return false;
	                }
	            }

	            return true;
	        }

	        function getFractionalBits(n) {
	            return ((n - (n | 0)) * 0x100000000) | 0;
	        }

	        var n = 2;
	        var nPrime = 0;
	        while (nPrime < 64) {
	            if (isPrime(n)) {
	                if (nPrime < 8) {
	                    H[nPrime] = getFractionalBits(Math.pow(n, 1 / 2));
	                }
	                K[nPrime] = getFractionalBits(Math.pow(n, 1 / 3));

	                nPrime++;
	            }

	            n++;
	        }
	    }());

	    // Reusable object
	    var W = [];

	    /**
	     * SHA-256 hash algorithm.
	     */
	    var SHA256 = C_algo.SHA256 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init(H.slice(0));
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var H = this._hash.words;

	            // Working variables
	            var a = H[0];
	            var b = H[1];
	            var c = H[2];
	            var d = H[3];
	            var e = H[4];
	            var f = H[5];
	            var g = H[6];
	            var h = H[7];

	            // Computation
	            for (var i = 0; i < 64; i++) {
	                if (i < 16) {
	                    W[i] = M[offset + i] | 0;
	                } else {
	                    var gamma0x = W[i - 15];
	                    var gamma0  = ((gamma0x << 25) | (gamma0x >>> 7))  ^
	                                  ((gamma0x << 14) | (gamma0x >>> 18)) ^
	                                   (gamma0x >>> 3);

	                    var gamma1x = W[i - 2];
	                    var gamma1  = ((gamma1x << 15) | (gamma1x >>> 17)) ^
	                                  ((gamma1x << 13) | (gamma1x >>> 19)) ^
	                                   (gamma1x >>> 10);

	                    W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
	                }

	                var ch  = (e & f) ^ (~e & g);
	                var maj = (a & b) ^ (a & c) ^ (b & c);

	                var sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
	                var sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7)  | (e >>> 25));

	                var t1 = h + sigma1 + ch + K[i] + W[i];
	                var t2 = sigma0 + maj;

	                h = g;
	                g = f;
	                f = e;
	                e = (d + t1) | 0;
	                d = c;
	                c = b;
	                b = a;
	                a = (t1 + t2) | 0;
	            }

	            // Intermediate hash value
	            H[0] = (H[0] + a) | 0;
	            H[1] = (H[1] + b) | 0;
	            H[2] = (H[2] + c) | 0;
	            H[3] = (H[3] + d) | 0;
	            H[4] = (H[4] + e) | 0;
	            H[5] = (H[5] + f) | 0;
	            H[6] = (H[6] + g) | 0;
	            H[7] = (H[7] + h) | 0;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Return final computed hash
	            return this._hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA256('message');
	     *     var hash = CryptoJS.SHA256(wordArray);
	     */
	    C.SHA256 = Hasher._createHelper(SHA256);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA256(message, key);
	     */
	    C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
	}(Math));


	return CryptoJS.SHA256;

}));
},{"./core":6}],8:[function(require,module,exports){

},{}]},{},[1]);
