import * as AWS from "aws-sdk"
import * as LambdaType from 'aws-lambda'
import * as Config from "./config"
import * as TwitterTypes from "./types/twit"

import TwitterClient from "./twitterClient"
import DynamoDbClient from "./dynamoDbClient"
import SQSClient from "./sqsClient"
import S3Client from "./s3Client";
import _ from "lodash"

const twitter = new TwitterClient();
const dynamo = new DynamoDbClient();
const sqs = new SQSClient();
const s3 = new S3Client();
/**
 * entry point
 */
exports.handler = async (event: any, context: LambdaType.Context) => {
    return true;
};


/**
 * 
 */
exports.dailyTask = async (event: any, context: LambdaType.Context) => {
    return true;
};


/**
 * 
 */
exports.homeTimeline = async (event: any, context: LambdaType.Context) => {
    const user = await dynamo.getTimelineRecord();
    const sinceId = user ? user.sinceId : TwitterClient.getStatusId(Config.tweetOption.daysToArchive - 1);
    console.log(`ホームタイムラインを取得します。 sinceId=${sinceId}`);
    const tweets = await twitter.getRecentTweets(null, sinceId);

    if (tweets.length > 0) {
        const minMax = TwitterClient.getMinMaxId(tweets);
        console.log(`${minMax.min}から${minMax.max}までを取得しました`);
        await s3.putTimelineTweets(tweets);
        await dynamo.updateTImelineRecord(minMax.max);
    }

    return true;
};

/**
 * SQSからメッセージを取得し、そこに書いてあるユーザーIDをもとに特定ユーザーのツイートを取得する
 */
exports.userTL = async (event: any, context: LambdaType.Context) => {
    const startTimeInMillis = new Date().getTime();

    const queueMessage = await sqs.receiveMessage();
    if (queueMessage === null) {
        console.log("キューは空でした");
        return true;
    }

    try {
        const user = await dynamo.getUserById(queueMessage.userId);
        let tweets: TwitterTypes.Tweet[];
        if (user === null) {
            // SQSにはあったけどDynamoDBには未登録。指定された日数分（上限3200件）を全部取得
            const sinceId = TwitterClient.getStatusId(Config.tweetOption.daysToArchive - 1);
            console.log(`ユーザーテーブルに存在しないユーザーでした。${Config.tweetOption.daysToArchive - 1}日前の0:00以降=${sinceId}以降を取得します`);
            tweets = await twitter.getRecentTweets({userId: queueMessage.userId}, sinceId);
        } else {
            console.log(`ユーザーテーブルからレコードを見つけました。 ${user.sinceId}以降を取得します`);
            tweets = await twitter.getRecentTweets({userId: user.id_str}, user.sinceId);
        }
        if (tweets.length === 0) {
            console.log("ツイートは見つかりませんでした");
            if (user) {
                await dynamo.putUser(user.id_str, user.screenName, user.name, user.sinceId); // TTLだけ延長しておく
            }
        } else {
            console.log(`${tweets.length}件のツイートが見つかりました。S3に保存します`)
            await s3.putSingleUserTweets(tweets);
            const minMaxId = TwitterClient.getMinMaxId(tweets);
            const latestUser = tweets[0].user;
            await dynamo.putUser(latestUser.id_str, latestUser.screen_name, latestUser.name, minMaxId.max);
        }


        console.log("メッセージを削除します");
        await sqs.deleteMessage(queueMessage.receiptHandle);
    } catch(e) {
        console.error(e);
        if (e.message.indexOf("Not authorized") >= 0) {
            console.log("鍵がかかったアカウントでした。どうしようもないのでメッセージを削除します");
            await sqs.deleteMessage(queueMessage.receiptHandle);
            return;
        }
        if (e.message.indexOf("NoSorry, that page does not exist") >= 0) {
            console.log("アカウントが消えていました。どうしようもないのでメッセージを削除します");
            await sqs.deleteMessage(queueMessage.receiptHandle);
            return;
        }
        // それ以外のエラー時はリトライする
    }

    return true;

};

