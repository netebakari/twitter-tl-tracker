import * as _ from "lodash";
import moment from "moment";

import * as env from "./env";
import * as Types from "./types";

/**
 * 現在時刻を "2018-08-11T12:34:45+0900" 形式で取得する（環境変数のutfOffsetを反映する）
 */
export const getCurrentTime = () => {
  return moment()
    .utcOffset(env.tweetOption.utfOffset)
    .format();
};

/**
 * ＊日本時間で＊ 現在日時からN日前の午前0時におけるstatus idを取得する
 * @param daysCount 何日遡るか。0なら当日
 */
export const getStatusId = (daysCount: number) => {
  const now = moment().utcOffset(env.tweetOption.utfOffset);
  const cinderellaTime = moment(`${now.format("YYYY-MM-DD")}T00:00:00+09:00`); // 今日の0時0分のUnixTime
  const unixTime = +cinderellaTime.format("X") - daysCount * 24 * 3600; // 求める日の0時0分のUnixTime
  const time = unixTime - 1288834974.657; // マジックナンバーを引く
  // これを22ビットシフトするとstatus idの下限になる
  return Math.floor(time * 1024 * 1024 * 4) + "000";
};

/**
 * 与えられたツイートの中で最小のIDを取得
 * @param tweets
 */
export const getMinimumId = (tweets: Types.Tweet[]) => {
  return tweets
    .map(x => x.id_str)
    .reduce((prev, current) =>
      compareNumber(prev, current) < 0 ? prev : current
    );
};

/**
 * 与えられたツイートの中で最大のIDを取得
 * @param tweets
 */
export const getMaxId = (tweets: Types.Tweet[]) => {
  return tweets
    .map(x => x.id_str)
    .reduce((prev, current) =>
      compareNumber(prev, current) > 0 ? prev : current
    );
};

/**
 * 2つの数値（文字型）を比較する
 * @param string1
 * @param string2
 * @return string1の方が大きければ正の値、string2の方が大きければ負の値、同じなら0（つまり string1 - string2 だと思えばいい）
 */
export const compareNumber = (string1: string, string2: string) => {
  if (string1.length > string2.length) {
    return 1;
  }
  if (string1.length < string2.length) {
    return -1;
  }
  if (string1 === string2) {
    return 0;
  }
  return string1 > string2 ? 1 : -1;
};

/**
 * ツイートを dateLocal の値でグループ分けする
 * @param tweets ツイートの配列。キーはツイートの日付（YYYY-MM-DD形式）
 */
export const groupByDate = (tweets: Types.TweetEx[]) => {
  const grouped = _.groupBy(tweets, "dateLocal");
  const dates = Object.keys(grouped);
  const result: { date: string; tweets: Types.TweetEx[] }[] = [];
  for (const date of dates) {
    result.push({ date: date, tweets: grouped[date] });
  }
  return result;
};
