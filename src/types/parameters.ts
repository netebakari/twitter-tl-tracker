import * as util from "./util";

/**
 * 特定のユーザーを指定する値。screenNameかidのどちらかで指定する
 */
export type UserParamType = { screenName: string } | { userId: string };

/**
 * 複数のユーザーを指定する値。screenNameかidのどちらかで指定する
 */
export type UsersParamType = { screenNames: string[] } | { userIds: string[] };

/**
 * DBのレコード
 */
export type UserOnDb = {
  id_str: string;
  screenName: string;
  name: string;
  sinceId: string;
  updatedAt: string;
  TTL?: number;
};

export function assertsUserOnDb(arg: any): asserts arg is UserOnDb {
  util.mustBeObject(arg);
  util.mustBeString(arg, "id_str");
  util.mustBeString(arg, "screenName");
  util.mustBeString(arg, "sinceId");
  util.mustBeString(arg, "updatedAt");
  util.mustBeNumber(arg, "ttl", true);
}
