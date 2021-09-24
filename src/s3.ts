import * as AWS from "aws-sdk";
import * as fs from "fs";
import * as _ from "lodash";
import dayjs from "dayjs";
dayjs.extend(require("dayjs/plugin/utc"));
import * as env from "./env";
import * as Types from "./types";
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
): Promise<{ body: string; timestamp?: dayjs.Dayjs } | undefined> => {
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
        Key: key,
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
        return dayjs(data.LastModified);
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
): Promise<{ data: T; timestamp?: dayjs.Dayjs } | undefined> {
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
      console.error(
        `s3://${bucketName}/${key} did'nt satisfy provided type guard function`
      );
      return undefined;
    }
  } else {
    return { data: data as T, timestamp: raw.timestamp };
  }
}

/**
 * S3にJSON Linesとして保存されたツイートのリストを読み出してパースする。
 * オブジェクトが見つからなかった場合、パースに失敗した場合は例外をスローする
 * @param key S3オブジェクトのキー。Bufferを与えたときはUTF-8でエンコードした文字列をS3から取得したとみなす（テスト用）
 * @param bucketName テスト用。省略時は環境変数で指定したバケットが利用される
 */
export const getTweets = async (
  key: string | Buffer,
  bucketName?: string
): Promise<Types.TweetEx[]> => {
  bucketName = bucketName ?? env.s3.bucket;
  const raw = await getTextContent(key, bucketName);
  if (!raw) {
    throw new Error(`s3://${bucketName}/${key} is not found or not text data`);
  }
  const result = raw.body.split("\n").map((x) => JSON.parse(x));
  if (Types.isTweetExArray(result)) {
    return result;
  } else {
    throw new Error(`s3://${bucketName}/${key} is not tweet data`);
  }
};

export const putArchivedTweets = async (
  date: Types.DateType,
  tweets: Types.TweetEx[],
  objects: string[]
) => {
  const year = date.year;
  const yearMonth = `${date.year}-${date.month}`;
  const yearMonthDate = `${date.year}-${date.month}-${date.day}`;
  const key = `archive/${year}/${yearMonth}/${yearMonthDate}.json`;
  console.log(`s3://${env.s3.bucket}/${key}を保存します`);
  const content = tweets.map((x) => JSON.stringify(x)).join("\n");
  await s3
    .putObject({
      Body: content,
      Bucket: env.s3.bucket,
      Key: key,
      ContentType: "application/json; charset=utf-8",
    })
    .promise();

  console.log(`s3://${env.s3.bucket}/${key}を保存しました`);

  await s3
    .putObject({
      Body: objects.join("\n"),
      Bucket: env.s3.bucket,
      Key: key.replace("json", "txt"),
      ContentType: "text/plain; charset=utf-8",
    })
    .promise();
};

/**
 * ユーザーTLのツイートを保存する。ツイートは日付ごとにグループ分けして次のキーで保存する。
 * raw/user/YYYY-MM-DD/YYYYMMDD.HHmmss.SSS_9999999999.json
 * （前半の日付はツイートの日付、後半のタムスタンプは現在日時。単に重複しないユニークな値として利用している）
 * 1個のオブジェクトには複数人のツイートが入る。
 * @param tweets
 */
