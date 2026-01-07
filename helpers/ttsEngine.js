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

