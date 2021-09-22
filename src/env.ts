/* eslint-disable prettier/prettier */
import * as dotenv from "dotenv";
dotenv.config();

// 指定した名前の環境変数を返す。定義されていなければ例外をスローする
const getEnv = (name: string) => {
  const result = process.env[name];
  if (result === undefined) {
    throw new Error(`environment variable "${name}" is not defined`);
  }
  return result;
};

const getEnvAsBoolean = (name: string) => {
  const result = getEnv(name).toLowerCase();
  if (result === "true") {
    return true;
  }
  if (result === "false") {
    return false;
  }
  throw new Error(`environment variable "${name}" is not a boolean`);
};

const getEnvAsInteger = (name: string) => {
  const result = getEnv(name);
  const num = +result;
  if (num !== num) {
    throw new Error(`environment variable "${name}" is not a number`);
  }
  if (Math.floor(num) != num) {
    throw new Error(`environment variable "${name}" is not a integer`);
  }
  return num;
};

const dynamoDb_region               = getEnv("dynamoDb_region");
const dynamoDb_tableName            = getEnv("dynamoDb_tableName");
const dynamoDb_ttlInDays            = getEnvAsInteger("dynamoDb_ttlInDays");
const sqs_region                    = getEnv("sqs_region");
const sqs_queueUrl                  = getEnv("sqs_queueUrl");
const s3_region                     = getEnv("s3_region");
const s3_bucket                     = getEnv("s3_bucket");
const options_daysToArchive         = getEnvAsInteger("options_daysToArchive");
const options_includeFollowers      = getEnvAsBoolean("options_includeFollowers");
const options_utcOffset             = getEnvAsInteger("options_utcOffset");
const options_myUserIdStr           = getEnv("options_myUserIdStr");

export const dynamoDb = {
  region: dynamoDb_region,
  tableName: dynamoDb_tableName,
  ttlInDays: dynamoDb_ttlInDays
};

export const sqs = {
  region: sqs_region,
  queueUrl: sqs_queueUrl
};

export const s3 = {
  region: s3_region,
  bucket: s3_bucket
};

export const tweetOption = {
  daysToArchive: options_daysToArchive,
  includeFollowers: options_includeFollowers,
  utcOffset: options_utcOffset,
  myUserIdStr: options_myUserIdStr
};
