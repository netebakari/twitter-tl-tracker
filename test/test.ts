import * as assert from "assert";
import * as fs from "fs";
import * as mocha from "mocha";

import * as myModule from "../src/index";
import * as s3 from "../src/s3";
import * as Types from "../src/types";
import * as TwitTypes from "../src/types/twit";
import * as util from "../src/util";
import moment = require("moment");

describe("s3", () => {
  describe("getTextContent", () => {
    it("test method", async () => {
      const str = "Hello, Hello, Happy World!";
      const buffer = Buffer.from(str, "utf-8");
      const data = await s3.getTextContent(buffer, "no-such-bucket-but-ignored");
      assert.equal(data?.body, str);
      assert.equal(data?.timestamp, undefined);
    });
  });

  describe("getContent", () => {
    it("json1", async () => {
      const buffer = fs.readFileSync("test/fixtures/tweet1.json");
      const data = await s3.getContent<Types.TweetEx>(buffer, Types.isTweetEx);
      assert.equal(data?.data.id_str, "1204129214640906241");
      assert.equal(data?.timestamp, undefined);
    });

    it("json2", async () => {
      const buffer = fs.readFileSync("test/fixtures/tweet2.json");
      const data = await s3.getContent<Types.TweetEx>(buffer, Types.isTweetEx);
      assert.equal(data?.data.id_str, "1204129173507362818");
      assert.equal(data?.timestamp, undefined);
    });
  });

  describe("getTweets", () => {
    it("json lines (multiple tweets)", async () => {
      const buffer = fs.readFileSync("test/fixtures/tweets.json");
      const tweets = await s3.getTweets(buffer);
      assert.equal(tweets.length, 2);
      assert.equal(tweets[0].id_str, "1204129214640906241");
      assert.equal(tweets[1].id_str, "1204129173507362818");
    });
  });

  describe("compareSimplifiedS3ObjectByTimestamp", () => {
    it("earlier timestamp comes top", () => {
      const obj1 = { key: "1", lastModified: moment("2020-01-01") };
      const obj2 = { key: "2", lastModified: moment("2020-01-02") };
      const obj3 = { key: "3", lastModified: moment("2020-01-03") };
      const arr = [obj2, obj3, obj1];
      arr.sort(s3.compareSimplifiedS3ObjectByTimestamp);
      assert.equal(arr[0].key, "1");
      assert.equal(arr[1].key, "2");
      assert.equal(arr[2].key, "3");
    });

    it("undefined comes first", () => {
      const obj1 = { key: "1", lastModified: undefined };
      const obj2 = { key: "2", lastModified: moment("2020-01-02") };
      const obj3 = { key: "3", lastModified: moment("2020-01-03") };
      const arr = [obj2, obj3, obj1];
      arr.sort(s3.compareSimplifiedS3ObjectByTimestamp);
      assert.equal(arr[0].key, "1");
      assert.equal(arr[1].key, "2");
      assert.equal(arr[2].key, "3");
    });

    it("undefined comes first #2", () => {
      const arr: { key: string; lastModified?: moment.Moment }[] = [];
      for (let i = 1; i < 30; i++) {
        arr.push({ key: `${i}`, lastModified: moment(`2020-01-01`).add(i, "days") });
      }
      arr.push({ key: `X`, lastModified: undefined });
      arr.sort(s3.compareSimplifiedS3ObjectByTimestamp);
      assert.equal(arr[0].key, "X");
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

describe("util", () => {
  describe("", () => {
    it("test1", () => {
      const date = new Date("2020-02-03T00:01:02+09:00");
      const result = util.dateToMoment(date);
      assert.equal(result?.toDate().getTime(), date.getTime());
    });
    it("test2", () => {
      const result = util.dateToMoment(undefined);
      assert.equal(result, undefined);
    });
  });
});
