import * as assert from "assert";
import * as fs from "fs";

import * as s3 from "../src/s3";
import * as Types from "../src/types";
import * as ParamTypes from "../src/types/parameters";
import * as util from "../src/util";
import moment = require("moment");
import * as Twitter from "../src/twitterClient";

const loadJson = (filename: string): any => {
  const buffer = fs.readFileSync(`test/fixtures/${filename}`);
  return JSON.parse(buffer.toString("utf-8"));
};

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
        updatedAt: "2020-01-19T20:00:00+09:00",
      };

      try {
        ParamTypes.assertsUserOnDb(record);
      } catch (e) {
        assert.fail("type guards error");
      }
    });

    it("test1 (no ttl)", () => {
      const record = {
        id_str: "TIMELINE",
        name: "*My Timeline*",
        screenName: "*My Timeline*",
        sinceId: "1200000000000000000",
        updatedAt: "2020-01-19T20:00:00+09:00",
      };

      try {
        ParamTypes.assertsUserOnDb(record);
      } catch (e) {
        assert.fail("type guards error");
      }
    });
  });

  describe("isUser", () => {
    it("@twitter", () => {
      const data = loadJson("user1.json");
      try {
        Types.assertUser(data);
      } catch (e) {
        assert.fail(e);
      }
    });
    it("protected user", () => {
      const data = loadJson("user2.json");
      try {
        Types.assertUser(data);
      } catch (e) {
        assert.fail(e);
      }
    });
  });

  describe("isFriendsAndFollowersIdsType", () => {
    it("ok", () => {
      const data: Types.FriendsAndFollowersIdsType = {
        followersIds: ["1", "2"],
        friendsIds: ["3", "4"],
      };
      Types.assertFriendsAndFollowersIdsType(data);
      assert.ok("OK");
    });

    it("empty list", () => {
      const data: Types.FriendsAndFollowersIdsType = {
        followersIds: [],
        friendsIds: [],
      };
      Types.assertFriendsAndFollowersIdsType(data);
      assert.ok("OK");
    });

    it("must have entity", () => {
      const data1 = {
        followersIds: ["1", "2"],
      };
      const data2 = {
        friendsIds: ["1", "2"],
      };
      try {
        Types.assertFriendsAndFollowersIdsType(data1);
        assert.fail("must fail!");
      } catch (e) {}
      try {
        Types.assertFriendsAndFollowersIdsType(data2);
        assert.fail("must fail!");
      } catch (e) {}
    });

    it("empty object", () => {
      const data = {};
      try {
        Types.assertFriendsAndFollowersIdsType(data);
        assert.fail("must fail!");
      } catch (e) {}
    });

    it("includes other than string", () => {
      const data: any = {
        followersIds: ["1", 2],
        friendsIds: [],
      };
      try {
        Types.assertFriendsAndFollowersIdsType(data);
        assert.fail("must fail!");
      } catch (e) {}
    });
  });

  describe("isTweet", () => {
    it("test1", () => {
      const buffer = fs.readFileSync("test/fixtures/tweet1.json");
      const data = JSON.parse(buffer.toString("utf8"));
      assert.equal(Types.isTweet(data), true);
    });

    it("test2", () => {
      const buffer = fs.readFileSync("test/fixtures/tweet2.json");
      const data = JSON.parse(buffer.toString("utf8"));
      assert.equal(Types.isTweet(data), true);
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

describe("Twitter API test (call APIs actually)", () => {
  describe("lookupUsers", () => {
    it("@twitter", async () => {
      const user = await Twitter.lookupUsers(["783214"]);
      assert.equal(user.users.length, 1);
      assert.equal(Types.isUser(user.users[0]), true);
      assert.equal(user.users[0].id_str, "783214");
    });
  });

  describe("get friends / followers", () => {
    it("@twitter followers", async () => {
      const userIds = await Twitter.getFriendsOrFollowersIds({ screenName: "twitter" }, false, 1);
      assert.equal(Array.isArray(userIds), true);
      assert.equal(userIds.length, 5000);
    });

    it("@twitter friends", async () => {
      const userIds = await Twitter.getFriendsOrFollowersIds({ screenName: "twitter" }, true, 1);
      assert.equal(Array.isArray(userIds), true);
      assert.equal(userIds.length > 0, true);
    });
  });
});
