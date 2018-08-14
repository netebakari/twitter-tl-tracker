import * as AWS from "aws-sdk"
import * as Config from "./config"
import * as Types from "./types"
import * as TweetTypes from "./types/twit"
import * as _ from "lodash"
import TwitterClient from "./twitterClient";

const sqs = new AWS.SQS({region: Config.sqs.region});
const s3 = new AWS.S3({region: Config.s3.region});

export default class S3Client {
    async putUserTweets(tweets: TweetTypes.Tweet[]) {
        for (const chunk of TwitterClient.groupByDate(tweets)) {
            const content = JSON.stringify(chunk.tweets);
            const keyName = `${Config.s3.fragmentKeyPrefix}${chunk.date}/USER_${new Date().getTime()}.json`
            console.log(`s3://${Config.s3.bucket}/${keyName}を保存します`);
            await s3.putObject({
                Body: content,
                Bucket: Config.s3.bucket,
                Key: keyName,
                ContentType: "application/json; charset=utf-8"
            }).promise();
        }
    }

    async putTimelineTweets(tweets: TweetTypes.Tweet[]) {
        for (const chunk of TwitterClient.groupByDate(tweets)) {
            const content = JSON.stringify(chunk.tweets);
            const keyName = `${Config.s3.fragmentKeyPrefix}${chunk.date}/TIMELINE_${new Date().getTime()}.json`
            console.log(`s3://${Config.s3.bucket}/${keyName}を保存します`);
            await s3.putObject({
                Body: content,
                Bucket: Config.s3.bucket,
                Key: keyName,
                ContentType: "application/json; charset=utf-8"
            }).promise();
        }
    }
}

