class ServerVoices {
    static voices = [
        {
            voiceURI: "ttsreaderServer.gcp.en-US-Standard-F",
            name: "Olivia Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 1,
            gender: "f",
            avatar: "https://storage.ttsreader.com/images/voices/en-US-Standard-F.webp",
            demo: "https://storage.ttsreader.com/audio/voices/en-US-Standard-F.mp3", // For diff rates add the _rate050, _rate150, etc to the name
        }, {
            voiceURI: "ttsreaderServer.gcp.en-GB-Standard-D",
            name: "Noah Premium",
            lang: "en-GB",
            localService: false,
            default: true,
            premiumLevel: 1,
            gender: "m",
            avatar: "https://storage.ttsreader.com/images/voices/en-GB-Standard-D.webp",
            demo: "https://storage.ttsreader.com/audio/voices/en-GB-Standard-D.mp3", // For diff rates add the _rate050, _rate150, etc to the name
        }, {
            voiceURI: "ttsreaderServer.gcp.en-GB-Standard-N",
            name: "Lilly Premium",
            lang: "en-GB",
            localService: false,
            default: true,
            premiumLevel: 1,
            gender: "f",
            avatar: "https://storage.ttsreader.com/images/voices/en-GB-Standard-N.webp",
            demo: "https://storage.ttsreader.com/audio/voices/en-GB-Standard-N.mp3", // For diff rates add the _rate050, _rate150, etc to the name
        }, {
            voiceURI: "ttsreaderServer.gcp.en-US-Chirp-HD-D",
            name: "John Premium",
            lang: "en-US",
            localService: false,
            default: true,
            premiumLevel: 2,
            gender: "m",
            avatar: "https://storage.ttsreader.com/images/voices/noahNew.webp",
            demo: "https://storage.ttsreader.com/audio/voices/noahNew.mp3", // For diff rates add the _rate050, _rate150, etc to the name
        },
    ];
}

if (typeof module != 'undefined') {
    module.exports = { ServerVoices };
}