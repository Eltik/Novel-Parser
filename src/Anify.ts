import Provider from "./Provider";
import { ProviderType } from "./API";
import { Result } from "./Core";

export default class Anify extends Provider {
    private api = "https://api.anify.tv";

    constructor() {
        super("https://anify.tv", ProviderType.MANGA);
    }

    public async search(query:string): Promise<Array<Result>> {
        const req = await this.fetch(`${this.api}/search/novels`, {
            method: "POST",
            body: JSON.stringify({ query: query }),
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data:SearchResponse[] = req.json();

        const result = data.map((item) => {
            item.cover = `${this.api}/cover/${item.cover}`;
            return item;
        })

        return result.map((item) => ({
            title: item.title,
            url: `${this.api}/pdf/${item.id}`
        }));
    }
}

interface SearchResponse {
    id: string;
    title: string;
    path: string;
    cover: string;
}