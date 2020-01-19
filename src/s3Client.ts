import * as AWS from "aws-sdk"
import * as Config from "./config"
import * as Types from "./types"
import * as TweetTypes from "./types/twit"
import * as _ from "lodash"
import TwitterClient from "./twitterClient";
import moment from "moment";

const s3 = new AWS.S3({region: Config.s3.region});

export default class S3Client {
    /**
     * 特定のユーザーのツイートを保存する。ツイートは日付ごとにグループ分けして次のキーで保存する。
     * raw/user/YYYY-MM-DD/YYYYMMDD.HHmmss.SSS_9999999999.json
     * （前半の日付はツイートの日付、後半のタムスタンプは現在日時。単に重複しないユニークな値として利用している）
     * @param tweets 
     */
    async putUserTweets(tweets: Types.TweetEx[]) {
        for (const chunk of TwitterClient.groupByDate(tweets)) {
            const content = chunk.tweets.map(x => JSON.stringify(x)).join("\n");
            const now = moment().format("YYYYMMDD.HHmmss.SSS");
            const userId = chunk.tweets[0].user.id_str;
            const keyName = `raw/user/${chunk.date}/${now}_${userId}.json`
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
     * ホームタイムラインのツイートを保存する。ツイートは日付ごとにグループ分けして次のキーで保存する。
     * raw/home/YYYY-MM-DD/YYYYMMDD.HHmmss.SSS.json
     * @param tweets 
     */
    async putTimelineTweets(tweets: Types.TweetEx[]) {
        for (const chunk of TwitterClient.groupByDate(tweets)) {
            const content = chunk.tweets.map(x => JSON.stringify(x)).join("\n");
            const now = moment().format("YYYYMMDD.HHmmss.SSS");
            const keyName = `raw/home/${chunk.date}/${now}.json`
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
        const dateStr = date.format("YYYY-MM-DD");
        const userTweets = await this.getAllObjects(`raw/user/${date}/`);
        const homeTweets = await this.getAllObjects(`raw/home/${date}/`);
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
    async getTweets(keyName: string): Promise<Types.TweetEx[]> {
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

    async putArchivedTweets(date: moment.Moment, tweets: Types.TweetEx[]) {
        const keyName = `archive/${date.format("YYYY")}/${date.format("YYYY-MM")}/${date.format("YYYY-MM-DD")}.json`;
        console.log(`s3://${Config.s3.bucket}/${keyName}を保存します`);
        const content = tweets.map(x => JSON.stringify(x)).join("\n");
        await s3.putObject({
            Body: content,
            Bucket: Config.s3.bucket,
            Key: keyName,
            ContentType: "application/json; charset=utf-8"
        }).promise();
    }

    
    /**
     * フォロイー・フォロワーのIDデータを保存する。タイムスタンプ付きのものと latest.json の2つを保存する
     */
    async putFriendAndFollowerIds(timestamp: moment.Moment, ids: Types.FriendsAndFollowersIdsType) {
        await s3.putObject({
            Bucket: Config.s3.bucket,
            Key: `raw/ff/latest.json`,
            Body: JSON.stringify(ids),
            ContentType: "application/json; charset=utf-8"
        }).promise();

        await s3.putObject({
            Bucket: Config.s3.bucket,
            Key: `raw/ff/FF_${timestamp.format("YYYY-MM-DD_HHmm")}.json`,
            Body: JSON.stringify(ids),
            ContentType: "application/json; charset=utf-8"
        }).promise();
    }


    /**
     * 前回保存したフォロイー・フォロワーのIDデータを取得する。見つからなければnullが返される
     */
    async getLatestFriendFollowerIds() {
        try {
            const key = "raw/ff/latest.json";
            const data = await s3.getObject({
                Bucket: Config.s3.bucket,
                Key: key
            }).promise();

            // data.Bodyは実際にはstringかBuffer
            let body = "";
            if (typeof(data.Body) === "string") { body = data.Body; }
            if (Buffer.isBuffer(data.Body)) { body = data.Body.toString("utf8"); }

            try {
                const parsed = JSON.parse(body);
                if (Types.isFriendsAndFollowersIdsType(parsed)) {
                    return parsed;
                } else {
                    console.error(`S3にデータは見つかりましたが形式が変です: s3://${Config.s3.bucket}/${key}`);
                    return null;
                }
            } catch(e) {
                console.error(e);
                console.error(`S3にデータは見つかりましたがJSONとしてパースできません: s3://${Config.s3.bucket}/${key}`);
                return null;
            }
        } catch(e) {
            return null;
        }
    }

    /**
     * 前回保存したいいねのツイートのIDのリストを取得する。見つからなければnullが返される
     */
    async getLatestFavoriteTweetIds() {
        try {
            const data = await s3.getObject({
                Bucket: Config.s3.bucket,
                Key: `raw/event/favorites/latest.json`
            }).promise();
            if (typeof(data.Body) === "string") { return JSON.parse(data.Body) as string[]; }
            if (Buffer.isBuffer(data)) { return JSON.parse(data.toString("utf8")) as string[]; }
        } catch(e) {
        }
        return null;
    }
}

