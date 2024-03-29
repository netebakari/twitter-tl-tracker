/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line import/no-unresolved
import * as LambdaType from "aws-lambda";
import * as AWS from "aws-sdk";
import _ from "lodash";
// import moment from "moment";
import dayjs from "dayjs"
dayjs.extend(require("dayjs/plugin/utc"))
import * as dynamo from "./dynamodb";
import * as env from "./env";
import * as s3 from "./s3";
import * as sqs from "./sqs";
import * as twitter from "./twitterClient";
import * as Types from "./types";
import * as ParamTypes from "./types/parameters";
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
  console.log(event);

  if (typeof event.daysToBack === "number") {
    // 引数 daysToBack で指定されていたらその日数だけ戻ってログのマージを行う（0なら当日、1なら1日前など）
    // await s3.archive(moment().add(-event.daysToBack, "days"), event.destPath);
    const date = dayjs().utcOffset(env.tweetOption.utcOffset).add(-event.daysToBack, "days");
    const d: Types.DateType = {
      year: date.format("YYYY") as "2000",
      month: date.format("MM") as "01",
      day: date.format("DD") as "01"
    }
    await s3.archive(d, event.destPath);
  } else {
    // 引数がなかったら自分自身を非同期的に実行して当日から設定値までを全部マージする
    for (let i = 0; i <= env.tweetOption.daysToArchive; i++) {
      console.log(`別にLmabdaを起動して${i}日前のログをマージします`);
      const splitted = context.invokedFunctionArn.split(":"); // arn:aws:lambda:ap-northeast-1:99999999999:function:TimelineTraker-HomeTimeline
      const lambda = new AWS.Lambda({ region: splitted[3] });
      const payload = { daysToBack: i };
      await lambda
        .invoke({ FunctionName: splitted[6], InvocationType: "Event", Payload: JSON.stringify(payload) })
        .promise();
    }
  }
};

/**
 * 現在の自分の状態（フォロイー・フォロワーのID一覧、like全件）を取得し、前回からの差分を抽出する
 */
exports.event = async (event: any, context: LambdaType.Context) => {
  // 現在のf/fを取得（IDのみ）
  const user: ParamTypes.UserParamType = { userId: env.tweetOption.myUserIdStr };
  const friendsIds = await twitter.getFriendsOrFollowersIds(user, true);
  const followersIds = await twitter.getFriendsOrFollowersIds(user, false);

  // S3に保存しておいた最後のf/fを取得（IDのみ）
  const latest = (await s3.getLatestFriendFollowerIds()) || {
    friendsIds,
    followersIds,
  }; // 初回実行時は差分なしと判定される

  // 差分のIDを算出
  const newFriendsIds = _.difference(friendsIds, latest.friendsIds);
  const newFollowersIds = _.difference(followersIds, latest.followersIds);
  const lostFriendsIds = _.difference(latest.friendsIds, friendsIds);
  const lostFollowersIds = _.difference(latest.followersIds, followersIds);

  // ユーザー情報を取得
  const userIds = _.uniq(_.flatten([newFriendsIds, newFollowersIds, lostFriendsIds, lostFollowersIds]));
  if (userIds.length > 0) {
    const users = await twitter.lookupUsers(userIds);
  }

  // const now = moment().utcOffset(env.tweetOption.utcOffset);
  //await s3.putFriendAndFollowerIds(now, {friendsIds, followersIds});
};

/**
 * キューを埋める
 */
exports.hourlyTask = async (event: any, context: LambdaType.Context) => {
  const messageCount = await sqs.getMessageCount();
  console.log(`現在キューに入っているメッセージはだいたい${messageCount}件です`);
  if (messageCount > 3600) {
    console.log("いっぱいあるので何もしません");
    return true;
  }

  const followeeIds = await twitter.getFriendsOrFollowersIds({ userId: env.tweetOption.myUserIdStr }, true);
  let followerIds: string[] = [];
  if (env.tweetOption.includeFollowers) {
    followerIds = await twitter.getFriendsOrFollowersIds({ userId: env.tweetOption.myUserIdStr }, false);
  }

  let ids: string[] = [];
  while (messageCount + ids.length < 3600) {
    ids = _.flatten([ids, followeeIds, followerIds]);
  }

  const shuffled = _.shuffle(_.uniq(ids));

  console.log(`新しくユーザーIDを${shuffled.length}件投入します`);
  for (let i = 0; i < shuffled.length / 10; i++) {
    await sqs.send(shuffled.slice(i * 10, i * 10 + 10));
  }

  return true;
};

/**
 * ホームタイムラインを取得し、S3に保存する
 */
