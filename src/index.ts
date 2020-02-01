// eslint-disable-next-line import/no-unresolved
import * as LambdaType from "aws-lambda";
import _ from "lodash";
import moment from "moment";

import * as dynamo from "./dynamodb";
import * as env from "./env";
import * as s3 from "./s3";
import * as sqs from "./sqs";
import * as twitter from "./twitterClient";
import * as Types from "./types";
import * as util from "./util";

/**
 * entry point
 */
exports.handler = async (event: any, context: LambdaType.Context) => {
  return true;
};

/**
 * ログをマージして1個のJSONにする
 */
exports.archive = async (event: any, context: LambdaType.Context) => {
  console.log("処理開始");

  // 引数 daysToBack で指定されていたらその日数だけ戻る（0なら当日、1なら1日前など）。指定がなかったら設定値
  const daysToBack = +event.daysToBack || env.tweetOption.daysToArchive;
};

/**
 * 現在の自分の状態（フォロイー・フォロワーのID一覧、like全件）を取得し、前回からの差分を抽出する
 */
exports.event = async (event: any, context: LambdaType.Context) => {
  // 現在のf/fを取得（IDのみ）
  const friendsIds = await twitter.getFriendsOrFollowersIds(
    { userId: env.tweetOption.myUserIdStr },
    true
  );
  const followersIds = await twitter.getFriendsOrFollowersIds(
    { userId: env.tweetOption.myUserIdStr },
    false
  );

  // S3に保存しておいた最後のf/fを取得（IDのみ）
  const latest = (await s3.getLatestFriendFollowerIds()) || {
    friendsIds,
    followersIds
  }; // 初回実行時は差分なしと判定される

  // 差分のIDを算出
  const newFriendsIds = _.difference(friendsIds, latest.friendsIds);
  const newFollowersIds = _.difference(followersIds, latest.followersIds);
  const lostFriendsIds = _.difference(latest.friendsIds, friendsIds);
  const lostFollowersIds = _.difference(latest.followersIds, followersIds);

  // ユーザー情報を取得
  const userIds = _.uniq(
    _.flatten([
      newFriendsIds,
      newFollowersIds,
      lostFriendsIds,
      lostFollowersIds
    ])
  );
  if (userIds.length > 0) {
    const users = await twitter.lookupUsers(userIds);
  }

  const now = moment().utcOffset(env.tweetOption.utfOffset);
  //await s3.putFriendAndFollowerIds(now, {friendsIds, followersIds});
};

/**
 * 指定された日のログをマージして1個のJSONにする。この処理に限ってはS3へのアクセス権限だけあればいい
 * @param date
 */
const archive = async (date: moment.Moment) => {
  console.log(`${date.format("YYYY-MM-DD")}のログを処理します`);
  const keys = await s3.getFragments(date);
  const allTweets: Types.TweetEx[] = [];
  const ids: string[] = [];
  console.log(moment());
  console.log(
    `ホームTLが${keys.homeTweets.length}件、ユーザーTLが${keys.userTweets.length}件見つかりました`
  );
  console.log("ホームTLのマージを行います");
  for (const key of keys.homeTweets) {
    const tweets = await s3.getTweets(key);
    for (const tweet of tweets) {
      if (ids.indexOf(tweet.id_str) === -1) {
        ids.push(tweet.id_str);
        allTweets.push(tweet);
      }
    }
  }

  console.log("ユーザーTLのマージを行います");
  for (const key of keys.userTweets) {
    const tweets = await s3.getTweets(key);
    for (const tweet of tweets) {
      if (ids.indexOf(tweet.id_str) === -1) {
        ids.push(tweet.id_str);
        allTweets.push(tweet);
      }
    }
  }

  console.log("マージが終わりました。ソートします");
  allTweets.sort((a, b) => util.compareNumber(a.id_str, b.id_str));
  console.log("ソートが終わりました。アップロードします");
  await s3.putArchivedTweets(date, allTweets);
  return true;
};

/**
 * キューを埋める
 */
exports.hourlyTask = async (event: any, context: LambdaType.Context) => {
  const messageCount = await sqs.getMessageCount();
  console.log(
    `現在キューに入っているメッセージはだいたい${messageCount}件です`
  );
  if (messageCount > 3600) {
    console.log("いっぱいあるので何もしません");
    return true;
  }

  let ids: string[] = [];
  const followeeIds = await twitter.getFriendsOrFollowersIds(
    { userId: env.tweetOption.myUserIdStr },
    true
  );
  while (messageCount + ids.length < 3600) {
    ids = _.flatten([ids, followeeIds]);
  }

  console.log(`新しくユーザーIDを${ids.length}件投入します`);
  for (const id of ids) {
    await sqs.send(id);
  }
  return true;
};

/**
 * ホームタイムラインを取得し、S3に保存する
 */
exports.homeTimeline = async (event: any, context: LambdaType.Context) => {
  const myself = await dynamo.getTimelineRecord();
  const sinceId = myself
    ? myself.sinceId
    : util.getStatusId(env.tweetOption.daysToArchive - 1);
  console.log(`ホームタイムラインを取得します。 sinceId=${sinceId}`);
  const { tweets } = await twitter.getRecentTweets(null, sinceId);

  if (tweets.length > 0) {
    const minId = util.getMinimumId(tweets);
    const maxId = util.getMaxId(tweets);
    console.log(`${minId}から${maxId}までを取得しました`);
    await s3.putTimelineTweets(tweets);
    await dynamo.updateTImelineRecord(maxId);
  }

  return true;
};

/**
 * SQSからメッセージを取得し、そこに書いてあるユーザーIDをもとに特定ユーザーのツイートを取得する。
 * これを繰り返し実行する
 */
