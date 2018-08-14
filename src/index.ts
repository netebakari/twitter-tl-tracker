import * as LambdaType from 'aws-lambda'
import * as Config from "./config"
import * as TwitterTypes from "./types/twit"
import * as Types from "./types"
import TwitterClient from "./twitterClient"
import DynamoDbClient from "./dynamoDbClient"
import SQSClient from "./sqsClient"
import S3Client from "./s3Client"
import _ from "lodash"

const twitter = new TwitterClient();
const dynamo = new DynamoDbClient();
const sqs = new SQSClient();
const s3 = new S3Client();

/**
 * entry point
 */
exports.handler = async (event: any, context: LambdaType.Context) => {
};


/**
 * 
 */
exports.dailyTask = async (event: any, context: LambdaType.Context) => {
    return true;
};

exports.hourlyTask = async (event: any, context: LambdaType.Context) => {
    const messageCount = await sqs.getMessageCount();
    return true;
};


/**
 * ホームタイムラインを取得し、S3に保存する
 */
exports.homeTimeline = async (event: any, context: LambdaType.Context) => {
    const user = await dynamo.getTimelineRecord();
    const sinceId = user ? user.sinceId : TwitterClient.getStatusId(Config.tweetOption.daysToArchive - 1);
    console.log(`ホームタイムラインを取得します。 sinceId=${sinceId}`);
    const {tweets} = await twitter.getRecentTweets(null, sinceId);

    if (tweets.length > 0) {
        const minMax = TwitterClient.getMinMaxId(tweets);
        console.log(`${minMax.min}から${minMax.max}までを取得しました`);
        await s3.putTimelineTweets(tweets);
        await dynamo.updateTImelineRecord(minMax.max);
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
    const timelimitInSec = Config.tweetOption.executeTimeInSeconds;
    const maxApiCallCount = timelimitInSec * 0.95;

    // 実行時間が設定時間に達するか、失敗回数が3回に達したか、API呼び出し回数が（設定時間×0.95）回になったら終了
    let totalApiCallCount = 0;
    let totalFailCount = 0;
    let loopCount = 1;
    while(totalApiCallCount <= maxApiCallCount && totalFailCount < 3 && (new Date().getTime() - startTimeInMillis) <= timelimitInSec*1000) {
        console.log(`ループ${loopCount++}回目...`);
        const {result, apiCallCount} = await processSingleQueueMessage();
        if (apiCallCount < 0) { break; } // キューが空っぽ
        totalApiCallCount += apiCallCount;
        if (!result) { totalFailCount++; }
    }

    return true;
}

/**
 * SQSからメッセージを1件取得し、そこに書いてあるユーザーIDをもとに特定ユーザーのツイートを取得してS3に保存する
 */
const processSingleQueueMessage = async () => {
    const queueMessage = await sqs.receiveMessage();
    if (queueMessage === null) {
        console.log("キューは空でした");
        return {result: true, apiCallCount: -1};
    }

    let apiCallCount = 0;

    try {
        const user = await dynamo.getUserById(queueMessage.userId);
        let sinceId: string;

        if (user === null) {
            // SQSにはあったけどDynamoDBには未登録。指定された日数分（上限3200件）を全部取得
            sinceId = TwitterClient.getStatusId(Config.tweetOption.daysToArchive - 1);
            console.log(`ユーザーテーブルに存在しないユーザーでした。${Config.tweetOption.daysToArchive - 1}日前の0:00以降=${sinceId}以降を取得します`);
        } else {
            sinceId = user.sinceId;
            console.log(`ユーザーテーブルからレコードを見つけました。 ${sinceId}以降を取得します`);
        }

        const _data = await twitter.getRecentTweets({userId: queueMessage.userId}, sinceId);
        const tweets = _data.tweets;
        apiCallCount = _data.apiCallCount;
            
        if (tweets.length === 0) {
            console.log("ツイートは見つかりませんでした");
            if (user) {
                await dynamo.putUser(user.id_str, user.screenName, user.name, user.sinceId); // TTLだけ延長しておく
            }
        } else {
            console.log(`${apiCallCount}回APIを叩いて${tweets.length}件のツイートが見つかりました。S3に保存します`)
            await s3.putSingleUserTweets(tweets);
            const minMaxId = TwitterClient.getMinMaxId(tweets);
            const latestUser = tweets[0].user;
            await dynamo.putUser(latestUser.id_str, latestUser.screen_name, latestUser.name, minMaxId.max);
        }

        console.log("メッセージを削除します");
        await sqs.deleteMessage(queueMessage.receiptHandle);

        return {result: true, apiCallCount: apiCallCount};
    } catch(e) {
        if (e.message.indexOf("Not authorized") >= 0) {
            console.log("鍵がかかったアカウントでした。どうしようもないのでメッセージを削除します");
            await sqs.deleteMessage(queueMessage.receiptHandle);
            return {result: true, apiCallCount: apiCallCount};
        }
        if (e.message.indexOf("that page does not exist") >= 0) {
            console.log("アカウントが消えていました。どうしようもないのでメッセージを削除します");
            await sqs.deleteMessage(queueMessage.receiptHandle);
            return {result: true, apiCallCount: apiCallCount};
        }
        // それ以外のエラー時はリトライするためにメッセージを放置する
        console.error(e);
        return {result: false, apiCallCount: apiCallCount};
    }
};