exports.homeTimeline = async (event: any, context: LambdaType.Context) => {
  const myself = await dynamo.getTimelineRecord();
  const sinceId = myself ? myself.sinceId : util.getStatusId(env.tweetOption.daysToArchive - 1);
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

  const remainingApiCallCount = await twitter.getApiRemainingCount("/statuses/user_timeline");
  if (remainingApiCallCount <= 16) {
    console.log("API呼び出し回数が残っていないので何もせずに終了します");
    return;
  }

  // とりあえず最大100回にしておく
  const maxApiCallCount = Math.min(remainingApiCallCount, 100);

  console.log(`処理開始。最大 /statuses/user_timeline の最大呼び出し回数 = ${maxApiCallCount}`);

  // 結果
  const result: { tweets: Types.TweetEx[]; receiptHandle: string }[] = [];

  // 実行時間が残り10秒になるか、失敗回数が2回に達したか、API呼び出し回数が残り16回になったらループ終了
  let totalApiCallCount = 0;
  let totalFailCount = 0;
  let loopCount = 1;
  while (
    totalApiCallCount <= maxApiCallCount - 16 &&
    totalFailCount < 2 &&
    context.getRemainingTimeInMillis() > 10000
  ) {
    console.log(
      `ループ${loopCount++}回目... API呼び出し回数: ${totalApiCallCount}, エラー: ${totalFailCount}）, 経過ミリ秒=${
        new Date().getTime() - startTimeInMillis
      }`
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
  const tweets = _.flatten(result.map((x) => x.tweets));
  const userIds = _.uniq(tweets.map((x) => x.user.id_str));

  console.log(`${userIds.length}人のユーザーTLから合計${tweets.length}件のツイートを取得しました。S3に保存します`);
  await s3.putUserTweets(tweets);

  console.log("DynamoDBを更新します");
  for (const userId of userIds) {
    const userTweets = tweets.filter((x) => x.user.id_str === userId);
    const maxId = util.getMaxId(userTweets);
    const user = userTweets[0].user;
    console.log(`@${user.screen_name}(id=${user.id_str})のsinceIdを${maxId}に更新します`);
    await dynamo.putUser(userId, user.screen_name, user.name, maxId);
  }

  console.log("キューを削除します");
  for (const receiptHandle of result.map((x) => x.receiptHandle)) {
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
        `userId=${queueMessage.userId} はユーザーテーブルに存在しないユーザーでした。` +
          `${env.tweetOption.daysToArchive - 1}日前の0:00以降=${sinceId}以降を取得します`
      );
    } else {
      sinceId = user.sinceId;
      console.log(`ユーザーテーブルからレコードを見つけました。 ${sinceId}以降を取得します`);
    }

    const _data = await twitter.getRecentTweets({ userId: queueMessage.userId }, sinceId);
    const tweets = _data.tweets;
    apiCallCount = _data.apiCallCount;

    if (tweets.length === 0) {
      // ツイートが見つからなかったら即メッセージは削除
      console.log("ツイートは見つかりませんでした");
      if (user) {
        // TTLだけ延長しておく。ツイートが見つからないとscreenNameも分からないので何もしない
        await dynamo.putUser(user.id_str, user.screenName, user.name, user.sinceId);
      }
      await sqs.deleteMessage(queueMessage.receiptHandle);
      return { isError: false, apiCallCount: apiCallCount }; // apiCallCountは1のはず
    }

    console.log(`${apiCallCount}回APIを叩いて${tweets.length}件のツイートが見つかりました`);
    return {
      isError: false,
      apiCallCount: apiCallCount,
      tweetData: {
        tweets: tweets,
        receiptHandle: queueMessage.receiptHandle,
      },
    };
  } catch (e) {
    if (Types.isTwitterErrorObject(e)) {
      if (e.error.indexOf("Not authorized") >= 0) {
        console.log("鍵がかかったアカウントでした。どうしようもないのでメッセージを削除します");
        await sqs.deleteMessage(queueMessage.receiptHandle);
        return { isError: false, apiCallCount: apiCallCount };
      }
      if (e.error.indexOf("that page does not exist") >= 0) {
        console.log("アカウントが消えていました。どうしようもないのでメッセージを削除します");
        await sqs.deleteMessage(queueMessage.receiptHandle);
        return { isError: false, apiCallCount: apiCallCount };
      }
      if (e.error.indexOf("blocked") >= 0) {
        console.log("ブロックされていました。どうしようもないのでメッセージを削除します");
        await sqs.deleteMessage(queueMessage.receiptHandle);
        return { isError: false, apiCallCount: apiCallCount };
      }
    }
    // それ以外のエラー時はリトライするためにメッセージを放置する
    console.error("鍵アカウントでも削除済みアカウントでもないエラー");
    console.error(e as any);
    return { isError: true, apiCallCount: apiCallCount };
  }
};
