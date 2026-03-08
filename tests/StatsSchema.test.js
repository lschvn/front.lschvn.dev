import { PlayerStatsSchema } from "../src/core/StatsSchemas";
function testPlayerSchema(json, expectSuccess = true, expectThrow = false) {
    const parse = () => {
        const raw = JSON.parse(json);
        const result = PlayerStatsSchema.safeParse(raw);
        return result.success;
    };
    if (expectSuccess) {
        // Expect success
        expect(parse()).toBeTruthy();
    }
    else if (!expectThrow) {
        // Expect failure
        expect(parse()).toBeFalsy();
    }
    else {
        // Expect throw
        expect(parse).toThrow();
    }
}
describe("StatsSchema", () => {
    test("Parse empty", () => {
        testPlayerSchema("{}");
    });
    test("Parse partial", () => {
        testPlayerSchema('{"units":{"port":["0","0","0","1"]}}');
    });
    test("Parse invalid", () => {
        testPlayerSchema("[]", false);
        testPlayerSchema("null", false);
        testPlayerSchema('"null"', false);
        testPlayerSchema('"undefined"', false);
    });
    test("Parse failure", () => {
        testPlayerSchema("", false, true);
        testPlayerSchema("undefined", false, true);
        testPlayerSchema("{", false, true);
        testPlayerSchema("{}}", false, true);
    });
});
//# sourceMappingURL=StatsSchema.test.js.map