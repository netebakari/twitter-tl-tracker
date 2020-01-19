import * as assert from "assert";
import * as myModule from "../src/index"
import * as mocha from "mocha";
import * as Types from "../src/types";
import * as TwitTypes from "../src/types/twit";

describe("type guard functions", () => {
  describe("isUserOnDb", () => {
    it("test1", () => {
      const record = {
        id_str: "1234567",
        name: "HOGEHOGE",
        screenName: "fugafuga",
        sinceId: "1200000000000000000",
        TTL: 1500000000,
        updatedAt: "2020-01-19T20:00:00+09:00"
      };

      assert.equal(Types.isUserOnDb(record), true);
    });

    it("test1 (no ttl)", () => {
      const record = {
        id_str: "TIMELINE",
        name: "*My Timeline*",
        screenName: "*My Timeline*",
        sinceId: "1200000000000000000",
        updatedAt: "2020-01-19T20:00:00+09:00"
      };

      assert.equal(Types.isUserOnDb(record), true);
    });
  });

  describe("isFriendsAndFollowersIdsType", () => {
    it("ok", () => {
      const data: Types.FriendsAndFollowersIdsType = {
        followersIds: ["1", "2"],
        friendsIds: ["3", "4"]
      };
      assert.equal(Types.isFriendsAndFollowersIdsType(data), true);
    });

    it("empty list", () => {
      const data: Types.FriendsAndFollowersIdsType = {
        followersIds: [],
        friendsIds: []
      };
      assert.equal(Types.isFriendsAndFollowersIdsType(data), true);
    });

    it("must have entity", () => {
      const data1 = {
        followersIds: ["1", "2"]
      };
      const data2 = {
        friendsIds: ["1", "2"]
      };
      assert.equal(Types.isFriendsAndFollowersIdsType(data1), false);
      assert.equal(Types.isFriendsAndFollowersIdsType(data2), false);
    })

    it("empty object", () => {
      const data = {};
      assert.equal(Types.isFriendsAndFollowersIdsType(data), false);
    });


    it("includes other than string", () => {
      const data: any = {
        followersIds: ["1", 2],
        friendsIds: []
      };
      assert.equal(Types.isFriendsAndFollowersIdsType(data), false);
    });
  });

  
});