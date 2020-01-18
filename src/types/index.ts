import * as twit from "twit";

type RequireOne<T, K extends keyof T = keyof T> =
  K extends keyof T ? PartialRequire<T, K> : never;
type PartialRequire<O, K extends keyof O> = {
    [P in K]-?: O[P]
} & O;

export interface ConfigRecordType {
    Provider: string;
    lastId: string;
    screenNames: string[];
    keywords: string[];
}

/**
 * 特定のユーザーを指定する値。screenNameかidのどちらかが必須。両方が指定された場合はIDが優先される
 */
export type UserType = RequireOne<{
    screenName?: string;
    userId?: string;
}>;

export interface UserOnDb {
    id_str: string;
    screenName: string;
    name: string;
    sinceId: string;
    updatedAt: string;
    TTL: number;
}

/**
 * ツイート取得の戻り値
 */
export interface TweetFetchResult {
    apiCallCount: number;
    tweets: twit.Twitter.Status[];
}

/**
 * フォロイー・フォロワーのIDリスト
 */
export interface FriendsAndFollowersIdsType {
    friendsIds: string[];
    followersIds: string[];
}

export interface FriendsFollowersIdResult {
    ids: string[];
    next_cursor: number;
    next_cursor_str: string;
    previous_cursor: number;
    previous_cursor_str: string;
}

export type TimeLineType = "HomeTL"|"UserTL"|"Favorites";

export type Tweet = twit.Twitter.Status;
export interface TweetEx extends Tweet {
    timestampLocal: string;
    dateLocal: string;
    serverTimestamp: string;
}
export type User = twit.Twitter.User;