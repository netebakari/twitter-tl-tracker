/* eslint-disable @typescript-eslint/camelcase */
import * as _ from "lodash"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
dayjs.extend(utc)
import Twitter from "twitter-lite"
import * as env from "./env"
import * as token from "./twitterToken"
import * as Types from "./types"
import * as ParamTypes from "./types/parameters"
import * as TwitterTypes from "./types/twitter"
import * as util from "./util"

const client = new Twitter(token.twitterToken);

/**
 * application/rate_limit_status のキャッシュ
 */
let apiStatusCache: TwitterTypes.ApiRateLimitStatusMap | undefined = undefined;

/**
 * API残り実行可能回数を取得する
 */
export const getApiRemainingCount = async (apiName: TwitterTypes.ApiName): Promise<number> => {
  if (!apiStatusCache) {
    apiStatusCache = {};
    const data = await client.get("application/rate_limit_status");
    TwitterTypes.assertsApiRateLimitStatus(data);
    // todo: なんとかする
    const _data: any = data.resources;
    for (const apiCategoryName of Object.keys(_data)) {
      const map = _data[apiCategoryName];
      for (const apiName of Object.keys(map)) {
        apiStatusCache[apiName] = (map[apiName] as any).remaining as number;
      }
    }
  }
  return apiStatusCache[apiName] ?? -1;
};

/**
 * users/lookup を叩いてユーザー情報を取得する
 * @param userIds ユーザーIDの配列。100件ごとにまとめてAPIがコールされる
 */
export const lookupUsers = async (userIds: string[]): Promise<{ apiCallCount: number; users: Types.User[] }> => {
  const doPost = async (params: Types.Params): Promise<Types.User[]> => {
    const data = await client.post("users/lookup", params);
    if (Types.isUsers(data)) {
      return data;
    } else {
      console.error(data);
      throw new Error("取得した値の形が変です");
    }
  };

  let apiCallCount = 0;
  const chunks = [];
  for (let i = 0; i < userIds.length; i += 100) {
    const userIdsPart = userIds.slice(i, i + 100);
    const params = {
      user_id: userIdsPart.join(","),
      include_entities: true,
      tweet_mode: "extended",
    };
    apiCallCount++;
    chunks.push(await doPost(params));
  }

  return { apiCallCount, users: _.flatten(chunks) };
};

export const lookupUserByScreenName = async (screenName: string): Promise<Types.User> => {
  const params = {
    screen_name: screenName,
    include_entities: true,
    tweet_mode: "extended",
  };
  const data = await client.post("users/lookup", params);
  console.log(JSON.stringify(data));
  Types.assertUser(data);
  return data;
};

/**
 * あるユーザーのフォロワーまたはフォロイーのIDを取得する
 * @param user ユーザー
 * @param friendsOrFollowers trueならフォロイー（フォローしている人）を、falseならフォロワーを取得する
 */
export const getFriendsOrFollowersIds = async (
  user: ParamTypes.UserParamType,
  friendsOrFollowers: boolean,
  maxApiCallCount = 100
): Promise<string[]> => {
  const result: string[][] = [];
  let chunk = await _getFriendsOrFollowersId(user, friendsOrFollowers);
  result.push(chunk.ids);
  let apiCallCount = 1;
  while (apiCallCount++ < maxApiCallCount && chunk.nextCursor) {
    chunk = await _getFriendsOrFollowersId(user, friendsOrFollowers, chunk.nextCursor);
    result.push(chunk.ids);
  }
  return _.flatten(result);
};

const _getFriendsOrFollowersId = async (
  user: ParamTypes.UserParamType,
  friendsOrFollowers: boolean,
  cursor: string | null = null
): Promise<{ ids: string[]; nextCursor?: string }> => {
  const params: TwitterTypes.Params = { stringify_ids: true, count: 5000 };
  if (cursor) {
    params.cursor = cursor;
  }
  if ("userId" in user) {
    params.user_id = user.userId;
  } else {
    params.screen_name = user.screenName;
  }

  const endpoint = friendsOrFollowers ? "friends/ids" : "followers/ids";
  const result = await client.get(endpoint, params);
  Types.assertsFriendsOrFollowersIdResultType(result);
  if (result.next_cursor === 0) {
    return { ids: result.ids };
  }
  return { ids: result.ids, nextCursor: result.next_cursor_str };
};

