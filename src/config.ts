/**
 * 環境変数の値を取得する。見つからなければ例外をスローする
 * @param names 
 */
const checkAndGet = (...names: string[]) => {
    const result: string[] = [];
    for(const name of names) {
        if (process.env[name] === undefined) {
            throw new Error(`environment variable '${name}' not found`);
        }
        result.push(process.env[name] as string);
    }
    return result;
}

const environmentVariableNames = [
    "twitter_consumer_key",
    "twitter_consumer_secret",
    "twitter_access_token",
    "twitter_access_token_secret",
    "dynamoDb_region",
    "dynamoDb_tableName",
    "dynamoDb_ttlInDays",
    "sqs_region",
    "sqs_queueUrl",
    "s3_region",
    "s3_bucket",
    "s3_fragmentKeyPrefix",
    "s3_dailyLogPrefix",
    "options_daysToArchive",
    "options_includeFollowers",
    "options_utfOffset",
    "options_executeTimeInSeconds",
    "options_myUserIdStr"
];

if (process.env["twitter_consumer_key"] === undefined) {
    // 絶対あるはずの twitter_consumer_key が見つからなければこれはローカル環境だと思うことにする
    environmentVariableNames.forEach(x => { process.env[x] = process.env[x] || process.env[`npm_package_config_${x}`]; });
}

class TwitterToken {
    public readonly consumer_key: string;
    public readonly consumer_secret: string;
    public readonly access_token: string;
    public readonly access_token_secret: string;
    constructor() {
        const env = checkAndGet("twitter_consumer_key", "twitter_consumer_secret", "twitter_access_token", "twitter_access_token_secret");
        this.consumer_key = env[0];
        this.consumer_secret = env[1];
        this.access_token = env[2];
        this.access_token_secret = env[3];
    }
}
class DynamoDb {
    public readonly region: string;
    public readonly tableName: string;
    public readonly ttlInDays: number;
    constructor() {
        const env = checkAndGet("dynamoDb_region", "dynamoDb_tableName", "dynamoDb_ttlInDays");
        this.region = env[0];
        this.tableName = env[1];
        this.ttlInDays = +(env[2]);
        if (this.ttlInDays === NaN) {
            throw new Error("environment variable 'dynamoDb_ttlInDays' is not a number");
        }
    }
}

class Sqs {
    public readonly region: string;
    public readonly queueUrl: string;
    constructor() {
        const env = checkAndGet("sqs_region", "sqs_queueUrl");
        this.region = env[0];
        this.queueUrl = env[1];
    }
}

class S3 {
    public readonly region: string;
    public readonly bucket: string;
    public readonly fragmentKeyPrefix: string;
    public readonly dailyLogPrefix: string;
    constructor() {
        const env = checkAndGet("s3_region", "s3_bucket", "s3_fragmentKeyPrefix", "s3_dailyLogPrefix");
        this.region = env[0];
        this.bucket = env[1];
        this.fragmentKeyPrefix = env[2];
        this.dailyLogPrefix = env[3];
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
        const env = checkAndGet("options_daysToArchive", "options_includeFollowers", "options_utfOffset", "options_executeTimeInSeconds", "options_myUserIdStr");
        if (env[1].toLowerCase() !== "true" && env[1].toLowerCase() !== "false") {
            throw new Error("environment variable 'options_includeFollowers' is not a boolean");
        }
        this.daysToArchive = +env[0];
        this.includeFollowers = (env[1].toLowerCase() === "true");
        this.utfOffset = +env[2];
        this.executeTimeInSeconds = +env[3];
        this.myUserIdStr = env[4];

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
