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
                utterance.audio.playbackRate = utterance.rate >= 0.95 ? utterance.rate : 1,
                utterance.renderStatus = "done"; // Mark as done
                utterance.onSuccess(); // ✅ Notify that audio is ready

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

    // Send the blob onSuccess. No need to buffer it.
    static async generateAudioSync(text, voiceURI, langBCP47, rate, id, authToken, onSuccess, onError) {
        let utterance = { text, voiceURI, langBCP47, rate, id, wasPlayed: false, audio: null };
        console.log('Generating: ', utterance.id);

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
                    quality: "48khz_192kbps" // High quality audio. TODO: make it configurable by the user (ie come from the client)
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
        } catch (error) {
            onError(error.message);
            return;
        }
    }

    static async speak(id, listener) {
        ServerTts.stop(); // Safe to run even if not playing.
        console.log('Got speak request, id: ', id);
        const getUtterance = () => ServerTts.buffer.find(u => u.id === id);

        let utterance = getUtterance();
        if (!utterance) return ServerTts.listener.onError(id, "Utterance not found in buffer");

        let waited = 0;
        while (!utterance.audio && waited < 10000) {
            await new Promise(r => setTimeout(r, 200));
            waited += 200;
            utterance = getUtterance(); // refresh in case it got updated
        }

        if (!utterance.audio) {
            listener.onError(id, "Audio not available after 10s");
            return;
        }

        ServerTts.currentAudio = utterance.audio;
        ServerTts.currentAudio.onended = () => {
            utterance.wasPlayed = true;
            listener.onDone(id);
        };
        ServerTts.currentAudio.onerror = () => {
            listener.onError(id, "Audio playback failed");
            listener.onDone(id);
        };
        listener.onStart(id);
        ServerTts.currentAudio.play().catch(err => {
            listener.onError(id, err.message);
            utterance.wasPlayed = true;
            listener.onDone(id);
        });
    }

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