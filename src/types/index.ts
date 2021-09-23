import { AssertionError } from "assert";

import * as Twitter from "./twitter";
import * as util from "./util";

export type Params = Twitter.Params;

/**
 * ツイート取得の戻り値
 */
export interface TweetFetchResult {
  apiCallCount: number;
  tweets: Twitter.Status[];
}

/**
 * フォロイー・フォロワーのIDリスト
 */
export interface FriendsAndFollowersIdsType {
  friendsIds: string[];
  followersIds: string[];
}

export function assertFriendsAndFollowersIdsType(
  arg: any
): asserts arg is FriendsAndFollowersIdsType {
  util.mustBeObject(arg);
  util.mustBeArray(arg, "friendsIds");
  if (!arg.friendsIds.every((x: any) => typeof x == "string")) {
    throw new AssertionError({
      message: "arg.friendsIds contains non-string value",
    });
  }
  util.mustBeArray(arg, "followersIds");
  if (!arg.followersIds.every((x: any) => typeof x == "string")) {
    throw new AssertionError({
      message: "arg.followersIds contains non-string value",
    });
  }
}

export function isFriendsAndFollowersIdsType(
  arg: any
): arg is FriendsAndFollowersIdsType {
  try {
    assertFriendsAndFollowersIdsType(arg);
    return true;
  } catch (e) {
    return false;
  }
}

export type TimeLineType = "HomeTL" | "UserTL" | "Favorites";

export type Tweet = Twitter.Status;

export function assertTweet(arg: any): asserts arg is Tweet {
  util.mustBeObject(arg);
  util.mustBeString(arg, "created_at");
  util.mustBeNumber(arg, "id");
  util.mustBeString(arg, "id_str");
  util.mustBeString(arg, "full_text");
  util.mustBeBoolean(arg, "truncated");
  // TODO: 手抜き
}

export const isTweet = (arg: any): arg is Twitter.Status => {
  try {
    assertTweet(arg);
    return true;
  } catch (e) {
    return false;
  }
};

export const isTweets = (arg: any): arg is Twitter.Status[] => {
  if (!Array.isArray(arg)) {
    return false;
  }
  return arg.every((x) => isTweet(x));
};

export const isTweetExArray = (arg: any): arg is TweetEx[] => {
  if (!Array.isArray(arg)) {
    return false;
  }
  return arg.every((x) => isTweetEx(x));
};

export const isTweetEx = (arg: any): arg is TweetEx => {
  const _arg = arg;
  if (!isTweet(_arg)) {
    return false;
  }
  if (typeof arg.timestampLocal !== "string") {
    return false;
  }
  if (typeof arg.dateLocal !== "string") {
    return false;
  }
  if (typeof arg.serverTimestamp !== "string") {
    return false;
  }
  return true;
};

export interface TweetEx extends Tweet {
  /**
   * ツイートのタイムスタンプ（指定されたタイムゾーン）。ISO 8601形式
   */
  timestampLocal: string;
  /**
   * ツイートのタイムスタンプ（指定されたタイムゾーン）。YYYY-MM-DD形式（タイムゾーンの情報はなくなる）
   */
  dateLocal: string;
  /**
   * ツイートの取得日時をISO 8601形式で（指定されたタイムゾーン）
   */
  serverTimestamp: string;
}

export type User = Twitter.User;

export function assertUser(arg: any): asserts arg is User {
  util.mustBeObject(arg);
  util.mustBeNumber(arg, "id");
  util.mustBeString(arg, "id_str");
  util.mustBeString(arg, "name");
  util.mustBeString(arg, "screen_name");
  util.mustBeString(arg, "location");
  util.mustBeString(arg, "description");
  if (arg.url !== null && typeof arg.url !== "string") {
    throw new AssertionError({
      message: "arg.url neigther null nor string",
      actual: arg.url,
    });
  }
  util.mustBeBoolean(arg, "protected");

  util.mustBeString(arg, "created_at");
  util.mustBeBoolean(arg, "default_profile");
  util.mustBeBoolean(arg, "default_profile_image");
  util.mustBeNumber(arg, "favourites_count");
}

export function isUser(arg: any): arg is Twitter.User {
  try {
    assertUser(arg);
    return true;
  } catch (e) {
    return false;
  }
}

export const isUsers = (arg: any): arg is Twitter.User[] => {
  if (!Array.isArray(arg)) {
    return false;
  }
  return arg.every((x) => isUser(x));
};

/**
 * friends/ids, followers/ids APIの戻り値の形
 */
export type FriendsOrFollowersIdResultType = {
  ids: string[];
  next_cursor: number;
  next_cursor_str: string;
  previous_cursor: number;
  previous_cursor_str: string;
  total_count: null | number;
};

export function assertsFriendsOrFollowersIdResultType(
  arg: any
): asserts arg is FriendsOrFollowersIdResultType {
  util.mustBeObject(arg);
  util.mustBeArray(arg, "ids");
  if (arg.ids.some((x: any) => typeof x !== "string")) {
    throw new AssertionError({
      message: "arg.ids contains non-string value",
      actual: arg.ids,
    });
  }
  util.mustBeNumber(arg, "next_cursor");
  util.mustBeString(arg, "next_cursor_str");
  util.mustBeNumber(arg, "previous_cursor");
  util.mustBeString(arg, "previous_cursor_str");
  if (arg.total_count !== null && typeof arg.total_count !== "number") {
    throw new AssertionError({
      message: "arg.total_count is neighter null nor a number",
      actual: arg.total_count,
    });
  }
}

export function isFriendsOrFollowersIdResultType(
  arg: any
): arg is FriendsOrFollowersIdResultType {
  try {
    assertsFriendsOrFollowersIdResultType(arg);
    return true;
  } catch (e) {
    return false;
  }
}

export interface TwitterErrorObject {
  request: string;
  error: string;
}
export function assertsTwitterErrorObject(
  arg: any
): asserts arg is TwitterErrorObject {
  util.mustBeObject(arg);
  util.mustBeString(arg, "request");
  util.mustBeString(arg, "error");
}
export function isTwitterErrorObject(arg: any): arg is TwitterErrorObject {
  try {
    assertsTwitterErrorObject(arg);
    return true;
  } catch (e) {
    return false;
  }
}

type SingleNumberWithoutZero =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9";
type SingleNumber = SingleNumberWithoutZero | "0";
export type DateType = {
  year: `20${SingleNumber}${SingleNumber}`;
  month: `0${SingleNumberWithoutZero}` | "10" | "11" | "12";
  day:
    | `0${SingleNumberWithoutZero}`
    | `1${SingleNumber}`
    | `2${SingleNumber}`
    | "30"
    | "31";
};
