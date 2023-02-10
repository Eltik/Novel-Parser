import API, { ProviderType } from "./API";
import AniList, { Media, Format } from "./AniList";
import Anify from "./Anify";
import DB from "./DB";
import { compareTwoStrings } from "./libraries/StringSimilarity";
import * as colors from "colors";
import * as crawler from "crawler-request";

export default class Core extends API {
    public aniList = new AniList();
    private db = new DB();
    private insert:boolean = false;

    public classDictionary:Provider[] = [];

    /**
     * @constructor
     * @param insert Whether or not to insert the results into the database.
     */
    constructor(insert?:boolean) {
        super(ProviderType.NONE, null);
        this.classDictionary = [
            {
                name: "Anify",
                object: new Anify,
            }
        ]
        this.insert = insert ? insert : false;
    }

    /**
     * @description Initializes the database
     */
    public async init() {
        await this.db.init();
    }

    /**
     * @description Searches on AniList and on providers and finds the best results possible. Very accurate but a lot slower.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    public async search(query:string): Promise<FormattedResponse[]> {
        let result:FormattedResponse[] = [];
        // Searches first on the database for a result
        if (this.config.debug) {
            console.log(colors.yellow("No results found in database. Searching on Anify..."));
            console.log(colors.gray("Searching for ") + colors.blue(query) + colors.gray("..."));
        }
        // Search on AniList first
        const aniSearch = await this.aniSearch(query);
        if (this.config.debug) {
            console.log(colors.gray("Received ") + colors.blue("AniList") + colors.gray(" response."));
        }

        const aniList = this.searchCompare(result, aniSearch);
        // Then search on providers
        const pageSearch = await this.pageSearch(query);
        if (this.config.debug) {
            console.log(colors.gray("Received ") + colors.blue("Provider") + colors.gray(" response."));
        }
        // Find the best results possible
        const pageList = this.searchCompare(aniList, pageSearch, 0.5);

        if (this.insert) {
            await this.db.insert(pageList);
        }

        return pageList;
    }

    /**
     * @description Searches for media on AniList and maps the results to providers.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    private async aniSearch(query:string): Promise<FormattedResponse[]> {
        const results:SearchResponse[] = [];

        const aniList = await this.aniList.search(query);

        const promises = [];
        for (let i = 0; i < this.classDictionary.length; i++) {
            const provider:any = this.classDictionary[i];
            promises.push(provider.object.search(query));
        }

        const resultsArray = await Promise.all(promises);
        for (let i = 0; i < resultsArray.length; i++) {
            for (let j = 0; j < resultsArray[i].length; j++) {
                let best: any = null;
    
                aniList.map(async (result:any) => {
                    if (result.format != Format.NOVEL) {
                        return;
                    }

                    const title = result.title.userPreferred || result.title.romaji || result.title.english || result.title.native;
                    const altTitles:any[] = Object.values(result.title).concat(result.synonyms);
                    const aniList = result;
    
                    const sim = this.similarity(title, resultsArray[i][j].title, altTitles);
                    const tempBest = {
                        index: j,
                        similarity: sim,
                        aniList: aniList,
                    };
    
                    if (!best || sim.value > best.similarity.value) {
                        best = tempBest;
                    }
                });
                if (best) {
                    const retEl = resultsArray[i][best.index];
                    results.push({
                        id: retEl.url,
                        data: best.aniList,
                        similarity: best.similarity,
                    });
                }
            }
        }
        return this.formatSearch(results);
    }

    /**
     * @description Searches for media on all providers and maps the results to AniList.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    private async pageSearch(query:string): Promise<FormattedResponse[]> {
        const results:SearchResponse[] = [];

        const promises = [];
        for (let i = 0; i < this.classDictionary.length; i++) {
            const provider:any = this.classDictionary[i];
            promises.push(provider.object.search(query));
        }
        const resultsArray = await Promise.all(promises);
        
        for (let i = 0; i < resultsArray.length; i++) {
            for (let j = 0; j < resultsArray[i].length; j++) {
                const aniSearch = await this.aniList.search(this.sanitizeTitle(resultsArray[i][j].title));
            
                let best: any = null;

                aniSearch.map(async (result:any) => {
                    const title = result.title.userPreferred || result.title.romaji || result.title.english || result.title.native;
                    const altTitles:any[] = Object.values(result.title).concat(result.synonyms);
                    const aniList = result;
    
                    const sim = this.similarity(title, resultsArray[i][j].title, altTitles);
                    const tempBest = {
                        index: j,
                        similarity: sim,
                        aniList: aniList,
                    };
    
                    if (!best || sim.value > best.similarity.value) {
                        best = tempBest;
                    }
                });
                if (best) {
                    const retEl = resultsArray[i][best.index];
                    results.push({
                        id: retEl.url,
                        data: best.aniList,
                        similarity: best.similarity,
                    });
                }
            }
        }
        let data = this.formatSearch(results);
        return data;
    }

    /**
     * 
     * @param id AniList ID of the media to get
     * @returns 
     */
    public async get(id:string): Promise<FormattedResponse> {
        const possible = await this.db.get(id);
        if (!possible) {
            const aniList = await this.aniList.getMedia(id);
            if (!aniList) {
                return null;
            }
            let result:FormattedResponse = null;
            const results = await this.search(aniList.title.userPreferred);
            for (let i = 0; i < results.length; i++) {
                if (Number(results[i].id) === Number(id)) {
                    result = results[i];
                }
            }
            return result;
        } else {
            return possible;
        }
    }