export const putUserTweets = async (tweets: Types.TweetEx[]) => {
  for (const chunk of util.groupByDate(tweets)) {
    const content = chunk.tweets.map((x) => JSON.stringify(x)).join("\n");
    // const now = moment().utcOffset(env.tweetOption.utcOffset).format("YYYYMMDD.HHmmss.SSS");
    const now = dayjs()
      .utcOffset(env.tweetOption.utcOffset)
      .format("YYYYMMDD.HHmmss.SSS");
    const keyName = `raw/user/${chunk.date}/${now}.json`;
    console.log(`s3://${env.s3.bucket}/${keyName}を保存します`);
    await s3
      .putObject({
        Body: content,
        Bucket: env.s3.bucket,
        Key: keyName,
        ContentType: "application/json; charset=utf-8",
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
    const content = chunk.tweets.map((x) => JSON.stringify(x)).join("\n");
    // const now = moment().utcOffset(env.tweetOption.utcOffset).format("YYYYMMDD.HHmmss.SSS");
    const now = dayjs()
      .utcOffset(env.tweetOption.utcOffset)
      .format("YYYYMMDD.HHmmss.SSS");
    const keyName = `raw/home/${chunk.date}/${now}.json`;
    console.log(`s3://${env.s3.bucket}/${keyName}を保存します`);
    await s3
      .putObject({
        Body: content,
        Bucket: env.s3.bucket,
        Key: keyName,
        ContentType: "application/json; charset=utf-8",
      })
      .promise();
  }
};

/**
 * 指定した日付のツイートログの断片のキーとタイムスタンプを取得
 * @param date
 */
export const getFragments = async (date: Types.DateType) => {
  const userTweets = await listAllObjects(
    `raw/user/${date.year}-${date.month}-${date.day}/`
  );
  const homeTweets = await listAllObjects(
    `raw/home/${date.year}-${date.month}-${date.day}/`
  );
  return { userTweets, homeTweets };
};

type SimplifiedS3Object = {
  key: string;
  lastModified?: dayjs.Dayjs;
};

/**
 *
 * @param keyPrefix
 */
export const listAllObjects = async (
  keyPrefix: string,
  bucketName?: string
): Promise<SimplifiedS3Object[]> => {
  bucketName = bucketName ?? env.s3.bucket;
  console.log(`'s3://${bucketName}/${keyPrefix}*' のオブジェクトを検索します`);
  const firstChunk = await s3
    .listObjectsV2({ Bucket: env.s3.bucket, Prefix: keyPrefix })
    .promise();
  if (!firstChunk.Contents) {
    return [];
  }

  const simplify = (obj: AWS.S3.Object): SimplifiedS3Object => {
    return { key: obj.Key ?? "", lastModified: dayjs(obj.LastModified) };
  };

  const result: SimplifiedS3Object[][] = [
    firstChunk.Contents.map((x) => simplify(x)),
  ];

  // NextContinuationTokenがある限り繰り返し取得
  let continueToken = firstChunk.NextContinuationToken;
  while (continueToken) {
    //console.log(`検索します: continueToken=${continueToken}`);
    const chunk = await s3
      .listObjectsV2({
        Bucket: env.s3.bucket,
        Prefix: keyPrefix,
        ContinuationToken: continueToken,
      })
      .promise();
    if (chunk.Contents) {
      result.push(chunk.Contents.map((x) => simplify(x)));
    }
    continueToken = chunk.NextContinuationToken;
  }

  return _.flatMap(result);
};

/**
 * フォロイー・フォロワーのIDデータを保存する。タイムスタンプ付きのものと latest.json の2つを保存する
 */
export const putFriendAndFollowerIds = async (
  timestamp: dayjs.Dayjs,
  ids: Types.FriendsAndFollowersIdsType
) => {
  await s3
    .putObject({
      Bucket: env.s3.bucket,
      Key: `raw/ff/latest.json`,
      Body: JSON.stringify(ids),
      ContentType: "application/json; charset=utf-8",
    })
    .promise();

  await s3
    .putObject({
      Bucket: env.s3.bucket,
      Key: `raw/ff/FF_${timestamp.format("YYYY-MM-DD_HHmm")}.json`,
      Body: JSON.stringify(ids),
      ContentType: "application/json; charset=utf-8",
    })
    .promise();
};

/**
 * 前回保存したフォロイー・フォロワーのIDデータを取得する。見つからなければundefinedが返される
 */
export const getLatestFriendFollowerIds = async () => {
  return (
    await getContent("raw/ff/latest.json", Types.isFriendsAndFollowersIdsType)
  )?.data;
};

/**
 * 前回保存したいいねのツイートのIDのリストを取得する。見つからなければnullが返される
 */
export const getLatestFavoriteTweetIds = async () => {
  return getContent<string[]>("raw/event/favorites/latest.json");
};

export const mergeTweetFragments = (
  homeTL: SimplifiedS3Object[],
  userTL: SimplifiedS3Object[]
) => {
  homeTL.sort(compareSimplifiedS3ObjectByTimestamp);
  userTL.sort(compareSimplifiedS3ObjectByTimestamp);
};

/**
 * S3のオブジェクトをタイムスタンプの昇順でソートする
 * @param obj1
 * @param obj2
 */
export const compareSimplifiedS3ObjectByTimestamp = (
  obj1: SimplifiedS3Object,
  obj2: SimplifiedS3Object
) => {
  // どちらのタイムスタンプもundefinedなら0
  if (obj1.lastModified === undefined && obj2.lastModified === undefined) {
    return 0;
  }

  // undefinedは先頭に
  if (obj1.lastModified === undefined) {
    return -1;
  }
  if (obj2.lastModified === undefined) {
    return 1;
  }

  return obj1.lastModified.diff(obj2.lastModified);
};

/**
 * 指定された日のログをマージして1個のJSONにする。この処理に限ってはS3へのアクセス権限だけあればいい
 * @param date
 * @param localPath 省略可。S3ではなくローカルに出力する際のパスを指定する。パス区切り文字で終わること
 */
export const archive = async (date: Types.DateType, localPath?: string) => {
  console.log(`${date.year}-${date.month}-${date.day}のログを処理します`);
  const keys = await getFragments(date);
  const allTweets: Types.TweetEx[] = [];
  const ids: string[] = [];
  console.log(
    `ホームTLが${keys.homeTweets.length}件、ユーザーTLが${keys.userTweets.length}件見つかりました`
  );
  console.log("ホームTLのマージを行います");
  for (const item of keys.homeTweets) {
    const tweets = await getTweets(item.key);
    for (const tweet of tweets) {
      if (ids.indexOf(tweet.id_str) === -1) {
        ids.push(tweet.id_str);
        allTweets.push(tweet);
      }
    }
  }

  console.log("ユーザーTLのマージを行います");
  for (const item of keys.userTweets) {
    const tweets = await getTweets(item.key);
    for (const tweet of tweets) {
      if (ids.indexOf(tweet.id_str) === -1) {
        ids.push(tweet.id_str);
        allTweets.push(tweet);
      }
    }
  }

  // ソースとなったオブジェクトのリスト
  const sourceList = [
    ...keys.homeTweets.map((x) => x.key),
    ...keys.userTweets.map((x) => x.key),
  ];

  console.log("マージが終わりました。ソートします");
  allTweets.sort((a, b) => util.compareNumber(a.id_str, b.id_str));

  if (!localPath) {
    console.log("ソートが終わりました。アップロードします");
    await putArchivedTweets(date, allTweets, sourceList);
  } else {
    console.log("ソートが終わりました。ファイルに書き出します");
    {
      const filename = `${localPath}${date.year}-${date.month}-${date.day}.json`;
      console.log(`${filename} を保存します`);
      const content = allTweets.map((x) => JSON.stringify(x)).join("\n");
      fs.writeFileSync(filename, Buffer.from(content, "utf-8"));
    }

    {
      const filename = `${localPath}${date.year}-${date.month}-${date.day}.json`;
      console.log(`${filename} を保存します`);
      const content = sourceList.join("\n");
      fs.writeFileSync(filename, Buffer.from(content, "utf-8"));
    }
  }
  return true;
};
