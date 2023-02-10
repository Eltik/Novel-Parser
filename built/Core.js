"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const API_1 = require("./API");
const AniList_1 = require("./AniList");
const Anify_1 = require("./Anify");
const StringSimilarity_1 = require("./libraries/StringSimilarity");
const colors = require("colors");
class Core extends API_1.default {
    constructor() {
        super(API_1.ProviderType.NONE, null);
        this.aniList = new AniList_1.default();
        this.classDictionary = [];
        this.classDictionary = [
            {
                name: "Anify",
                object: new Anify_1.default,
            }
        ];
    }
    /**
     * @description Searches on AniList and on providers and finds the best results possible. Very accurate but a lot slower.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    async search(query) {
        let result = [];
        // Searches first on the database for a result
        if (this.config.debug) {
            console.log(colors.yellow("No results found in database. Searching on Anify..."));
            console.log(colors.gray("Searching for ") + colors.blue(query) + colors.gray("..."));
        }
        // Search on AniList first
        const aniSearch = await this.aniSearch(query, AniList_1.Type.MANGA);
        if (this.config.debug) {
            console.log(colors.gray("Received ") + colors.blue("AniList") + colors.gray(" response."));
        }
        const aniList = this.searchCompare(result, aniSearch);
        // Then search on providers
        const pageSearch = await this.pageSearch(query, AniList_1.Type.MANGA);
        if (this.config.debug) {
            console.log(colors.gray("Received ") + colors.blue("Provider") + colors.gray(" response."));
        }
        // Find the best results possible
        const pageList = this.searchCompare(aniList, pageSearch, 0.5);
        return pageList;
    }
    /**
     * @description Searches for media on AniList and maps the results to providers.
     * @param query Media to search for.
     * @param type Type of media to search for.
     * @returns Promise<FormattedResponse[]>
     */
    async aniSearch(query, type) {
        const results = [];
        const aniList = await this.aniList.search(query, type);
        const promises = [];
        for (let i = 0; i < this.classDictionary.length; i++) {
            const provider = this.classDictionary[i];
            if (provider.object.providerType === type) {
                promises.push(provider.object.search(query));
            }
        }
        const resultsArray = await Promise.all(promises);
        for (let i = 0; i < resultsArray.length; i++) {
            for (let j = 0; j < resultsArray[i].length; j++) {
                let best = null;
                aniList.map(async (result) => {
                    if (type === AniList_1.Type.MANGA) {
                        if (result.format != AniList_1.Format.NOVEL) {
                            return;
                        }
                    }
                    const title = result.title.userPreferred || result.title.romaji || result.title.english || result.title.native;
                    const altTitles = Object.values(result.title).concat(result.synonyms);
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
    async pageSearch(query, type) {
        const results = [];
        const promises = [];
        for (let i = 0; i < this.classDictionary.length; i++) {
            const provider = this.classDictionary[i];
            if (provider.object.providerType === type) {
                promises.push(provider.object.search(query));
            }
        }
        const resultsArray = await Promise.all(promises);
        for (let i = 0; i < resultsArray.length; i++) {
            for (let j = 0; j < resultsArray[i].length; j++) {
                const aniSearch = await this.aniList.search(this.sanitizeTitle(resultsArray[i][j].title), type);
                let best = null;
                aniSearch.map(async (result) => {
                    const title = result.title.userPreferred || result.title.romaji || result.title.english || result.title.native;
                    const altTitles = Object.values(result.title).concat(result.synonyms);
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
    async get(id) {
        const aniList = await this.aniList.getMedia(id);
        if (!aniList) {
            return null;
        }
        let result = null;
        const results = await this.search(aniList.title.userPreferred);
        for (let i = 0; i < results.length; i++) {
            if (Number(results[i].id) === Number(id)) {
                result = results[i];
            }
        }
        return result;
    }
    /**
     * @description Crawls the provider for media.
     * @param type Type of media to crawl
     * @param maxIds Max IDs to crawl
     * @returns Promise<any>
     */
    async crawl(type, maxIds) {
        const results = [];
        let ids = [];
        if (type === AniList_1.Type.ANIME) {
            ids = await this.aniList.getAnimeIDs();
        }
        else if (type === AniList_1.Type.MANGA) {
            ids = await this.aniList.getMangaIDs();
        }
        else {
            throw new Error("Unknown type.");
        }
        maxIds = maxIds ? maxIds : ids.length;
        for (let i = 0; i < ids.length && i < maxIds; i++) {
            if (i >= maxIds) {
                break;
            }
            const start = new Date(Date.now());
            const data = await this.aniList.getMedia(ids[i]).catch((err) => {
                if (this.config.debug) {
                    console.log(colors.red("Error fetching ID: ") + colors.white(ids[i] + ""));
                }
                return null;
            });
            if (data) {
                const result = await this.get(ids[i]).catch((err) => {
                    if (this.config.debug) {
                        console.log(colors.red("Error fetching ID from providers: ") + colors.white(ids[i] + ""));
                        console.log(colors.gray(err.message));
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
    formatSearch(results) {
        const formatted = [];
        for (let i = 0; i < results.length; i++) {
            const item = results[i];
            let hasPushed = false;
            for (let j = 0; j < formatted.length; j++) {
                if (formatted[j].data.id === item.data.id) {
                    hasPushed = true;
                    formatted[j].connectors.push({
                        id: item.id,
                        similarity: item.similarity
                    });
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
    similarity(externalTitle, title, titleArray = []) {
        let simi = (0, StringSimilarity_1.compareTwoStrings)(this.sanitizeTitle(title.toLowerCase()), externalTitle.toLowerCase());
        titleArray.forEach(el => {
            if (el) {
                const tempSimi = (0, StringSimilarity_1.compareTwoStrings)(title.toLowerCase(), el.toLowerCase());
                if (tempSimi > simi)
                    simi = tempSimi;
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
    sanitizeTitle(title) {
        let resTitle = title.replace(/ *(\(dub\)|\(sub\)|\(uncensored\)|\(uncut\)|\(subbed\)|\(dubbed\))/i, '');
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
    searchCompare(curVal, newVal, threshold = 0) {
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
                                    }
                                    else {
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
        if (curVal.length > 0)
            return curVal;
        return newVal;
    }
}
exports.default = Core;
//# sourceMappingURL=Core.js.map