import * as env from "./env";

/***
 * 環境変数をグループ分けして保持するモジュール。値のチェック（数値型である必要がある環境変数は数値にするとか）もやる
 */

export const twitterToken = {
    consumer_key: env.twitter_consumer_key,
    consumer_secret: env.twitter_consumer_secret,
    access_token: env.twitter_access_token,
    access_token_secret: env.twitter_access_token_secret
};

export const dynamoDb = {
    region: env.dynamoDb_region,
    tableName: env.dynamoDb_tableName,
    ttlInDays: +env.dynamoDb_ttlInDays
};

if (dynamoDb.ttlInDays === NaN) {
    throw new Error("environment variable 'dynamoDb_ttlInDays' is not a number");
}

export const sqs = {
    region: env.sqs_region,
    queueUrl: env.sqs_queueUrl
};

export const s3 = {
    region: env.s3_region,
    bucket: env.s3_bucket,
    fragmentKeyPrefix: env.s3_fragmentKeyPrefix,
    dailyLogPrefix: env.s3_dailyLogPrefix
};

export const tweetOption = {
    daysToArchive: +env.options_daysToArchive,
    includeFollowers: (env.options_includeFollowers.toLowerCase() === "true"),
    utfOffset: +env.options_utfOffset,
    executeTimeInSeconds: +env.options_executeTimeInSeconds,
    myUserIdStr: env.options_myUserIdStr
};

if (env.options_includeFollowers.toLowerCase() !== "true" && env.options_includeFollowers.toLowerCase() !== "false") {
    throw new Error("environment variable 'options_includeFollowers' is not a boolean");
}
if (tweetOption.daysToArchive === NaN) {
    throw new Error("environment variable 'options_daysToArchive' is not a number");
}
if (tweetOption.utfOffset === NaN) {
    throw new Error("environment variable 'options_utfOffset' is not a number");
}
if (tweetOption.executeTimeInSeconds === NaN) {
    throw new Error("environment variable 'options_executeTimeInSeconds' is not a number");
}
