import { Options, Response } from "./libraries/promise-request";
export default class API {
    private userAgent;
    providerType: ProviderType;
    config: {
        debug: boolean;
        cache_timeout: number;
        encryptionKey: string;
        storage: string;
        isMacOS: boolean;
        poppler_path: string;
        web_server: {
            url: string;
            main_url: string;
            cors: string[];
            port: number;
        };
        AniList: {
            SEASON: string;
            SEASON_YEAR: number;
            NEXT_SEASON: string;
            NEXT_YEAR: number;
            oath_id: number;
            oath_secret: string;
        };
        database_url: string;
        is_sqlite: boolean;
    };
    constructor(type: ProviderType, options?: any);
    loadConfig(options?: any): void;
    fetch(url: string, options?: Options): Promise<Response>;
    wait(time: number): Promise<unknown>;
    stringSearch(string: string, pattern: string): number;
}
export declare enum ProviderType {
    ANIME = "ANIME",
    MANGA = "MANGA",
    NOVEL = "NOVEL",
    META = "META",
    NONE = "NONE"
}