    /**
     * @description Crawls the provider for media.
     * @param type Type of media to crawl
     * @param maxIds Max IDs to crawl
     * @returns Promise<any>
     */
     public async crawl(stopOnError?:boolean, maxIds?:number): Promise<FormattedResponse[]> {
        const results = [];

        let ids = await this.aniList.getMangaIDs();

        maxIds = maxIds ? maxIds : ids.length;

        for (let i = 0; i < ids.length && i < maxIds; i++) {
            if (i >= maxIds) {
                break;
            }
            const start = new Date(Date.now());

            const data:Media = await this.aniList.getMedia(ids[i]).catch((err) => {
                if (this.config.debug) {
                    console.log(colors.red("Error fetching ID: ") + colors.white(ids[i] + ""));
                }
                return null;
            });
            if (data && data.format === Format.NOVEL) {
                const result = await this.get(ids[i]).catch((err) => {
                    if (this.config.debug) {
                        console.log(colors.red("Error fetching ID from providers: ") + colors.white(ids[i] + ""));
                        console.log(colors.gray(err.message));
                    }
                    if (stopOnError) {
                        throw new Error(err);
                    }
                    return null;
                });
                if (result) {
                    results.push(result);
                }
            }
            if (this.config.debug) {
                const end = new Date(Date.now());
                console.log(colors.gray("Finished fetching data. Request(s) took ") + colors.cyan(String(end.getTime() - start.getTime())) + colors.gray(" milliseconds."));
                console.log(colors.green("Fetched ID ") + colors.blue("#" + (i + 1) + "/" + maxIds));
            }
        }

        if (this.config.debug) {
            console.log(colors.green("Crawling finished."));
        }
        return results;
    }

     /**
     * @description Formats search responses so that all connectors are assigned to one AniList media object.
     * @param results Search results
     * @returns FormattedResponse[]
     */
    private formatSearch(results:SearchResponse[]): FormattedResponse[] {
        const formatted:FormattedResponse[] = [];

        for (let i = 0; i < results.length; i++) {
            const item:any = results[i];
            let hasPushed = false;
            for (let j = 0; j < formatted.length; j++) {
                if (formatted[j].data.id === item.data.id) {
                    hasPushed = true;
                    formatted[j].connectors.push(
                        {
                            id: item.id,
                            similarity: item.similarity
                        }
                    ); 
                }
            }
            if (!hasPushed) {
                item.connectors = [
                    {
                        id: item.id,
                        similarity: item.similarity
                    }
                ];
                item.id = item.data.id;
                const temp = {
                    id: item.id,
                    data: item.data,
                    connectors: item.connectors,
                };
                formatted.push(temp);
            }
        }
        return formatted;
    }

    /**
     * @description Compares the similarity between the external title and the title from the provider.
     * @param externalTitle Title from AniList/MAL
     * @param title Title from provider
     * @param titleArray Alt titles from provider
     * @returns { same: boolean, value: number }
     */
    public similarity(externalTitle, title, titleArray: string[] = []): { same: boolean, value: number } {
        let simi = compareTwoStrings(this.sanitizeTitle(title.toLowerCase()), externalTitle.toLowerCase());
        titleArray.forEach(el => {
            if (el) {
                const tempSimi = compareTwoStrings(title.toLowerCase(), el.toLowerCase());
                if (tempSimi > simi) simi = tempSimi;
            }
        });
        let found = false;
        if (simi > 0.6) {
            found = true;
        }

        return {
            same: found,
            value: simi,
        };
    }

    /**
     * @description Used for removing unnecessary information from the title.
     * @param title Title to sanitize.
     * @returns string
     */
    public sanitizeTitle(title):string {
        let resTitle = title.replace(
            / *(\(dub\)|\(sub\)|\(uncensored\)|\(uncut\)|\(subbed\)|\(dubbed\))/i,
            '',
        );
        resTitle = resTitle.replace(/ *\([^)]+audio\)/i, '');
        resTitle = resTitle.replace(/ BD( |$)/i, '');
        resTitle = resTitle.replace(/\(TV\)/g, '');
        resTitle = resTitle.trim();
        resTitle = resTitle.substring(0, 99); // truncate
        return resTitle;
    }

    /**
     * @description Compares two responses and replaces results that have a better response
     * @param curVal Original response
     * @param newVal New response to compare
     * @param threshold Optional minimum threshold required
     * @returns FormattedResponse[]
     */
     private searchCompare(curVal:FormattedResponse[], newVal:FormattedResponse[], threshold = 0):FormattedResponse[] {
        const res = [];
        if (curVal.length > 0 && newVal.length > 0) {
            for (let i = 0; i < curVal.length; i++) {
                for (let j = 0; j < newVal.length; j++) {
                    if (String(curVal[i].id) === String(newVal[j].id)) {
                        // Can compare now
                        const connectors = [];
                        for (let k = 0; k < curVal[i].connectors.length; k++) {
                            for (let l = 0; l < newVal[j].connectors.length; l++) {
                                if (curVal[i].connectors[k].id === newVal[j].connectors[l].id) {
                                    // Compare similarity
                                    if (newVal[j].connectors[l].similarity.value < threshold || curVal[i].connectors[k].similarity.value >= newVal[j].connectors[l].similarity.value) {
                                        connectors.push(curVal[i].connectors[k]);
                                    } else {
                                        connectors.push(newVal[j].connectors[l]);
                                    }
                                }
                            }
                        }
                        res.push({
                            id: curVal[i].id,
                            data: curVal[i].data,
                            connectors,
                        });
                    }
                }
            }
            return res;
        }
        if (curVal.length > 0) return curVal;
        return newVal;
    }

    public async pdfToHTML(url:string): Promise<string> {
        const data = await crawler(url);
        return data.text;
    }
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
    id: string; // The provider's URL
    data: Media;
    similarity: {
        same: boolean;
        value: number;
    };
}

export type { Result, Provider, FormattedResponse, SearchResponse };