"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Provider_1 = require("./Provider");
const API_1 = require("./API");
class Anify extends Provider_1.default {
    constructor() {
        super("https://anify.tv", API_1.ProviderType.MANGA);
        this.api = "https://api.anify.tv";
    }
    async search(query) {
        const req = await this.fetch(`${this.api}/search/novels`, {
            method: "POST",
            body: JSON.stringify({ query: query }),
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = req.json();
        const result = data.map((item) => {
            item.cover = `${this.api}/cover/${item.cover}`;
            return item;
        });
        return result.map((item) => ({
            title: item.title,
            url: `${this.api}/pdf/${item.id}`
        }));
    }
}
exports.default = Anify;
//# sourceMappingURL=Anify.js.map