/**
 * 対象のユーザーのlikeを最大3200件取得する。
 * @param user ユーザー
 */
export const getFavorites = async (
  user: ParamTypes.UserParamType
): Promise<{ apiCallCount: number; tweets: Types.Tweet[] }> => {
  const firstChunk = await getTweets("Favorites", user, { sinceId: "100" });
  if (firstChunk.length < 180) {
    return { apiCallCount: 1, tweets: firstChunk };
  }
  let minimumId = util.getMinimumId(firstChunk);

  const chunks: Types.Tweet[][] = [firstChunk];
  let apiCallCount = 1;
  for (let i = 0; i < 15; i++) {
    const chunk = await getTweets("Favorites", user, { maxId: minimumId });
    apiCallCount++;
    chunks.push(chunk);
    if (chunk.length === 0) {
      break;
    }
    const newMinimumId = util.getMinimumId(chunk);
    // IDの最小値が更新できなかったら終わり
    if (minimumId === newMinimumId) {
      break;
    }
    minimumId = newMinimumId;
  }

  const tweets = _.flatten(chunks);
  return { apiCallCount, tweets };
};

/**
 * 対象のユーザーまたはホームタイムラインから直近のツイートを最大3200件（ホームタイムラインの場合は800件）取得する。
 * @param user ユーザー。nullを指定するとホームタイムライン
 * @param sinceId これ以降
 */
export const getRecentTweets = async (
  user: ParamTypes.UserParamType | null,
  sinceId: string
): Promise<{ apiCallCount: number; tweets: Types.TweetEx[] }> => {
  try {
    const timelieType: Types.TimeLineType = user === null ? "HomeTL" : "UserTL";
    const firstChunk = await getTweets(timelieType, user, { sinceId: sinceId });
    if (firstChunk.length < 180) {
      return { apiCallCount: 1, tweets: firstChunk };
    }
    let minimumId = util.getMinimumId(firstChunk);

    const maxloopCount = user ? 15 : 3; // ホームタイムラインは最大800件まで。最初に1回取ったから3回ループする
    const chunks: Types.TweetEx[][] = [firstChunk];
    let apiCallCount = 1;
    for (let i = 0; i < maxloopCount; i++) {
      const chunk = await getTweets(timelieType, user, { maxId: minimumId });
      apiCallCount++;
      chunks.push(chunk);
      if (chunk.length === 0) {
        break;
      }
      const newMinimumId = util.getMinimumId(chunk);
      // IDの最小値が更新できなかったか、IDの最小値が最初に与えたsinceIdと同等以下になったら終わり
      if (minimumId === newMinimumId || util.compareNumber(sinceId, newMinimumId) >= 0) {
        break;
      }
      minimumId = newMinimumId;
    }

    const tweets = _.flatten(chunks).filter((x) => util.compareNumber(x.id_str, sinceId) >= 0);
    return {
      apiCallCount,
      tweets,
    };
  } catch (e) {
    console.error(e);
    throw e;
  }
};

/**
 * 対象のユーザー、ホームタイムライン、いいねから直近のツイートを最大200件取得する。パラメーターチェックは *しない* ので注意
 * @param timelineType 取得するタイムラインのタイプ
 * @param user_id ユーザー。timelineTypeでHomeTimelineを選んだときは無視される
 * @param condition sinceId, maxIdのいずれかを指定する。両方省略した場合は直近の200件が返される
 */