exports.userTL = async (event: any, context: LambdaType.Context) => {
  const startTimeInMillis = new Date().getTime();

  // 制限時間・回数
  const timelimitInSec = Math.floor(context.getRemainingTimeInMillis() / 1000);
  const maxApiCallCount = timelimitInSec * 0.95;

  // 結果
  const result: { tweets: Types.TweetEx[]; receiptHandle: string }[] = [];

  // 実行時間が残り3秒になるか、失敗回数が2回に達したか、API呼び出し回数が（設定時間×0.95）回になったらループ終了
  let totalApiCallCount = 0;
  let totalFailCount = 0;
  let loopCount = 1;
  while (
    totalApiCallCount <= maxApiCallCount &&
    totalFailCount < 2 &&
    context.getRemainingTimeInMillis() > 3000
  ) {
    console.log(
      `ループ${loopCount++}回目... API呼び出し回数: ${totalApiCallCount}, エラー: ${totalFailCount}）, 経過ミリ秒=${new Date().getTime() -
        startTimeInMillis}`
    );
    const chunk = await processSingleQueueMessage();
    if (chunk.apiCallCount === 0) {
      // キューが空だった
      break;
    }
    totalApiCallCount += chunk.apiCallCount;
    if (chunk.tweetData) {
      // ここに来た時点で必ず1件はツイートがある
      result.push(chunk.tweetData);
    }
    if (chunk.isError) {
      totalFailCount++;
    }
  }

  console.log("ループを抜けました");
  const tweets = _.flatten(result.map(x => x.tweets));
  const userIds = _.uniq(tweets.map(x => x.user.id_str));

  console.log(
    `${userIds.length}人のユーザーTLから合計${tweets.length}件のツイートを取得しました。S3に保存します`
  );
  await s3.putUserTweets(tweets);

  console.log("DynamoDBを更新します");
  for (const userId of userIds) {
    const userTweets = tweets.filter(x => x.user.id_str === userId);
    const maxId = util.getMaxId(userTweets);
    const user = userTweets[0].user;
    console.log(
      `@${user.screen_name}(id=${user.id_str})のsinceIdを${maxId}に更新します`
    );
    await dynamo.putUser(userId, user.screen_name, user.name, maxId);
  }

  console.log("キューを削除します");
  for (const receiptHandle of result.map(x => x.receiptHandle)) {
    await sqs.deleteMessage(receiptHandle);
  }

  return true;
};

/**
 * ユーザーのタイムライン取得の結果
 */
interface UserTweetsFetchResultType {
  isError: boolean;
  apiCallCount: number;
  tweetData?: {
    tweets: Types.TweetEx[];
    receiptHandle: string;
  };
}

/**
 * SQSからメッセージを1件取得し、そこに書いてあるユーザーIDをもとに特定ユーザーのツイートを取得する。
 * 1件以上のツイートが正常に取得できた場合、戻り値には tweetData が含まれる。
 * 呼び出し元で receiptHandle を使ってメッセージを削除し、DynamoDBを更新する必要がある。
 */
const processSingleQueueMessage = async (): Promise<UserTweetsFetchResultType> => {
  const queueMessage = await sqs.receiveMessage();
  if (queueMessage === null) {
    console.log("キューは空でした");
    return { isError: false, apiCallCount: 0 };
  }

  let apiCallCount = 0;

  try {
    const user = await dynamo.getUserById(queueMessage.userId);
    let sinceId: string;

    if (user === null) {
      // SQSにはあったけどDynamoDBには未登録。指定された日数分（上限3200件）を全部取得
      sinceId = util.getStatusId(env.tweetOption.daysToArchive - 1);
      console.log(
        `ユーザーテーブルに存在しないユーザーでした。${env.tweetOption
          .daysToArchive - 1}日前の0:00以降=${sinceId}以降を取得します`
      );
    } else {
      sinceId = user.sinceId;
      console.log(
        `ユーザーテーブルからレコードを見つけました。 ${sinceId}以降を取得します`
      );
    }

    const _data = await twitter.getRecentTweets(
      { userId: queueMessage.userId },
      sinceId
    );
    const tweets = _data.tweets;
    apiCallCount = _data.apiCallCount;

    if (tweets.length === 0) {
      // ツイートが見つからなかったら即メッセージは削除
      console.log("ツイートは見つかりませんでした");
      if (user) {
        await dynamo.putUser(
          user.id_str,
          user.screenName,
          user.name,
          user.sinceId
        ); // TTLだけ延長しておく。ツイートが見つからないとscreenNameも分からないので何もしない
      }
      await sqs.deleteMessage(queueMessage.receiptHandle);
      return { isError: false, apiCallCount: apiCallCount }; // apiCallCountは1のはず
    }

    console.log(
      `${apiCallCount}回APIを叩いて${tweets.length}件のツイートが見つかりました`
    );
    return {
      isError: false,
      apiCallCount: apiCallCount,
      tweetData: {
        tweets: tweets,
        receiptHandle: queueMessage.receiptHandle
      }
    };
  } catch (e) {
    if (e.message.indexOf("Not authorized") >= 0) {
      console.log(
        "鍵がかかったアカウントでした。どうしようもないのでメッセージを削除します"
      );
      await sqs.deleteMessage(queueMessage.receiptHandle);
      return { isError: false, apiCallCount: apiCallCount };
    }
    if (e.message.indexOf("that page does not exist") >= 0) {
      console.log(
        "アカウントが消えていました。どうしようもないのでメッセージを削除します"
      );
      await sqs.deleteMessage(queueMessage.receiptHandle);
      return { isError: false, apiCallCount: apiCallCount };
    }
    // それ以外のエラー時はリトライするためにメッセージを放置する
    console.error(e);
    return { isError: true, apiCallCount: apiCallCount };
  }
};
