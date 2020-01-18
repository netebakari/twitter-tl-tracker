import Twit, * as twit from "twit";
import * as Types from "./types"
import * as _ from "lodash";
import * as Config from "./config"
import moment from "moment"

enum EnumTimelineType {
    HomeTimeline,
    UserTimeline,
    Favorites
}

export default class TwitterClient {
    readonly client: Twit;

    /**
     * 唯一のコンストラクタ。環境変数からトークン等を読み込んでインスタンスを作成する
     */
    constructor() {
        this.client = new Twit(Config.twitterToken);
    }
   
    /**
     * users/lookup を叩いてユーザー情報を取得する
     * @param userIds ユーザーIDの配列。100件ごとにまとめてAPIがコールされる
     */
    async lookupUsers(userIds: string[]): Promise<{apiCallCount: number, users: Types.User[]}> {
        const doPost = async (params: any): Promise<Types.User[]> => {
            return new Promise((resolve, reject) => {
                this.client.post("users/lookup", params, function(error: any, result: any) {
                    if (error) { reject(error); }
                    resolve(result);
                });
            });
        }

        let apiCallCount = 0;
        const chunks = [];
        for(let i = 0; i < userIds.length; i += 100) {
            const userIdsPart = userIds.slice(i, i + 100);
            const params = {user_id: userIdsPart.join(","), include_entities: true, tweet_mode: "extended"};
            apiCallCount++;
            chunks.push(await doPost(params));
        }

        return {apiCallCount, users: _.flatten(chunks)};
    }

    /**
     * あるユーザーのフォロワーまたはフォロイーのIDを取得する
     * @param user ユーザー
     * @param friendsOrFollowers trueならフォロイー（フォローしている人）を、falseならフォロワーを取得する
     */
    async getFriendsOrFollowersIds(user: Types.UserType, friendsOrFollowers: boolean): Promise<string[]> {
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
            else { params.screen_name = user.screenName; }
            
            const endpoint = friendsOrFollowers ? "friends/ids" : "followers/ids";
            this.client.get(endpoint, params, function(error: any, result: any, response: any) {
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
    async getFavorites(user: Types.UserType): Promise<{apiCallCount: number, tweets: Types.Tweet[]}> {
        const firstChunk = await this.getTweets("Favorites", user, {sinceId: "100"});
        if (firstChunk.length < 180) { return {apiCallCount: 1, tweets: firstChunk}; }
        let minimumId = TwitterClient.getMinimumId(firstChunk);

        const chunks: Types.Tweet[][] = [firstChunk];
        let apiCallCount = 1;
        for(let i = 0; i < 15; i++) {
            const chunk = await this.getTweets("Favorites", user, {maxId: minimumId});
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
    async getRecentTweets(user: Types.UserType|null, sinceId: string): Promise<{apiCallCount: number, tweets: Types.TweetEx[]}> {
        const timelieType: Types.TimeLineType = (user === null) ? "HomeTL" : "UserTL";
        const firstChunk = await this.getTweets(timelieType, user, {sinceId: sinceId});
        if (firstChunk.length < 180) { return {apiCallCount: 1, tweets: firstChunk}; }
        let minimumId = TwitterClient.getMinimumId(firstChunk);

        const maxloopCount = user ? 15 : 3; // ホームタイムラインは最大800件まで。最初に1回取ったから3回ループする
        const chunks: Types.TweetEx[][] = [firstChunk];
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
        return {
            apiCallCount, tweets
        };
    }

    /**
     * 対象のユーザー、ホームタイムライン、いいねから直近のツイートを最大200件取得する。パラメーターチェックは *しない* ので注意
     * @param timelineType 取得するタイムラインのタイプ
     * @param user_id ユーザー。timelineTypeでHomeTimelineを選んだときは無視される
     * @param condition sinceId, maxIdのいずれかを指定する。両方省略した場合は直近の200件が返される
     */
    async getTweets(timelineType: Types.TimeLineType, user: Types.UserType|null, condition: {sinceId?: string, maxId?: string}): Promise<Types.TweetEx[]> {
        const params: any = {
            count: 200,
            include_rts: true,
            exclude_replies: false,
            tweet_mode: "extended"
        };
        if (condition.sinceId) { params.since_id = condition.sinceId; }
        if (condition.maxId) { params.max_id = condition.maxId; }
        if (timelineType !== "HomeTL") {
            // ホームタイムライン以外の場合、userは非nullでないとエラー
            if (user === null) { throw new Error("UserTL and Favorits need user info"); }
            if (user.userId) { params.user_id = user.userId; }
            else { params.screen_name = user.screenName; }
        }
        let endpoint = "";
        switch(timelineType) {
            case "HomeTL": endpoint = "statuses/home_timeline"; break;
            case "UserTL": endpoint = "statuses/user_timeline"; break;
            case "Favorites": endpoint = "favorites/list"; break;
        }
        console.log(`TwitterClient#getTweets(): endpoint=${endpoint}, parameter=${JSON.stringify(params)}`);

        return new Promise<Types.TweetEx[]>((resolve, reject) => {
            this.client.get(endpoint, params, function(error: any, tweets: any /*TwitterTypes.Tweet[]*/, response: any) {
                if (!error) {
                    console.log(`...${tweets.length}件取得しました`);
                    resolve(TwitterClient.alterTweet(tweets));
                } else {
                    reject(error);
                }
            });
        });
    }
    
 
    /**
     * ツイートを少し加工する。
     * 1. timestampLocal（"2018-08-11T12:34:45+0900"形式）を追加
     * 2. dateLocal("2018-08-11"形式)を追加
     * 3. serverTimestamp（"2018-08-11T12:34:45+0900"形式）を追加。これは取得日時
     * @param tweet 
     */
    static alterTweet(tweets: Types.Tweet[], serverTimestamp?: string): Types.TweetEx[] {
        const _serverTimestamp = serverTimestamp || TwitterClient.getCurrentTime();
        return tweets.map(tweet => {
            const timestamp = moment(new Date(tweet.created_at)).utcOffset(Config.tweetOption.utfOffset);
            return {...tweet, 
                timestampLocal: timestamp.format(),
                dateLocal: timestamp.format("YYYY-MM-DD"),
                serverTimestamp: _serverTimestamp
            };
        });
    }

    static getCurrentTime() {
        return moment().utcOffset(Config.tweetOption.utfOffset).format();
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
    static getMinimumId(tweets: Types.Tweet[]) {
        return tweets.map(x => x.id_str).reduce((prev, current) => TwitterClient.compareNumber(prev, current) < 0 ? prev : current);
    }

    /**
     * 与えられたツイートの中で最大のIDを取得
     * @param tweets 
     */
    static getMaxId(tweets: Types.Tweet[]) {
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
    static groupByDate(tweets: Types.Tweet[]) {
        const grouped = _.groupBy(tweets, "dateLocal");
        const dates = Object.keys(grouped);
        const result: {date: string, tweets: Types.Tweet[]}[] = [];
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