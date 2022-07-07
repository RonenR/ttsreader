(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/// Full list of supported languages in Google Cloud Speech-To-Text: https://cloud.google.com/speech-to-text/docs/languages

exports.Languages = {

    // Arranged as: [native name, code in form: xx-XX, English name]
    allLocales: [
        ["Afrikaans (Suid-Afrika)" ,"af-ZA" ,"Afrikaans (South Africa)"],
        ["አማርኛ (ኢትዮጵያ)" ,"am-ET" ,"Amharic (Ethiopia)"],
        ["Հայ (Հայաստան)" ,"hy-AM" ,"Armenian (Armenia)"],
        ["Azərbaycan (Azərbaycan)" ,"az-AZ" ,"Azerbaijani (Azerbaijan)"],
        ["Bahasa Indonesia (Indonesia)" ,"id-ID" ,"Indonesian (Indonesia)", 1],
        ["Bahasa Melayu (Malaysia)" ,"ms-MY" ,"Malay (Malaysia)"],
        ["বাংলা (বাংলাদেশ)" ,"bn-BD" ,"Bengali (Bangladesh)", 1],
        ["বাংলা (ভারত)" ,"bn-IN" ,"Bengali (India)"],
        ["Català (Espanya)" ,"ca-ES" ,"Catalan (Spain)"],
        ["Čeština (Česká republika)" ,"cs-CZ" ,"Czech (Czech Republic)"],
        ["Dansk (Danmark)" ,"da-DK" ,"Danish (Denmark)"],
        ["Deutsch (Deutschland)" ,"de-DE" ,"German (Germany)"],
        ["English (Australia)" ,"en-AU" ,"English (Australia)"],
        ["English (Canada)" ,"en-CA" ,"English (Canada)"],
        ["English (Ghana)" ,"en-GH" ,"English (Ghana)"],
        ["English (Great Britain)" ,"en-GB" ,"English (United Kingdom)"],
        ["English (India)" ,"en-IN" ,"English (India)"],
        ["English (Ireland)" ,"en-IE" ,"English (Ireland)"],
        ["English (Kenya)" ,"en-KE" ,"English (Kenya)"],
        ["English (New Zealand)" ,"en-NZ" ,"English (New Zealand)"],
        ["English (Nigeria)" ,"en-NG" ,"English (Nigeria)"],
        ["English (Philippines)" ,"en-PH" ,"English (Philippines)"],
        ["English (Singapore)" ,"en-SG" ,"English (Singapore)"],
        ["English (South Africa)" ,"en-ZA" ,"English (South Africa)"],
        ["English (Tanzania)" ,"en-TZ" ,"English (Tanzania)"],
        ["English (United States)" ,"en-US" ,"English (United States)", 1],
        ["Español (Argentina)" ,"es-AR" ,"Spanish (Argentina)"],
        ["Español (Bolivia)" ,"es-BO" ,"Spanish (Bolivia)"],
        ["Español (Chile)" ,"es-CL" ,"Spanish (Chile)"],
        ["Español (Colombia)" ,"es-CO" ,"Spanish (Colombia)"],
        ["Español (Costa Rica)" ,"es-CR" ,"Spanish (Costa Rica)"],
        ["Español (Ecuador)" ,"es-EC" ,"Spanish (Ecuador)"],
        ["Español (El Salvador)" ,"es-SV" ,"Spanish (El Salvador)"],
        ["Español (España)" ,"es-ES" ,"Spanish (Spain)", 1],
        ["Español (Estados Unidos)" ,"es-US" ,"Spanish (United States)"],
        ["Español (Guatemala)" ,"es-GT" ,"Spanish (Guatemala)"],
        ["Español (Honduras)" ,"es-HN" ,"Spanish (Honduras)"],
        ["Español (México)" ,"es-MX" ,"Spanish (Mexico)"],
        ["Español (Nicaragua)" ,"es-NI" ,"Spanish (Nicaragua)"],
        ["Español (Panamá)" ,"es-PA" ,"Spanish (Panama)"],
        ["Español (Paraguay)" ,"es-PY" ,"Spanish (Paraguay)"],
        ["Español (Perú)" ,"es-PE" ,"Spanish (Peru)"],
        ["Español (Puerto Rico)" ,"es-PR" ,"Spanish (Puerto Rico)"],
        ["Español (República Dominicana)" ,"es-DO" ,"Spanish (Dominican Republic)"],
        ["Español (Uruguay)" ,"es-UY" ,"Spanish (Uruguay)"],
        ["Español (Venezuela)" ,"es-VE" ,"Spanish (Venezuela)"],
        ["Euskara (Espainia)" ,"eu-ES" ,"Basque (Spain)"],
        ["Filipino (Pilipinas)" ,"fil-PH" ,"Filipino (Philippines)"],
        ["Français (Canada)" ,"fr-CA" ,"French (Canada)"],
        ["Français (France)" ,"fr-FR" ,"French (France)", 1],
        ["Galego (España)" ,"gl-ES" ,"Galician (Spain)"],
        ["ქართული (საქართველო)" ,"ka-GE" ,"Georgian (Georgia)"],
        ["ગુજરાતી (ભારત)" ,"gu-IN" ,"Gujarati (India)"],
        ["Hrvatski (Hrvatska)" ,"hr-HR" ,"Croatian (Croatia)"],
        ["IsiZulu (Ningizimu Afrika)" ,"zu-ZA" ,"Zulu (South Africa)"],
        ["Íslenska (Ísland)" ,"is-IS" ,"Icelandic (Iceland)"],
        ["Italiano (Italia)" ,"it-IT" ,"Italian (Italy)"],
        ["Jawa (Indonesia)" ,"jv-ID" ,"Javanese (Indonesia)"],
        ["ಕನ್ನಡ (ಭಾರತ)" ,"kn-IN" ,"Kannada (India)"],
        ["ភាសាខ្មែរ (កម្ពុជា)" ,"km-KH" ,"Khmer (Cambodia)"],
        ["ລາວ (ລາວ)" ,"lo-LA" ,"Lao (Laos)"],
        ["Latviešu (latviešu)" ,"lv-LV" ,"Latvian (Latvia)"],
        ["Lietuvių (Lietuva)" ,"lt-LT" ,"Lithuanian (Lithuania)"],
        ["Magyar (Magyarország)" ,"hu-HU" ,"Hungarian (Hungary)"],
        ["മലയാളം (ഇന്ത്യ)" ,"ml-IN" ,"Malayalam (India)"],
        ["मराठी (भारत)" ,"mr-IN" ,"Marathi (India)"],
        ["Nederlands (Nederland)" ,"nl-NL" ,"Dutch (Netherlands)"],
        ["नेपाली (नेपाल)" ,"ne-NP" ,"Nepali (Nepal)"],
        ["Norsk bokmål (Norge)" ,"nb-NO" ,"Norwegian Bokmål (Norway)"],
        ["Polski (Polska)" ,"pl-PL" ,"Polish (Poland)"],
        ["Português (Brasil)" ,"pt-BR" ,"Portuguese (Brazil)", 1],
        ["Português (Portugal)" ,"pt-PT" ,"Portuguese (Portugal)"],
        ["Română (România)" ,"ro-RO" ,"Romanian (Romania)"],
        ["සිංහල (ශ්රී ලංකාව)" ,"si-LK" ,"Sinhala (Sri Lanka)"],
        ["Slovenčina (Slovensko)" ,"sk-SK" ,"Slovak (Slovakia)"],
        ["Slovenščina (Slovenija)" ,"sl-SI" ,"Slovenian (Slovenia)"],
        ["Urang (Indonesia)" ,"su-ID" ,"Sundanese (Indonesia)"],
        ["Swahili (Tanzania)" ,"sw-TZ" ,"Swahili (Tanzania)"],
        ["Swahili (Kenya)" ,"sw-KE" ,"Swahili (Kenya)"],
        ["Suomi (Suomi)" ,"fi-FI" ,"Finnish (Finland)"],
        ["Svenska (Sverige)" ,"sv-SE" ,"Swedish (Sweden)"],
        ["தமிழ் (இந்தியா)" ,"ta-IN" ,"Tamil (India)"],
        ["தமிழ் (சிங்கப்பூர்)" ,"ta-SG" ,"Tamil (Singapore)"],
        ["தமிழ் (இலங்கை)" ,"ta-LK" ,"Tamil (Sri Lanka)"],
        ["தமிழ் (மலேசியா)" ,"ta-MY" ,"Tamil (Malaysia)"],
        ["తెలుగు (భారతదేశం)" ,"te-IN" ,"Telugu (India)"],
        ["Tiếng Việt (Việt Nam)" ,"vi-VN" ,"Vietnamese (Vietnam)"],
        ["Türkçe (Türkiye)" ,"tr-TR" ,"Turkish (Turkey)"],
        ["اردو (پاکستان)" ,"ur-PK" ,"Urdu (Pakistan)"],
        ["اردو (بھارت)" ,"ur-IN" ,"Urdu (India)", 1],
        ["Ελληνικά (Ελλάδα)" ,"el-GR" ,"Greek (Greece)"],
        ["Български (България)" ,"bg-BG" ,"Bulgarian (Bulgaria)"],
        ["Русский (Россия)" ,"ru-RU" ,"Russian (Russia)"],
        ["Српски (Србија)" ,"sr-RS" ,"Serbian (Serbia)"],
        ["Українська (Україна)" ,"uk-UA" ,"Ukrainian (Ukraine)"],
        ["עברית (ישראל)" ,"he-IL" ,"Hebrew (Israel)"],
        ["العربية (إسرائيل)" ,"ar-IL" ,"Arabic (Israel)"],
        ["العربية (الأردن)" ,"ar-JO" ,"Arabic (Jordan)"],
        ["العربية (الإمارات)" ,"ar-AE" ,"Arabic (United Arab Emirates)"],
        ["العربية (البحرين)" ,"ar-BH" ,"Arabic (Bahrain)"],
        ["العربية (الجزائر)" ,"ar-DZ" ,"Arabic (Algeria)"],
        ["العربية (السعودية)" ,"ar-SA" ,"Arabic (Saudi Arabia)"],
        ["العربية (العراق)" ,"ar-IQ" ,"Arabic (Iraq)"],
        ["العربية (الكويت)" ,"ar-KW" ,"Arabic (Kuwait)"],
        ["العربية (المغرب)" ,"ar-MA" ,"Arabic (Morocco)"],
        ["العربية (تونس)" ,"ar-TN" ,"Arabic (Tunisia)"],
        ["العربية (عُمان)" ,"ar-OM" ,"Arabic (Oman)"],
        ["العربية (فلسطين)" ,"ar-PS" ,"Arabic (State of Palestine)"],
        ["العربية (قطر)" ,"ar-QA" ,"Arabic (Qatar)"],
        ["العربية (لبنان)" ,"ar-LB" ,"Arabic (Lebanon)"],
        ["العربية (مصر)" ,"ar-EG" ,"Arabic (Egypt)", 1],
        ["فارسی (ایران)" ,"fa-IR" ,"Persian (Iran)"],
        ["हिन्दी (भारत)" ,"hi-IN" ,"Hindi (India)"],
        ["ไทย (ประเทศไทย)" ,"th-TH" ,"Thai (Thailand)"],
        ["한국어 (대한민국)" ,"ko-KR" ,"Korean (South Korea)"],
        ["國語 (台灣)" ,"zh-TW" ,"Chinese, Mandarin (Traditional, Taiwan)"],
        ["廣東話 (香港)" ,"yue-Hant-HK" ,"Chinese, Cantonese (Traditional, Hong Kong)"],
        ["日本語（日本）" ,"ja-JP" ,"Japanese (Japan)"],
        ["普通話 (香港)" ,"zh-HK" ,"Chinese, Mandarin (Simplified, Hong Kong)"],
        ["普通话 (中国大陆)" ,"zh" ,"Chinese, Mandarin (Simplified, China)"],
    ],

    normalizeCode: function (code) {
        if (!code) {
            return "";
        }

        return code.toUpperCase().replace(/_/g,"-");
    },

    areCodesEqual: function (a,b) {
        if (a==b) {
            return true;
        }

        if (!a || !b) {
            return false;
        }

        return (this.normalizeCode(a)==this.normalizeCode(b));
    },

    isLanguageCodeSupported: function (code) {
        if (this.getLocaleByCode(code)) {
            return true;
        } else {
            return false;
        }
    },

    supportedLanguagesString: function () {
        let str = "";
        for (let lang of this.allLocales) {
            str += this.codeToLabel(lang[1]) + "\n";
        }
        return str;
    },

    // nameType: "native" / "english" / "both"
    codeToName: function (code, nameType = "native") {
        if (!code) {
            return "";
        }

        let list = code.includes("-") || code.includes("_") ? this.allLocales : this.getSupportedLanguagesOnlyList();
        for (const language of list) {
            if (this.areCodesEqual(language[1],code)) {
                switch (nameType) {
                    case "english": {
                        return language[2];
                    }
                    case "both": {

                        return language[0] + " - " + language[2];
                    }
                    case "native":
                    default: {
                        return language[0];
                    }
                }
            }
        }
    },


    getFlagForCountryCode: function (code) {
        if (code == null || code.length != 2) {
            return "";
        }

        code = code.toUpperCase();

        if (code=="IL") {
            return "🇮🇱";
        }

        if (code=="PS") {
            return "🇵🇸";
        }

        let sb = "";
        const a = String.fromCodePoint(code.codePointAt(0) - 0x41 + 0x1F1E6);
        const b = String.fromCodePoint(code.codePointAt(1) - 0x41 + 0x1F1E6);
        return a + b;
    },

    codeToCountryCode: function (code) {
        if (!code || code.length < 2) {
            return "";
        }

        code = code.replace("-", "_");
        if (code.indexOf("_")>-1) {
            let parts = code.split("_");
            code = parts[parts.length-1];
        } else {
            code = code.substring(code.length-2, code.length);
            if (code=="zh" || code=="ZH") {
                return "CN";
            }
        }

        return code;
    },

    codeToLanguageCodeOnly: function (code) {
        if (code == null || code.length < 2) {
            return "";
        }

        return  code.toLowerCase().replace("_", "-").split("-")[0];
    },

    doCodesShareLanguage: function (a,b) {
        return this.codeToLanguageCodeOnly(a)==this.codeToLanguageCodeOnly(b);
    },

    getLocaleByCode: function (code) {
        if (!code) {
            return "";
        }

        code = this.normalizeCode(code);
        if (!code.includes("-")) {
            return this.getDefaultLocaleForLanguage(code);
        } else {
            for (let lang of this.allLocales) {
                if (this.areCodesEqual(lang[1], code)) {
                    return lang;
                }
            }
        }

        return "";
    },

    getSupportedLanguagesOnlyList: function () {
        let languagesOnlyKeys = {};
        for (const locale of this.allLocales) {
            languagesOnlyKeys[this.codeToLanguageCodeOnly(locale[1])] = [locale[0].split(" (")[0], this.codeToLanguageCodeOnly(locale[1]), locale[2].split(" (")[0]];
        }
        let list = [];
        for (const key of Object.getOwnPropertyNames(languagesOnlyKeys)) {
            list.push(languagesOnlyKeys[key]);
        }
        list = list.sort((a,b) => a[0].localeCompare(b[0]) );
        return list;
    },

    getAllLocalesForLanguage: function (code) {
        if (!code) {
            return [];
        }

        code = this.codeToLanguageOnly(code);
        let locales = this.allLocales.filter((lang => this.codeToLanguageCodeOnly(lang[1]) == code))
        return locales;
    },

    getDefaultLocaleForLanguage: function (code) {
        if (!code) {
            return "";
        }

        code = this.codeToLanguageOnly(code).toLowerCase();

        let locales = this.allLocales.filter((lang => this.codeToLanguageCodeOnly(lang[1]) == code))

        if (!locales || locales.length==0) {
            return "";
        }

        if (locales.length==1) {
            return locales[0];
        }

        let locales4 = locales.filter((locale => locale.length>3));
        if (locales4 && locales4.length>0) {
            return locales4[0];
        }

        return locales[0];
    },

    codeToLanguageOnly: function (code) {
        if (!code) {
            return "";
        }

        return  code.toLowerCase().replace("_", "-").split("-")[0];
    },

    codeToFlag: function (code) {
        return this.getFlagForCountryCode(this.codeToCountryCode(code));
    },

    codeToLabel: function (code) {
        return this.codeToFlag(code) + " " + this.codeToName(code);
    }
}

},{}],2:[function(require,module,exports){
window.wsGlobals = window.wsGlobals || {};
window.wsGlobals.TtsEngine = require("./index").TtsEngine;

},{"./index":3}],3:[function(require,module,exports){
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


},{"locales":1}]},{},[2]);
