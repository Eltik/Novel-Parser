import API from "./API";
import AniList, { Media } from "./AniList";
export default class Core extends API {
    aniList: AniList;
    private db;
    private insert;
    classDictionary: Provider[];
    /**
     * @constructor
     * @param insert Whether or not to insert the results into the database.
     */
    constructor(insert?: boolean);
    /**
     * @description Initializes the database
     */
    init(): Promise<void>;
    /**
     * @description Searches on AniList and on providers and finds the best results possible. Very accurate but a lot slower.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    search(query: string): Promise<FormattedResponse[]>;
    /**
     * @description Searches for media on AniList and maps the results to providers.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    private aniSearch;
    /**
     * @description Searches for media on all providers and maps the results to AniList.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    private pageSearch;
    /**
     *
     * @param id AniList ID of the media to get
     * @returns
     */
    get(id: string): Promise<FormattedResponse>;
    /**
     * @description Crawls the provider for media.
     * @param type Type of media to crawl
     * @param maxIds Max IDs to crawl
     * @returns Promise<any>
     */
    crawl(stopOnError?: boolean, maxIds?: number): Promise<FormattedResponse[]>;
    /**
    * @description Formats search responses so that all connectors are assigned to one AniList media object.
    * @param results Search results
    * @returns FormattedResponse[]
    */
    private formatSearch;
    /**
     * @description Compares the similarity between the external title and the title from the provider.
     * @param externalTitle Title from AniList/MAL
     * @param title Title from provider
     * @param titleArray Alt titles from provider
     * @returns { same: boolean, value: number }
     */
    similarity(externalTitle: any, title: any, titleArray?: string[]): {
        same: boolean;
        value: number;
    };
    /**
     * @description Used for removing unnecessary information from the title.
     * @param title Title to sanitize.
     * @returns string
     */
    sanitizeTitle(title: any): string;
    /**
     * @description Compares two responses and replaces results that have a better response
     * @param curVal Original response
     * @param newVal New response to compare
     * @param threshold Optional minimum threshold required
     * @returns FormattedResponse[]
     */
    private searchCompare;
}
interface Result {
    title: string;
    altTitles?: string[];
    url: string;
}
interface Provider {
    name: string;
    object: any;
}
interface FormattedResponse {
    id: string;
    data: Media;
    connectors: any[];
}
interface SearchResponse {
    id: string;
    data: Media;
    similarity: {
        same: boolean;
        value: number;
    };
}
export type { Result, Provider, FormattedResponse, SearchResponse };
