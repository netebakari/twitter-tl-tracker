import * as dotenv from "dotenv";
dotenv.config();
 
// 指定した名前の環境変数を返す。定義されていなければ例外をスローする
const getEnv = (name: string) => {
    const result = process.env[name];
    if (result === undefined) {
        throw new Error(`environment variable "${name}" not defined`);
    }
    return result;
};

const twitter_consumer_key          = getEnv("twitter_consumer_key");
const twitter_consumer_secret       = getEnv("twitter_consumer_secret");
const twitter_access_token          = getEnv("twitter_access_token");
const twitter_access_token_secret   = getEnv("twitter_access_token_secret");
const dynamoDb_region               = getEnv("dynamoDb_region");
const dynamoDb_tableName            = getEnv("dynamoDb_tableName");
const dynamoDb_ttlInDays            = getEnv("dynamoDb_ttlInDays");
const sqs_region                    = getEnv("sqs_region");
const sqs_queueUrl                  = getEnv("sqs_queueUrl");
const s3_region                     = getEnv("s3_region");
const s3_bucket                     = getEnv("s3_bucket");
const options_daysToArchive         = getEnv("options_daysToArchive");
const options_includeFollowers      = getEnv("options_includeFollowers");
const options_utfOffset             = getEnv("options_utfOffset");
const options_executeTimeInSeconds  = getEnv("options_executeTimeInSeconds");
const options_myUserIdStr           = getEnv("options_myUserIdStr");

export {
    twitter_consumer_key,
    twitter_consumer_secret,
    twitter_access_token,
    twitter_access_token_secret,
    dynamoDb_region,
    dynamoDb_tableName,
    dynamoDb_ttlInDays,
    sqs_region,
    sqs_queueUrl,
    s3_region,
    s3_bucket,
    options_daysToArchive,
    options_includeFollowers,
    options_utfOffset,
    options_executeTimeInSeconds,
    options_myUserIdStr
};