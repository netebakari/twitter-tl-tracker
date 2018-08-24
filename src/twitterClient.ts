const Twit = require("twit")
import * as Types from "./types"
import * as TwitterTypes from "./types/twit"
import * as _ from "lodash";
import * as Config from "./config"
import moment from "moment"

enum EnumTimelineType {
    HomeTimeline,
    UserTimeline,
    Favorites
}

export default class TwitterClient {
    readonly client: any;

    constructor() {
        this.client = new Twit(Config.twitterToken);
    }
   
    /**
     * あるユーザーのフォロワーまたはフォロイーのIDを取得する
     * @param user screenNameまたはuserIdでユーザーを指定する。どちらかが必須。両方指定されていたらuserIdが優先される
     * @param friendsOrFollowers trueならフォロイー（フォローしている人）を、falseならフォロワーを取得する
     */
    async getFriendsOrFollowersId(user: Types.UserType, friendsOrFollowers: boolean): Promise<string[]> {
        const result: Array<Array<string>> = [];
        let chunk = await this._getFriendsOrFollowersId(user, friendsOrFollowers);
        result.push(chunk.ids);
        while(chunk.nextCursor) {
            chunk = await this._getFriendsOrFollowersId(user, friendsOrFollowers, chunk.nextCursor);
            result.push(chunk.ids);
        }
        return _.flatten(result);
    }

    private async _getFriendsOrFollowersId(user: Types.UserType, friendsOrFollowers: boolean, cursor: string|null = null): Promise<{ids: string[]; nextCursor?: string}> {
        return new Promise((resolve, reject) => {
            const params: any = { stringify_ids: true };
            if (cursor) { params.cursor = cursor; }
            if (user.userId) { params.user_id = user.userId; }
            else if (user.screenName) { params.screen_name = user.screenName; }
            else { throw new Error("either screenName or userId required");}
            
            const endpoint = friendsOrFollowers ? "friends/ids" : "followers/ids";
            this.client.get(endpoint, params, function(error: any, result: TwitterTypes.FriendsFollowersIdResult, response: any) {
                if (!error) {
                    if (result.next_cursor === 0) { resolve({ids: result.ids}); }
                    else { resolve({ids: result.ids, nextCursor: result.next_cursor_str}); }
                } else {
                    reject(error);
                }
            });
        }) as Promise<{ids: string[]; nextCursor?: string}>
    }




    /**
     * 対象のユーザーのlikeを最大3200件取得する。
     * @param user_id ユーザー
     */
    async getFavorites(user: Types.UserType): Promise<{apiCallCount: number, tweets: TwitterTypes.Tweet[]}> {
        const firstChunk = await this.getTweets(EnumTimelineType.Favorites, user, {sinceId: "100"});
        if (firstChunk.length < 180) { return {apiCallCount: 1, tweets: firstChunk}; }
        let minimumId = TwitterClient.getMinimumId(firstChunk);

        const chunks: TwitterTypes.Tweet[][] = [firstChunk];
        let apiCallCount = 1;
        for(let i = 0; i < 15; i++) {
            const chunk = await this.getTweets(EnumTimelineType.Favorites, user, {maxId: minimumId});
            apiCallCount++;
            chunks.push(chunk);
            if (chunk.length === 0) { break; }
            const newMinimumId = TwitterClient.getMinimumId(chunk);
            // IDの最小値が更新できなかったら終わり
            if (minimumId === newMinimumId) { break; } 
            minimumId = newMinimumId;
        }

        const tweets = _.flatten(chunks);
        return {apiCallCount, tweets};
    }


    /**
     * 対象のユーザーまたはホームタイムラインから直近のツイートを最大3200件（ホームタイムラインの場合は800件）取得する。
     * @param user_id ユーザー。nullを指定するとホームタイムライン
     * @param sinceId これ以降
     */
    async getRecentTweets(user: Types.UserType|null, sinceId: string): Promise<{apiCallCount: number, tweets: TwitterTypes.Tweet[]}> {
        const timelieType = user === null ? EnumTimelineType.HomeTimeline : EnumTimelineType.UserTimeline;
        const firstChunk = await this.getTweets(timelieType, user, {sinceId: sinceId});
        if (firstChunk.length < 180) { return {apiCallCount: 1, tweets: firstChunk}; }
        let minimumId = TwitterClient.getMinimumId(firstChunk);

        const maxloopCount = user ? 15 : 3; // ホームタイムラインは最大800件まで。最初に1回取ったから3回ループする
        const chunks: TwitterTypes.Tweet[][] = [firstChunk];
        let apiCallCount = 1;
        for(let i = 0; i < maxloopCount; i++) {
            const chunk = await this.getTweets(timelieType, user, {maxId: minimumId});
            apiCallCount++;
            chunks.push(chunk);
            if (chunk.length === 0) { break; }
            const newMinimumId = TwitterClient.getMinimumId(chunk);
            // IDの最小値が更新できなかったか、IDの最小値が最初に与えたsinceIdと同等以下になったら終わり
            if (minimumId === newMinimumId || TwitterClient.compareNumber(sinceId, newMinimumId) >= 0) { break; } 
            minimumId = newMinimumId;
        }

        const tweets = _.flatten(chunks).filter(x => TwitterClient.compareNumber(x.id_str, sinceId) >= 0);
        return {apiCallCount, tweets};
    }

