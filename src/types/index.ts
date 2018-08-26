import * as TweetTypes from "./twit"

export declare interface ConfigRecordType {
    Provider: string;
    lastId: string;
    screenNames: string[];
    keywords: string[];
}

export declare interface UserType {
    screenName?: string;
    userId?: string
}

export declare interface UserOnDb {
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
export declare interface TweetFetchResult {
    apiCallCount: number;
    tweets: TweetTypes.Tweet[];
}

/**
 * フォロイー・フォロワーのIDリスト
 */
export declare interface FriendsAndFollowersIdsType {
    friendsIds: string[];
    followersIds: string[];
}
