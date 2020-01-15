import * as env from "./env";

/***
 * 環境変数をグループ分けして保持するクラス
 */

class TwitterToken {
    public readonly consumer_key: string;
    public readonly consumer_secret: string;
    public readonly access_token: string;
    public readonly access_token_secret: string;
    constructor() {
        this.consumer_key = env.twitter_consumer_key;
        this.consumer_secret = env.twitter_consumer_secret;
        this.access_token = env.twitter_access_token;
        this.access_token_secret = env.twitter_access_token_secret;
    }
}

class DynamoDb {
    public readonly region: string;
    public readonly tableName: string;
    public readonly ttlInDays: number;
    constructor() {
        this.region = env.dynamoDb_region;
        this.tableName = env.dynamoDb_tableName;
        this.ttlInDays = +env.dynamoDb_ttlInDays;
        if (this.ttlInDays === NaN) {
            throw new Error("environment variable 'dynamoDb_ttlInDays' is not a number");
        }
    }
}

class Sqs {
    public readonly region: string;
    public readonly queueUrl: string;
    constructor() {
        this.region = env.sqs_region;
        this.queueUrl = env.sqs_queueUrl;
    }
}

class S3 {
    public readonly region: string;
    public readonly bucket: string;
    public readonly fragmentKeyPrefix: string;
    public readonly dailyLogPrefix: string;
    constructor() {
        this.region = env.s3_region;
        this.bucket = env.s3_bucket;
        this.fragmentKeyPrefix = env.s3_fragmentKeyPrefix;
        this.dailyLogPrefix = env.s3_dailyLogPrefix;
    }
}

class Options {
    /**
     * 3が指定された場合、8/10 0:00を過ぎた時点で8/7のツイートがアーカイブされ、7日のツイートは取得・保存されなくなる
     */
    public readonly daysToArchive: number;
    public readonly includeFollowers: boolean;
    public readonly utfOffset: number;
    public readonly executeTimeInSeconds: number;
    public readonly myUserIdStr: string;
    constructor() {
        // const env = checkAndGet("options_daysToArchive", "options_includeFollowers", "options_utfOffset", "options_executeTimeInSeconds", "options_myUserIdStr");
        if (env.options_includeFollowers.toLowerCase() !== "true" && env.options_includeFollowers.toLowerCase() !== "false") {
            throw new Error("environment variable 'options_includeFollowers' is not a boolean");
        }
        this.daysToArchive = +env.options_daysToArchive;
        this.includeFollowers = (env.options_includeFollowers.toLowerCase() === "true");
        this.utfOffset = +env.options_utfOffset;
        this.executeTimeInSeconds = +env.options_executeTimeInSeconds;
        this.myUserIdStr = env.options_myUserIdStr;

        if (this.daysToArchive === NaN) {
            throw new Error("environment variable 'options_daysToArchive' is not a number");
        }
        if (this.utfOffset === NaN) {
            throw new Error("environment variable 'options_utfOffset' is not a number");
        }
        if (this.executeTimeInSeconds === NaN) {
            throw new Error("environment variable 'options_executeTimeInSeconds' is not a number");
        }

    }
}

const twitterToken = new TwitterToken();
const dynamoDb = new DynamoDb();
const sqs = new Sqs();
const s3 = new S3();
const tweetOption = new Options();

export {
    twitterToken,
    dynamoDb,
    sqs,
    s3,
    tweetOption
}
