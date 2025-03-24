const { ServerVoices } = require("./serverVoices");

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

    static async bufferNewUtterance(text, voiceURI, rate, id, authToken, onSuccess, onError) {
        let utterance = { text, voiceURI, rate, id, wasPlayed: false, audio: null };
        console.log('Buffering: ', utterance.id);

        // If already in buffer, simply move it to the end of the buffer array, so it doesn't get wiped out:
        const existingUtterance = ServerTts.buffer.find(u => u.id === id);
        if (existingUtterance && existingUtterance.audio) {
            existingUtterance.wasPlayed = false;
            ServerTts.buffer = ServerTts.buffer.filter(u => u.id !== id);
            ServerTts.buffer.push(existingUtterance);
            onSuccess();
            return;
        }

        try {
            const response = await fetch("https://us-central1-ttsreader.cloudfunctions.net/tts", {
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
                throw new Error(`Server returned status ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            utterance.audio = new Audio(url);
        } catch (error) {
            onError(error.message);
            return;
        }

        ServerTts.buffer.push(utterance);

        // Limit buffer size to 20, clean oldest played items
        while (ServerTts.buffer.length > 20 && ServerTts.buffer[0].wasPlayed) {
            ServerTts.buffer.shift();
        }

        // ✅ Notify that audio is ready
        onSuccess();
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