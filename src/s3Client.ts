import * as AWS from "aws-sdk"
import * as Config from "./config"
import * as Types from "./types"
import * as TweetTypes from "./types/twit"
import * as _ from "lodash"
import TwitterClient from "./twitterClient";
import moment from "moment";

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

    async getFragments(date: moment.Moment) {
        const keyPrefix = `${Config.s3.fragmentKeyPrefix}${date.format("YYYY-MM-DD")}`;
        const userTweets = await this.getAllObjects(`${keyPrefix}/USER_`);
        const homeTweets = await this.getAllObjects(`${keyPrefix}/TIMELINE_`);
        return {userTweets, homeTweets};
    }

    async getAllObjects(keyPrefix: string) {
        console.log(`keyPrefix='${keyPrefix}' のオブジェクトを検索します`);
        const firstChunk = await s3.listObjectsV2({
            Bucket: Config.s3.bucket,
            Prefix: keyPrefix
        }).promise();
        if (!firstChunk.Contents) { return []; }
        const keys = [firstChunk.Contents.map(x => x.Key) ];

        // NextContinuationTokenがある限り繰り返し取得
        let continueToken = firstChunk.NextContinuationToken;
        while (continueToken) {
            //console.log(`検索します: continueToken=${continueToken}`);
            const chunk = await s3.listObjectsV2({
                Bucket: Config.s3.bucket,
                Prefix: keyPrefix,
                ContinuationToken: continueToken
            }).promise();
            if (chunk.Contents) {
                keys.push(chunk.Contents.map(x => x.Key));
            }
            continueToken = chunk.NextContinuationToken;
        }

        return _.flatMap(keys).filter(x => x) as string[];
    }

    async getContents(keyName: string): Promise<TweetTypes.Tweet[]> {
        const data = await s3.getObject({
            Bucket: Config.s3.bucket,
            Key: keyName
        }).promise();

        if (typeof(data.Body) === "string") {
            return JSON.parse(data.Body);
        }
        if (Buffer.isBuffer(data.Body)) {
            return JSON.parse(data.Body.toString());
        }
        throw new Error("wakannna-i");
    }

    async putArchivedTweets(date: moment.Moment, tweets: TweetTypes.Tweet[]) {
        const keyName = `${Config.s3.dailyLogPrefix}${date.format("YYYY")}/${date.format("YYYY-MM")}/${date.format("YYYY-MM-DD")}.json`;
        console.log(`s3://${Config.s3.bucket}/${keyName}を保存します`);
        const content = tweets.map(x => JSON.stringify(x)).join("\n");
        await s3.putObject({
            Body: content,
            Bucket: Config.s3.bucket,
            Key: keyName,
            ContentType: "application/json; charset=utf-8"
        }).promise();
    }
}

