const {Languages} = require("locales");

exports.TtsEngine = {

    DEFAULT_LANG: "en",
    voice: null,
    voices: null,
    rate: 0.9,
    utteranceId: 0,
    startedAndNotTerminatedCounter: 0,
    listener: null,  // includes: {onInit, onStart, onDone}
    utterance: null,

    _googleBugTimeout: null,
    _speakTimeout: null,
    _canceledAtMs: 0,

    init: function(listener) {
        if (listener!=null) {
            this.listener = listener;
        }
        this._populateVoices();
        let self = this;
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = function () { self._populateVoices(); };
        }
    },
    
    setListener: function (listener) {
        this.listener = listener;
    },

    /// Assumes voices was populated.
    /// If voice, voiceURI, lang were not available, then it checks whether ther current voice is available to keep.
    /// If current voice is available it is kept. Otherwise, the first voice in list is selected.
    ///
    _setBestMatchingVoice: function(voice, voiceURI, lang) {
        if (this.voices == null || this.voices.length == 0) {
            return "";
        }

        if (voice) {
            for (const iVoice of this.voices) {
                if (iVoice == voice) {
                    this.voice = iVoice;
                    return iVoice.voiceURI;
                }
            }
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
            for (const iVoice of this.voices) {
                if (Languages.doCodesShareLanguage(iVoice.lang, lang)) {
                    this.voice = iVoice;
                    return iVoice.voiceURI;
                }
            }
        }

        if (this.voice != null) {
            for (const iVoice of this.voices) {
                if (iVoice == this.voice) {
                    return iVoice.voiceURI;
                }
            }
        }

        this.voice = this.voices[0];
        return this.voice.voiceURI;
    },

    _populateVoices: function () {
        let voices = window.speechSynthesis.getVoices();
        if (voices!=null && voices.length>0) {
            let isFirstInit = this.voices == null;

            if (this.voices==null || this.voices.length==0) {
                this.voices = voices;
                //console.log(voices);
                this._setBestMatchingVoice(this.voice, this.DEFAULT_LANG);
            }

            if (this.listener!=null && this.listener.onInit!==undefined) {
                this.listener.onInit(this.voices);
            }
        }
    },

    setVoiceByUri: function (voiceURI) {
        this._setBestMatchingVoice(null, voiceURI, null);
    },

    setVoice: function (voice) {
        this._setBestMatchingVoice(voice, null, null);
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

    _defaultOnStart: function(ev) {
        //console.log("_defaultOnStart utterance ", ev);
        this.startedAndNotTerminatedCounter++;
        this._solveChromeBug();
    },

    _defaultOnEnd: function(ev) {
        //console.log("_defaultOnEnd utterance ", ev);
        if (this.startedAndNotTerminatedCounter>0) {
            this.startedAndNotTerminatedCounter--;
        }
        this._clearUtteranceTimeouts();
    },

    _defaultOnError: function(ev) {
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
        if (this.voice == null) {
            return;
        }

        if (this.voice.voiceURI.toLowerCase().indexOf("google") == -1) {
            return;
        }

        // pause & resume every few secs:
        this._clearUtteranceTimeouts();
        let self = this;
        this._googleBugTimeout = window.setTimeout(function () {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
            self._solveChromeBug();
        }, 2000);
    },

    _prepareTextForSynthesis: function (text) {
        let decodedText = text;
        decodedText = decodedText.replace("·", ", ");
        decodedText = decodedText.replace("- ", ", ");
        decodedText.trim();
        return decodedText;
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

        if (!text || text.length==0) {
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
            this._setBestMatchingVoice(null, null, this.DEFAULT_LANG);
        }
        //console.log('voice is: ', this.voice);
        utterance.lang = this.voice.lang;
        utterance.voiceURI = this.voice.voiceURI; // For a bug in Chrome on Android.
        utterance.voice = this.voice;
        utterance.rate = this.rate;
        let self = this;

        utterance.onstart = function (ev) {
            //console.log('start');
            self._defaultOnStart(ev);
            if (self.listener && self.listener.onStart) {
                self.listener.onStart();
            }
        };

        utterance.onboundary = function(event) {
            // TODO: use this to mark specific word.
            //console.log(event.name + ' boundary reached after ' + event.elapsedTime + ' milliseconds.', event);
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
            self._defaultOnEnd(ev);
            if (self.listener && self.listener.onDone) {
                self.listener.onDone();
            }
            utterance = null;
        };

        utterance.onerror = function (ev) {
            //console.log('error ', ev);
            self._defaultOnError(ev);
            utterance = null;
        };

        console.log('tts - ronen right away')
        this._speakUtterance(utterance);
    },


    stop() {
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

