
// More voices can be selected here from GCP: https://cloud.google.com/text-to-speech/docs/list-voices-and-types
// Here from MS: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts
// MS voice gallery: https://speech.microsoft.com/portal/47e652ae62044c38a3964f2914437ad2/voicegallery
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
            name: "Vivienne",
            lang: "fr-FR",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "f",
        },
        {
            voiceURI: "ttsreaderServer.azure.fr-FR-HenriNeural",
            name: "Henri",
            lang: "fr-FR",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.de-DE-ConradNeural",
            name: "Conrad",
            lang: "de-DE",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
        },
        {
            voiceURI: "ttsreaderServer.azure.de-DE-SeraphinaMultilingualNeural",
            name: "Seraphina",
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