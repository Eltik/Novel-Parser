import { FormattedResponse } from "./Core";
import API from "./API";
export default class DB extends API {
    private db;
    constructor();
    init(): Promise<void>;
    private createDatabase;
    insert(data: FormattedResponse[]): Promise<void>;
    get(id: string): Promise<FormattedResponse>;
}
