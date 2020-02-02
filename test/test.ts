import * as assert from "assert";
import * as fs from "fs";
import * as mocha from "mocha";

import * as myModule from "../src/index";
import * as s3 from "../src/s3";
import * as Types from "../src/types";
import * as TwitTypes from "../src/types/twit";

describe("s3", () => {
  describe("getTextContent", () => {
    it("plain text", async () => {
      const data = await s3.getTextContent("test/hello.txt", "netebakari");
      assert.equal(data?.body, "Hello, Happy World!");
      assert.equal(data?.timestamp?.format(), "2020-02-02T11:19:12+00:00");
    });
  });

  describe("getContent", () => {
    it("json1 (sigle tweet)", async () => {
      const data = await s3.getContent<Types.TweetEx>(
        "test/tweet1.json",
        Types.isTweetEx,
        "netebakari"
      );
      assert.equal(data?.data.id_str, "1204129214640906241");
      assert.equal(data?.timestamp?.format(), "2020-02-02T11:17:44+00:00");
    });

    it("json2 (sigle tweet)", async () => {
      const data = await s3.getContent<Types.TweetEx>(
        "test/tweet2.json",
        Types.isTweetEx,
        "netebakari"
      );
      assert.equal(data?.data.id_str, "1204129173507362818");
      assert.equal(data?.timestamp?.format(), "2020-02-02T11:17:44+00:00");
    });
  });

  describe("getTweets", () => {
    it("json lines (multiple tweets)", async () => {
      const tweets = await s3.getTweets("test/tweets.json", "netebakari");
      assert.equal(tweets.length, 2);
      assert.equal(tweets[0].id_str, "1204129214640906241");
      assert.equal(tweets[1].id_str, "1204129173507362818");
    });
  });
});

describe("type guards", () => {
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
    });

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

  describe("isTweet", () => {
    it("test1", () => {
      const buffer = fs.readFileSync("test/fixtures/tweet1.json");
      const data = JSON.parse(buffer.toString("utf8"));
      assert.equal(TwitTypes.isTweet(data), true);
    });

    it("test2", () => {
      const buffer = fs.readFileSync("test/fixtures/tweet2.json");
      const data = JSON.parse(buffer.toString("utf8"));
      assert.equal(TwitTypes.isTweet(data), true);
    });
  });
});
