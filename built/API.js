"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderType = void 0;
const promise_request_1 = require("./libraries/promise-request");
class API {
    constructor(type, options) {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36';
        this.config = {
            debug: true,
            cache_timeout: 14400000,
            encryptionKey: "myheroacademia",
            storage: "/root/Anify-API/storage",
            isMacOS: true,
            poppler_path: "/opt/homebrew/Cellar/poppler/22.12.0/bin",
            web_server: {
                url: "https://api.anify.tv",
                main_url: "https://anify.tv",
                cors: ["https://anify.tv", "https://api.anify.tv", "http://localhost:3000", "http://localhost:3060"],
                port: 3060
            },
            AniList: {
                SEASON: "WINTER",
                SEASON_YEAR: 2023,
                NEXT_SEASON: "SPRING",
                NEXT_YEAR: 2023,
                oath_id: -1,
                oath_secret: ""
            },
            database_url: "postgresql://postgres:password@localhost:3306",
            is_sqlite: false
        };
        this.providerType = type;
        this.loadConfig(options);
    }
    loadConfig(options) {
        if (process.env.DEBUG) {
            this.config.debug = process.env.DEBUG.toLowerCase() === "true";
        }
        if (process.env.CACHE_TIMEOUT) {
            this.config.cache_timeout = Number(process.env.CACHE_TIMEOUT);
        }
        if (process.env.ENCRYPTION_KEY) {
            this.config.encryptionKey = process.env.ENCRYPTION_KEY;
        }
        if (process.env.STORAGE) {
            this.config.storage = process.env.STORAGE;
        }
        if (process.env.IS_MACOS) {
            this.config.isMacOS = process.env.IS_MACOS.toLowerCase() === "true";
        }
        if (process.env.POPPLER_PATH) {
            this.config.poppler_path = process.env.POPPLER_PATH;
        }
        if (process.env.WEB_SERVER_URL) {
            this.config.web_server.url = process.env.WEB_SERVER_URL;
        }
        if (process.env.WEB_SERVER_MAIN_URL) {
            this.config.web_server.main_url = process.env.WEB_SERVER_MAIN_URL;
        }
        if (process.env.WEB_SERVER_CORS) {
            this.config.web_server.cors = process.env.WEB_SERVER_CORS.split(",");
        }
        if (process.env.WEB_SERVER_PORT) {
            this.config.web_server.port = Number(process.env.WEB_SERVER_PORT);
        }
        if (process.env.ANILIST_SEASON) {
            this.config.AniList.SEASON = process.env.ANILIST_SEASON;
        }
        if (process.env.ANILIST_SEASON_YEAR) {
            this.config.AniList.SEASON_YEAR = Number(process.env.ANILIST_SEASON_YEAR);
        }
        if (process.env.ANILIST_NEXT_SEASON) {
            this.config.AniList.NEXT_SEASON = process.env.ANILIST_NEXT_SEASON;
        }
        if (process.env.ANILIST_NEXT_YEAR) {
            this.config.AniList.NEXT_YEAR = Number(process.env.ANILIST_NEXT_YEAR);
        }
        if (process.env.ANILIST_OATH_ID) {
            this.config.AniList.oath_id = Number(process.env.ANILIST_OATH_ID);
        }
        if (process.env.ANILIST_OATH_SECRET) {
            this.config.AniList.oath_secret = process.env.ANILIST_OATH_SECRET;
        }
        if (process.env.DATABASE_URL) {
            this.config.database_url = process.env.DATABASE_URL;
        }
        if (process.env.IS_SQLITE) {
            this.config.is_sqlite = process.env.IS_SQLITE.toLowerCase() === "true";
        }
        if (options) {
            this.config = {
                ...this.config,
                ...options
            };
        }
    }
    async fetch(url, options) {
        const request = new promise_request_1.default(url, {
            ...options,
            headers: {
                ...options?.headers,
                'User-Agent': this.userAgent
            }
        });
        const data = await request.request();
        return data;
    }
    async wait(time) {
        return new Promise(resolve => {
            setTimeout(resolve, time);
        });
    }
    stringSearch(string, pattern) {
        let count = 0;
        string = string.toLowerCase();
        pattern = pattern.toLowerCase();
        string = string.replace(/[^a-zA-Z0-9 -]/g, "");
        pattern = pattern.replace(/[^a-zA-Z0-9 -]/g, "");
        for (let i = 0; i < string.length; i++) {
            for (let j = 0; j < pattern.length; j++) {
                if (pattern[j] !== string[i + j])
                    break;
                if (j === pattern.length - 1)
                    count++;
            }
        }
        return count;
    }
}
exports.default = API;
var ProviderType;
(function (ProviderType) {
    ProviderType["ANIME"] = "ANIME";
    ProviderType["MANGA"] = "MANGA";
    ProviderType["NOVEL"] = "NOVEL";
    ProviderType["META"] = "META";
    ProviderType["NONE"] = "NONE";
})(ProviderType = exports.ProviderType || (exports.ProviderType = {}));
//# sourceMappingURL=API.js.map