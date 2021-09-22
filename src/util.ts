import * as _ from "lodash"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
dayjs.extend(utc)
import * as env from "./env"
import * as Types from "./types"

/**
 * 現在時刻を "2021-09-22T12:34:45+0900" 形式で取得する（環境変数のutfOffsetを反映する）
 */
export const getCurrentTime = () => {
  // return moment().utcOffset(env.tweetOption.utfOffset).format();
  return dayjs().utcOffset(env.tweetOption.utfOffset).format();
};

/**
 * （指定されたタイムゾーンで）現在日時からN日前の午前0時におけるstatus idを取得する
 * @param daysCount 何日遡るか。0なら当日
 * @param now_ テスト用。基準となる現在日時
 * @returns 
 */
export const getStatusId = (daysCount: number, now_?: Date) => {
  const now = dayjs(now_).utcOffset(env.tweetOption.utfOffset);
  // 指定したタイムゾーンの本日0:00
  const cinderellaTime = now.add(-now.get("hour"), "hour").add(-now.get("minute"), "minute").add(-now.get("second"), "second");
  const unixTime = cinderellaTime.unix() - daysCount * 24 * 3600; // 求める日の0時0分のUnixTime
  const time = unixTime - 1288834974.657; // マジックナンバーを引く
  // これを22ビットシフトするとstatus idの下限になる
  return Math.floor(time * 1024 * 1024 * 4) + "000";
};

/**
 * 与えられたツイートの中で最小のIDを取得
 * @param tweets
 */
export const getMinimumId = (tweets: Types.Tweet[]) => {
  return tweets.map((x) => x.id_str).reduce((prev, current) => (compareNumber(prev, current) < 0 ? prev : current));
};

/**
 * 与えられたツイートの中で最大のIDを取得
 * @param tweets
 */
export const getMaxId = (tweets: Types.Tweet[]) => {
  return tweets.map((x) => x.id_str).reduce((prev, current) => (compareNumber(prev, current) > 0 ? prev : current));
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

/**
 * Dateオブジェクトが渡されたときにだけDayjsオブジェクトを返す
 * @param date 
 * @returns 
 */
export const dateToMoment = (date?: Date): dayjs.Dayjs | undefined => {
  if (!date) {
    return undefined;
  }
  try {
    return dayjs(date);
  } catch (e) {
    return undefined;
  }
};
