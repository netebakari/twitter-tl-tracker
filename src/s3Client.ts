import * as AWS from "aws-sdk"
import * as Config from "./config"
import * as Types from "./types"
import * as TweetTypes from "./types/twit"
import * as _ from "lodash"
import TwitterClient from "./twitterClient";
import moment from "moment";

const s3 = new AWS.S3({region: Config.s3.region});

export default class S3Client {
    async putUserTweets(tweets: TweetTypes.Tweet[]) {
        for (const chunk of TwitterClient.groupByDate(tweets)) {
            const content = chunk.tweets.map(x => JSON.stringify(x)).join("\n");
            const now = moment().format("YYYYMMDD.HHmmss.SSS");
            const keyName = `${Config.s3.fragmentKeyPrefix}${chunk.date}/USERv2_${now}.json`
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
            const content = chunk.tweets.map(x => JSON.stringify(x)).join("\n");
            const now = moment().format("YYYYMMDD.HHmmss.SSS");
            const keyName = `${Config.s3.fragmentKeyPrefix}${chunk.date}/TIMELINEv2_${now}.json`
            console.log(`s3://${Config.s3.bucket}/${keyName}を保存します`);
            await s3.putObject({
                Body: content,
                Bucket: Config.s3.bucket,
                Key: keyName,
                ContentType: "application/json; charset=utf-8"
            }).promise();
        }
    }

    /**
     * 指定した日付のツイートログの断片のキーを取得
     * @param date 
     */
    async getFragments(date: moment.Moment) {
        const keyPrefix = `${Config.s3.fragmentKeyPrefix}${date.format("YYYY-MM-DD")}`;

        const userTweets = await this.getAllObjects(`${keyPrefix}/USERv2_`);
        const homeTweets = await this.getAllObjects(`${keyPrefix}/TIMELINEv2_`);
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

    /**
     * S3のJSONを読み出してパースする。バケットはConfigで指定されたものを使う
     * @param keyName キー
     */
    async getTweets(keyName: string): Promise<TweetTypes.Tweet[]> {
        const data = await s3.getObject({
            Bucket: Config.s3.bucket,
            Key: keyName
        }).promise();

        // 1行ごとにJSONが並んでいる形なので直接パースはできない
        if (typeof(data.Body) === "string") {
            return data.Body.split("\n").map(x => JSON.parse(x));
        }
        if (Buffer.isBuffer(data.Body)) {
            const str = data.Body.toString();
            return str.split("\n").map(x => JSON.parse(x));
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

