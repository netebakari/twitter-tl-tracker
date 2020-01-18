import * as TweetTypes from "./twit"

export interface ConfigRecordType {
    Provider: string;
    lastId: string;
    screenNames: string[];
    keywords: string[];
}

export interface UserType {
    screenName?: string;
    userId?: string
}

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
    tweets: TweetTypes.Tweet[];
}

/**
 * フォロイー・フォロワーのIDリスト
 */
export interface FriendsAndFollowersIdsType {
    friendsIds: string[];
    followersIds: string[];
}
