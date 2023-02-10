import { FormattedResponse } from "./Core";
import * as colors from "colors";
import API, { ProviderType } from "./API";
import { join } from "path";
import { Database } from "sqlite3";

export default class DB extends API {
    private db = new Database(join(__dirname, "../db.db"));
    
    constructor() {
        super(ProviderType.NONE);
    }

    public async init() {
        await this.createDatabase();
    }

    private async createDatabase(): Promise<void> {
        const db = this.db;
        const config = this.config;

        const promises = [];
        const anime = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS novels (id INTEGER PRIMARY KEY, data longtext not null, connectors longtext not null)", function (err) {
                if (err) reject(err);

                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("novels") + colors.gray(" table."));
                }
                resolve(true);
            });
        })
        promises.push(anime);
        await Promise.all(promises);
    }

    public async insert(data:FormattedResponse[]): Promise<void> {
        const promises = [];
        for (let i = 0; i < data.length; i++) {
            const promise = new Promise(async(resolve, reject) => {
                if (!data[i]) {
                    resolve(true);
                    return;
                }
                const exists = await this.get(data[i].id);
                if (!exists) {
                    const stmt = await this.db.prepare(`INSERT OR IGNORE INTO novels (id, data, connectors) VALUES ($id, $data, $connectors)`);
                    await stmt.run({ $id: data[i].id, $data: JSON.stringify(data[i].data), $connectors: JSON.stringify(data[i].connectors) });
                    await stmt.finalize();

                    if (this.config.debug) {
                        console.log(colors.white("Inserted ") + colors.blue(data[i].data.title.romaji) + " " + colors.white("into ") + colors.blue("novels") + colors.white("."));
                    }
                }
                resolve(true);
            })
            promises.push(promise);
        }

        await Promise.all(promises);
    }

    public async get(id:string): Promise<FormattedResponse> {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM novels WHERE id = ${id}`, (err, row) => {
                if (err) reject(err);
                if (row != undefined) {
                    row.data = JSON.parse(row.data);
                    row.connectors = JSON.parse(row.connectors);
                    resolve(row);
                } else {
                    resolve(null);
                }
            });
        });
    }
}