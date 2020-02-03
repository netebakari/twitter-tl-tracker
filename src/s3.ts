import * as AWS from "aws-sdk";
import * as _ from "lodash";
import moment from "moment";

import * as env from "./env";
import * as Types from "./types";
import * as TweetTypes from "./types/twit";
import * as util from "./util";

const s3 = new AWS.S3({ region: env.s3.region });

/**
 * S3（バケットは環境変数で与えられたもの固定）からテキストデータを取得してタイムスタンプとともに返す。
 * データが見つからなかったとき、stringでもBufferでもないものが返ってきたときはundefinedを返す
 * @param key S3オブジェクトのキー。Bufferを与えたときはUTF-8でエンコードした文字列をそのまま返す（テスト用）
 * @param bucketName テスト用。省略時は環境変数で指定したバケットが利用される
 */
export const getTextContent = async (
  key: string | Buffer,
  bucketName?: string
): Promise<{ body: string; timestamp?: moment.Moment } | undefined> => {
  // テスト用
  if (Buffer.isBuffer(key)) {
    return { body: key.toString("utf-8") };
  }

  bucketName = bucketName ?? env.s3.bucket;
  try {
    let body = "";
    const data = await s3
      .getObject({
        Bucket: bucketName,
        Key: key
      })
      .promise();
    // data.Bodyは実際にはstringかBuffer
    if (typeof data.Body === "string") {
      body = data.Body;
    } else if (Buffer.isBuffer(data.Body)) {
      body = data.Body.toString("utf-8");
    } else {
      console.error(`s3://${bucketName}/${key} may not be text data`);
      return undefined;
    }

    const timestamp = (() => {
      try {
        return moment(data.LastModified);
      } catch (e) {
        return undefined;
      }
    })();

    return { body, timestamp };
  } catch (e) {
    console.error(e);
    console.error(`s3://${bucketName}/${key} not found`);
    return undefined;
  }
};

/**
 * S3（バケットは環境変数で与えられたもの固定）からJSONデータを取得し、パースして返す。
 * データが見つからなかったとき、型チェックに通らなかったときはundefinedを返す
 * @param key S3オブジェクトのキー。Bufferを与えたときはUTF-8でエンコードした文字列をS3から取得したとみなす（テスト用）
 * @param typeGuardFunction
 * @param bucketName テスト用。省略時は環境変数で指定したバケットが利用される
 */
export async function getContent<T>(
  key: string | Buffer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeGuardFunction?: (arg: any) => arg is T,
  bucketName?: string
): Promise<{ data: T; timestamp?: moment.Moment } | undefined> {
  bucketName = bucketName ?? env.s3.bucket;
  const raw = await getTextContent(key, bucketName);
  if (!raw) {
    return undefined;
  }
  let data: any = undefined;
  try {
    data = JSON.parse(raw.body);
  } catch (e) {
    console.error(e);
    console.error(`s3://${bucketName}/${key} is not a json`);
    return undefined;
  }

  if (typeGuardFunction) {
    if (typeGuardFunction(data)) {
      return { data: data, timestamp: raw.timestamp };
    } else {
      console.error(`s3://${bucketName}/${key} did'nt satisfy provided type guard function`);
      return undefined;
    }
  } else {
    return { data: data as T, timestamp: raw.timestamp };
  }
}

/**
 * S3にJSON Linesとして保存されたツイートのリストを読み出してパースする。
 * オブジェクトが見つからなかった場合、パースに失敗した場合は例外をスローする
 * @param key キー
 * @param bucketName バケット名。省略時は環境変数で指定されたもの
 */
export const getTweets = async (key: string, bucketName?: string): Promise<Types.TweetEx[]> => {
  bucketName = bucketName ?? env.s3.bucket;
  const raw = await getTextContent(key, bucketName);
  if (!raw) {
    throw new Error(`s3://${bucketName}/${key} is not found or not text data`);
  }
  const result = raw.body.split("\n").map(x => JSON.parse(x));
  if (Types.isTweetExArray(result)) {
    return result;
  } else {
    throw new Error(`s3://${bucketName}/${key} is not tweet data`);
  }
};

export const putArchivedTweets = async (date: moment.Moment, tweets: Types.TweetEx[]) => {
  date.utcOffset(env.tweetOption.utfOffset);
  const year = date.format("YYYY");
  const yearMonth = date.format("YYYY-MM");
  const yearMonthDate = date.format("YYYY-MM-DD");
  const key = `archive/${year}/${yearMonth}/${yearMonthDate}.json`;
  console.log(`s3://${env.s3.bucket}/${key}を保存します`);
  const content = tweets.map(x => JSON.stringify(x)).join("\n");
  await s3
    .putObject({
      Body: content,
      Bucket: env.s3.bucket,
      Key: key,
      ContentType: "application/json; charset=utf-8"
    })
    .promise();
};

