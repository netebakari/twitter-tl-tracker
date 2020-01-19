import * as assert from "assert";
import * as myModule from "../src/index"
import * as mocha from "mocha";
 
describe("myModule", () => {
  describe("test", () => {
    before(async() => {
 
    });
 
    it("test1", () => {
      assert.equal(1, 1);
    });
  });
});