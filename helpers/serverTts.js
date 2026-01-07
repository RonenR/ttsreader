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