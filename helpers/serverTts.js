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

    static async bufferNewUtterance(text, voiceURI, langBCP47, rate, id, authToken, onSuccess, onError, isTest = false) {
        let utterance = { text, voiceURI, langBCP47, rate, id, wasPlayed: false, audio: null };
        console.log('Buffering: ', utterance.id);

        // If already in buffer, simply move it to the end of the buffer array, so it doesn't get wiped out:
        const existingUtterance = ServerTts.buffer.find(u => u.id === id);
        if (existingUtterance) {
            existingUtterance.wasPlayed = false;
            // Take it out:
            ServerTts.buffer = ServerTts.buffer.filter(u => u.id !== id);
            // Now push it to the end:
            ServerTts.buffer.push(existingUtterance);
            onSuccess();
            return;
        }

        // If not in buffer, add it to the end of the buffer:
        ServerTts.buffer.push(utterance);

        // While we're at it, let's remove the first utterances so that we don't memory leak:
        while ((ServerTts.buffer.length > 20 && ServerTts.buffer[0].wasPlayed) || ServerTts.buffer.length > 50) {
            ServerTts.buffer.shift();
        }

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
                rate: rate,
                isTest: Boolean(isTest)
            })
        })
            .then(response => {
                if (!response.ok) {
                    onError();
                    return Promise.reject(); // Stop the chain
                }
                return response.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                utterance.audio = new Audio(url);
                onSuccess(); // ✅ Notify that audio is ready
            })
            .catch(err => {
                onError(err?.message || "Unknown error");
            });

        return;
        // Now - let's generate the audio:
        try {
            const response = await fetch(SERVER_TTS_ENDPOINT, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: text,
                    lang: voiceURI.replace("ttsreaderServer.gcp.","").split("-").slice(0, 2).join("-"),
                    voice: voiceURI,
                    rate: rate
                })
            });

            if (!response.ok) {
                onError();
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            utterance.audio = new Audio(url);
        } catch (error) {
            onError(error.message);
            return;
        }

        // ✅ Notify that audio is ready
        onSuccess();
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
                    rate: rate
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

        listener.onStart(id);
        ServerTts.currentAudio = utterance.audio;

        ServerTts.currentAudio.onended = () => {
            utterance.wasPlayed = true;
            listener.onDone(id);
        };

        ServerTts.currentAudio.onerror = () => {
            listener.onError(id, "Audio playback failed");
        };

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
    }
}

if (typeof module != 'undefined') {
    module.exports = { ServerTts };
}