    /**
     * 対象のユーザー、ホームタイムライン、いいねから直近のツイートを最大200件取得する。パラメーターチェックは *しない* ので注意
     * @param timelineType 取得するタイムラインのタイプ
     * @param user_id ユーザー。timelineTypeでHomeTimelineを選んだときは無視される
     * @param condition sinceId, maxIdのいずれかを指定する。両方省略した場合は直近の200件が返される
     */
    async getTweets(timelineType: EnumTimelineType, user: Types.UserType|null, condition: {sinceId?: string, maxId?: string}): Promise<TwitterTypes.Tweet[]> {
        const params: any = {
            count: 200,
            include_rts: true,
            exclude_replies: false,
            tweet_mode: "extended"
        };
        if (condition.sinceId) { params.since_id = condition.sinceId; }
        if (condition.maxId) { params.max_id = condition.maxId; }
        if (timelineType !== EnumTimelineType.HomeTimeline && user) { // ホームタイムライン以外の場合、userは非nullかつidかscreenNameに値ありと仮定
            if (user.userId) { params.user_id = user.userId; }
            if (user.screenName) { params.screen_name = user.screenName; }
        }
        let endpoint = "";
        switch(timelineType) {
            case EnumTimelineType.HomeTimeline: endpoint = "statuses/home_timeline"; break;
            case EnumTimelineType.UserTimeline: endpoint = "statuses/user_timeline"; break;
            case EnumTimelineType.Favorites: endpoint = "favorites/list"; break;
        }
        console.log(`TwitterClient#getTweets(): endpoint=${endpoint}, parameter=${JSON.stringify(params)}`);

        return new Promise((resolve, reject) => {
            this.client.get(endpoint, params, function(error: any, tweets: TwitterTypes.Tweet[], response: any) {
                if (!error) {
                    console.log(`...${tweets.length}件取得しました`);
                    const timestamp = moment().utcOffset(Config.tweetOption.utfOffset).format();
                    tweets = tweets.map(x => TwitterClient.alterTweet(x, timestamp));
                    resolve(tweets);
                } else {
                    reject(error);
                }
            });
        }) as Promise<TwitterTypes.Tweet[]>;
    }
    
 
    /**
     * ツイートを少し加工する。
     * 1. idを削除（どうせオーバーフローして末尾がゼロになっているので意味なし）
     * 2. timestampLocal（"2018-08-11T12:34:45+0900"形式）を追加
     * 3. dateLocal("2018-08-11"形式)を追加
     * 4. serverTimestamp（"2018-08-11T12:34:45+0900"形式）を追加。これは取得日時
     * @param tweet 
     */
    static alterTweet(tweet: TwitterTypes.Tweet, serverTimestamp: string) {
        delete tweet.id;
        const timestamp = moment(new Date(tweet.created_at)).utcOffset(Config.tweetOption.utfOffset);
        tweet.timestampLocal = timestamp.format();
        tweet.dateLocal = timestamp.format("YYYY-MM-DD");
        tweet.serverTimestamp = serverTimestamp;
        return tweet;
    }

    /**
     * ＊日本時間で＊ 現在日時からN日前の午前0時におけるstatus idを取得する
     * @param daysCount 何日遡るか。0なら当日
     */
    static getStatusId(daysCount: number) {
        const now = moment().utcOffset(Config.tweetOption.utfOffset);
        const cinderellaTime = moment(`${now.format("YYYY-MM-DD")}T00:00:00+09:00`); // 今日の0時0分のUnixTime
        const unixTime = +cinderellaTime.format("X") - daysCount * 24 * 3600; // 求める日の0時0分のUnixTime
        const time = unixTime - 1288834974.657; // マジックナンバーを引く
        // これを22ビットシフトするとstatus idの下限になる
        return Math.floor(time * 1024 * 1024 * 4) + "000";
    }

    /**
     * 与えられたツイートの中で最小のIDを取得
     * @param tweets 
     */
    static getMinimumId(tweets: TwitterTypes.Tweet[]) {
        return tweets.map(x => x.id_str).reduce((prev, current) => TwitterClient.compareNumber(prev, current) < 0 ? prev : current);
    }

    /**
     * 与えられたツイートの中で最大のIDを取得
     * @param tweets 
     */
    static getMaxId(tweets: TwitterTypes.Tweet[]) {
        return tweets.map(x => x.id_str).reduce((prev, current) => TwitterClient.compareNumber(prev, current) > 0 ? prev : current);
    }

    /**
     * 2つの数値（文字型）を比較する
     * @param string1 
     * @param string2 
     * @return string1の方が大きければ正の値、string2の方が大きければ負の値、同じなら0（つまり string1 - string2 だと思えばいい）
     */
    static compareNumber(string1: string, string2: string) {
        if (string1.length > string2.length) { return 1; }
        if (string1.length < string2.length) { return -1; }
        if (string1 === string2) { return 0; }
        return string1 > string2 ? 1 : -1;
    }

    /**
     * ツイートを dateLocal の値でグループ分けする
     * @param tweets ツイートの配列
     */
    static groupByDate(tweets: TwitterTypes.Tweet[]) {
        const grouped = _.groupBy(tweets, "dateLocal");
        const dates = Object.keys(grouped);
        const result: {date: string, tweets: TwitterTypes.Tweet[]}[] = [];
        for(const date of dates) {
            result.push({date: date, tweets: grouped[date]})
        }
        return result;
    }

    /**
     * ツイートを送信する。インスタンス生成時に dryRun = true を指定していたら console.log で出力するだけ
     * @param text 
     */
    async sendTweet(text: string) {
        console.log(`ツイートを送信します: ${text}`);
        return this.client.post('statuses/update', {status: text});
    }
}