/**
 * 特定のユーザーのツイートを保存する。ツイートは日付ごとにグループ分けして次のキーで保存する。
 * raw/user/YYYY-MM-DD/YYYYMMDD.HHmmss.SSS_9999999999.json
 * （前半の日付はツイートの日付、後半のタムスタンプは現在日時。単に重複しないユニークな値として利用している）
 * @param tweets
 */
export const putUserTweets = async (tweets: Types.TweetEx[]) => {
  for (const chunk of util.groupByDate(tweets)) {
    const content = chunk.tweets.map(x => JSON.stringify(x)).join("\n");
    const now = moment().format("YYYYMMDD.HHmmss.SSS");
    const userId = chunk.tweets[0].user.id_str;
    const keyName = `raw/user/${chunk.date}/${now}_${userId}.json`;
    console.log(`s3://${env.s3.bucket}/${keyName}を保存します`);
    await s3
      .putObject({
        Body: content,
        Bucket: env.s3.bucket,
        Key: keyName,
        ContentType: "application/json; charset=utf-8"
      })
      .promise();
  }
};

/**
 * ホームタイムラインのツイートを保存する。ツイートは日付ごとにグループ分けして次のキーで保存する。
 * raw/home/YYYY-MM-DD/YYYYMMDD.HHmmss.SSS.json
 * @param tweets
 */
export const putTimelineTweets = async (tweets: Types.TweetEx[]) => {
  for (const chunk of util.groupByDate(tweets)) {
    const content = chunk.tweets.map(x => JSON.stringify(x)).join("\n");
    const now = moment().format("YYYYMMDD.HHmmss.SSS");
    const keyName = `raw/home/${chunk.date}/${now}.json`;
    console.log(`s3://${env.s3.bucket}/${keyName}を保存します`);
    await s3
      .putObject({
        Body: content,
        Bucket: env.s3.bucket,
        Key: keyName,
        ContentType: "application/json; charset=utf-8"
      })
      .promise();
  }
};

/**
 * 指定した日付のツイートログの断片のキーを取得
 * @param date
 */
export const getFragments = async (date: moment.Moment) => {
  const dateStr = date.format("YYYY-MM-DD");
  const userTweets = await getAllObjects(`raw/user/${dateStr}/`);
  const homeTweets = await getAllObjects(`raw/home/${dateStr}/`);
  return { userTweets, homeTweets };
};

export const getAllObjects = async (keyPrefix: string) => {
  console.log(`keyPrefix='${keyPrefix}' のオブジェクトを検索します`);
  const firstChunk = await s3
    .listObjectsV2({
      Bucket: env.s3.bucket,
      Prefix: keyPrefix
    })
    .promise();
  if (!firstChunk.Contents) {
    return [];
  }
  const keys = [firstChunk.Contents.map(x => x.Key)];

  // NextContinuationTokenがある限り繰り返し取得
  let continueToken = firstChunk.NextContinuationToken;
  while (continueToken) {
    //console.log(`検索します: continueToken=${continueToken}`);
    const chunk = await s3
      .listObjectsV2({
        Bucket: env.s3.bucket,
        Prefix: keyPrefix,
        ContinuationToken: continueToken
      })
      .promise();
    if (chunk.Contents) {
      keys.push(chunk.Contents.map(x => x.Key));
    }
    continueToken = chunk.NextContinuationToken;
  }

  return _.flatMap(keys).filter(x => x) as string[];
};

/**
 * フォロイー・フォロワーのIDデータを保存する。タイムスタンプ付きのものと latest.json の2つを保存する
 */
export const putFriendAndFollowerIds = async (timestamp: moment.Moment, ids: Types.FriendsAndFollowersIdsType) => {
  await s3
    .putObject({
      Bucket: env.s3.bucket,
      Key: `raw/ff/latest.json`,
      Body: JSON.stringify(ids),
      ContentType: "application/json; charset=utf-8"
    })
    .promise();

  await s3
    .putObject({
      Bucket: env.s3.bucket,
      Key: `raw/ff/FF_${timestamp.format("YYYY-MM-DD_HHmm")}.json`,
      Body: JSON.stringify(ids),
      ContentType: "application/json; charset=utf-8"
    })
    .promise();
};

/**
 * 前回保存したフォロイー・フォロワーのIDデータを取得する。見つからなければundefinedが返される
 */
export const getLatestFriendFollowerIds = async () => {
  return (await getContent("raw/ff/latest.json", Types.isFriendsAndFollowersIdsType))?.data;
};

/**
 * 前回保存したいいねのツイートのIDのリストを取得する。見つからなければnullが返される
 */
export const getLatestFavoriteTweetIds = async () => {
  return getContent<string[]>("raw/event/favorites/latest.json");
};
