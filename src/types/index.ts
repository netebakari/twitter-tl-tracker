import { AssertionError } from "assert";

import * as Twitter from "./twitter";
import * as util from "./util";

export type Params = Twitter.Params;

type RequireOne<T, K extends keyof T = keyof T> = K extends keyof T ? PartialRequire<T, K> : never;
type PartialRequire<O, K extends keyof O> = {
  [P in K]-?: O[P];
} &
  O;

/**
 * 特定のユーザーを指定する値。screenNameかidのどちらかで指定する
 */
export type UserParamType = { screenName: string } | { userId: string };

/**
 * 複数のユーザーを指定する値。screenNameかidのどちらかで指定する
 */
export type UsersParamType = { screenNames: string[] } | { userIds: string[] };

/**
 * DBのレコード
 */
export type UserOnDb = {
  id_str: string;
  screenName: string;
  name: string;
  sinceId: string;
  updatedAt: string;
  TTL?: number;
};

export function assertsUserOnDb(arg: any): asserts arg is UserOnDb {
  util.mustBeObject(arg);
  util.mustBeString(arg, "id_str");
  util.mustBeString(arg, "screenName");
  util.mustBeString(arg, "sinceId");
  util.mustBeString(arg, "updatedAt");
  util.mustBeNumber(arg, "ttl", true);
}

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

export function assertFriendsAndFollowersIdsType(arg: any): asserts arg is FriendsAndFollowersIdsType {
  util.mustBeObject(arg);
  util.mustBeArray(arg, "friendsIds");
  if (!arg.friendsIds.every((x: any) => typeof x == "string")) {
    throw new AssertionError({ message: "arg.friendsIds contains non-string value" });
  }
  util.mustBeArray(arg, "followersIds");
  if (!arg.followersIds.every((x: any) => typeof x == "string")) {
    throw new AssertionError({ message: "arg.followersIds contains non-string value" });
  }
}

export function isFriendsAndFollowersIdsType(arg: any): arg is FriendsAndFollowersIdsType {
  try {
    assertFriendsAndFollowersIdsType(arg);
    return true;
  } catch (e) {
    return false;
  }
}

export interface FriendsFollowersIdResult {
  ids: string[];
  next_cursor: number;
  next_cursor_str: string;
  previous_cursor: number;
  previous_cursor_str: string;
}

export type TimeLineType = "HomeTL" | "UserTL" | "Favorites";

export type Tweet = Twitter.Status;

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
  timestampLocal: string;
  /**
   * ツイートのタイムスタンプ（日本時間）。YYYY-MM-DD形式（タイムゾーンの情報はなくなる）
   */
  dateLocal: string;
  serverTimestamp: string;
}

export type User = Twitter.User;

export function assertUser(arg: any): asserts arg is User {
  util.mustBeObject(arg);
  util.mustBeString(arg, "created_at");
  util.mustBeString(arg, "default_profile");
  util.mustBeString(arg, "default_profile_image");
  util.mustBeString(arg, "description");
  util.mustBeString(arg, "favourites_count");
  util.mustBeNumber(arg, "id");
  util.mustBeString(arg, "id_str");
}

/**
 * 手抜き
 * @param arg
 */
export const isTweet = (arg: any): arg is Twitter.Status => {
  if (!arg) {
    return false;
  }
  if (typeof arg !== "object") {
    return false;
  }
  if (typeof arg.id !== "number") {
    return false;
  }
  if (typeof arg.id_str !== "string") {
    return false;
  }

  return true;
};

export const isTweets = (arg: any): arg is Twitter.Status[] => {
  if (!Array.isArray(arg)) {
    return false;
  }
  return arg.every((x) => isTweet(x));
};

/**
 * 手抜き
 * @param arg
 */
export const isUser = (arg: any): arg is Twitter.User => {
  if (!arg) {
    return false;
  }
  if (typeof arg !== "object") {
    return false;
  }
  if (typeof arg.id !== "number") {
    return false;
  }
  if (typeof arg.id_str !== "string") {
    return false;
  }
  if (typeof arg.name !== "string") {
    return false;
  }

  return true;
};

export const isUsers = (arg: any): arg is Twitter.User[] => {
  if (!Array.isArray(arg)) {
    return false;
  }
  return arg.every((x) => isUser(x));
};

export type FriendsOrFollowersIdResultType = {
  ids: string[];
  next_cursor: number;
  next_cursor_str: string;
  previous_cursor: number;
  previous_cursor_str: string;
  total_count: null | number;
};

export function assertsFriendsOrFollowersIdResultType(arg: any): asserts arg is FriendsOrFollowersIdResultType {
  util.mustBeObject(arg);
  util.mustBeArray(arg, "ids");
  if (arg.ids.some((x: any) => typeof x !== "string")) {
    throw new AssertionError({ message: "arg.ids contains non-string value", actual: arg.ids });
  }
  util.mustBeNumber(arg, "next_cursor");
  util.mustBeString(arg, "next_cursor_str");
  util.mustBeNumber(arg, "previous_cursor");
  util.mustBeString(arg, "previous_cursor_str");
  if (arg.total_count !== null && typeof arg.total_count !== "number") {
    throw new AssertionError({ message: "arg.total_count is neighter null nor a number", actual: arg.total_count });
  }
}

export function isFriendsOrFollowersIdResultType(arg: any): arg is FriendsOrFollowersIdResultType {
  try {
    assertsFriendsOrFollowersIdResultType(arg);
    return true;
  } catch (e) {
    return false;
  }
}