export const getTweets = async (
  timelineType: Types.TimeLineType,
  user: ParamTypes.UserParamType | null,
  condition: { sinceId?: string; maxId?: string }
): Promise<Types.TweetEx[]> => {
  const params: Types.Params = {
    count: 200,
    include_rts: true,
    exclude_replies: false,
    tweet_mode: "extended",
  };
  if (condition.sinceId) {
    params.since_id = condition.sinceId;
  }
  if (condition.maxId) {
    params.max_id = condition.maxId;
  }
  if (timelineType !== "HomeTL") {
    // ホームタイムライン以外の場合、userは非nullでないとエラー
    if (user === null) {
      throw new Error("UserTL and Favorits need user info");
    }
    if ("userId" in user) {
      params.user_id = user.userId;
    } else {
      params.screen_name = user.screenName;
    }
  }
  let endpoint = "";
  switch (timelineType) {
    case "HomeTL":
      endpoint = "statuses/home_timeline";
      break;
    case "UserTL":
      endpoint = "statuses/user_timeline";
      break;
    case "Favorites":
      endpoint = "favorites/list";
      break;
  }
  console.log(`TwitterClient#getTweets(): endpoint=${endpoint}, parameter=${JSON.stringify(params)}`);

  const result = await client.get(endpoint, params);
  if (Types.isTweets(result)) {
    return alterTweet(result);
  } else {
    console.error(result);
    throw new Error("戻り値が変です");
  }
};

/**
 * ツイートを少し加工する。
 * 1. timestampLocal（"2018-08-11T12:34:45+0900"形式）を追加
 * 2. dateLocal("2018-08-11"形式)を追加
 * 3. serverTimestamp（"2018-08-11T12:34:45+0900"形式）を追加。これは取得日時
 * @param tweet
 */
const alterTweet = (tweets: Types.Tweet[], serverTimestamp?: string): Types.TweetEx[] => {
  const _serverTimestamp = serverTimestamp || util.getCurrentTime();
  return tweets.map((tweet) => {
    const timestamp = dayjs(tweet.created_at).utcOffset(env.tweetOption.utcOffset);
    return {
      ...tweet,
      timestampLocal: timestamp.format(),
      dateLocal: timestamp.format("YYYY-MM-DD"),
      serverTimestamp: _serverTimestamp,
    };
  });
};

export const toTsv = (tweet: Types.TweetEx): string => {
  return [
    dayjs(tweet.timestampLocal).format("YYYY-MM-DD HH:mm:ss"),
    tweet.id_str,
    "@" + tweet.user.screen_name,
    tweet.user.name?.replace(/[\r\n\t]+/g, " "),
    normalizeRetweet(tweet).replace(/[\r\n\t]+/g, " ")
  ].join("\t");
}

export const normalizeRetweet = (tweet: Types.Tweet): string => {
  // RTならRTされたツイートの方で処理を行う
  if (tweet.retweeted_status) {
    const fullText = normalizeRetweet(tweet.retweeted_status);
    // 先頭に「RT @someone: 」を追加して返す
    return `RT @${tweet.retweeted_status.user.screen_name}: ${fullText}`;
  }

  // QTなら末尾に「QT @someone: ...」を追加して返す
  if (tweet.quoted_status && tweet.quoted_status_permalink) {
    const quotedFullText = normalizeRetweet(tweet.quoted_status);
    let fullText = expandShortUrls(tweet);
    fullText = fullText.replace(tweet.quoted_status_permalink.expanded, "").trimEnd();
    return  `${fullText} QT @${tweet.quoted_status.user.screen_name}: ${quotedFullText}`;
  }

  // 通常のツイートなら普通に返す
  return expandShortUrls(tweet);
}

/**
 * t.coで短縮されたURLを元に戻す
 * @param tweet 
 * @returns 
 */
export const expandShortUrls = (tweet: Types.Tweet): string => {
  let result = tweet.full_text ?? "";
  if (Array.isArray(tweet.entities.urls) && tweet.entities.urls.length > 0) {
    tweet.entities.urls.forEach(x => {
      result = result.replace(x.url, x.expanded_url);
    });
  }
  if (Array.isArray(tweet.entities.media) && tweet.entities.media.length > 0) {
      tweet.entities.media.forEach(x => {
      result = result.replace(x.url, x.expanded_url);
    });
  }
  
  return result.replace(/[\r\n\t]+/g, " ");
}

/**
 * ツイートを送信する。インスタンス生成時に dryRun = true を指定していたら console.log で出力するだけ
 * @param text
 */
const sendTweet = async (text: string) => {
  console.log(`ツイートを送信します: ${text}`);
  return client.post("statuses/update", { status: text });
};
