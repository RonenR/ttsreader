(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
window.wsGlobals = window.wsGlobals || {};
window.wsGlobals.TtsEngine = require("./index").TtsEngine;

},{"./index":3}],2:[function(require,module,exports){
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
    listener: null,  // includes: {onInit, onStart, onDone}
    utterance: {},

    _googleBugTimeout: null,
    _speakTimeout: null,
    _canceledAtMs: 0,

    init: function (listener) {
        if (listener) {
            this.listener = listener;
        }
        this._populateVoices();
        speechSynthesis.onvoiceschanged = () => { this._populateVoices(); };
    },

    setListener: function (listener) {
        this.listener = listener;
    },

    /// Assumes voices was populated.
    /// If voice, voiceURI, lang were not available, then it checks whether the current voice is available to keep.
    /// If current voice is available it is kept. Otherwise, the first voice in list is selected.
    /// NOTE: 'lang' is only lang, no 'locale' - ie no accent
    setBestMatchingVoice: function(voice, voiceURI, lang) {
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

    _populateVoices: function () {
        let voices = window.speechSynthesis.getVoices();
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
            console.log('onstart ', ev);
            self._defaultOnStart(ev);
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


},{}],3:[function(require,module,exports){
exports.TtsEngine = require('./helpers/ttsEngine').TtsEngine;
},{"./helpers/ttsEngine":2}]},{},[1]);
