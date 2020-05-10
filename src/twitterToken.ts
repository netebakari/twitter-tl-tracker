import * as dotenv from "dotenv";
dotenv.config();

/**
 * 指定した名前の環境変数を返す。定義されていなければ例外をスローする
 */
const getEnv = (name: string) => {
  const result = process.env[name];
  if (result === undefined) {
    throw new Error(`environment variable "${name}" is not defined`);
  }
  return result;
};

const twitter_consumer_key = getEnv("twitter_consumer_key");
const twitter_consumer_secret = getEnv("twitter_consumer_secret");
const twitter_access_token = getEnv("twitter_access_token");
const twitter_access_token_secret = getEnv("twitter_access_token_secret");

export const twitterToken = {
  consumer_key: twitter_consumer_key,
  consumer_secret: twitter_consumer_secret,
  access_token: twitter_access_token,
  access_token_secret: twitter_access_token_secret,
};
