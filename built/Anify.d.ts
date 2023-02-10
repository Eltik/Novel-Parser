import Provider from "./Provider";
import { Result } from "./Core";
export default class Anify extends Provider {
    private api;
    constructor();
    search(query: string): Promise<Array<Result>>;
}
