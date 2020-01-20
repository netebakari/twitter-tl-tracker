import * as AWS from "aws-sdk"
import * as Types from "./types"
import * as env from "./env";
import * as _ from "lodash";
import moment from "moment";
const dynamoClient = new AWS.DynamoDB.DocumentClient({region: env.dynamoDb.region, convertEmptyValues: true});

export default class DynamoDbClient {
    /**
     * タイムラインのsinceIdを保存しているレコード（id_strは"TIMELINE"固定）を取得する
     */
    async getTimelineRecord() {
        return await this.getUserById("TIMELINE");
    }

    /**
     * タイムラインのsinceIdを保存しているレコード（id_strは"TIMELINE"固定）を更新する。TTLは付けない
     */
    async updateTImelineRecord(sinceId: string) {
        const now = moment().utcOffset(env.tweetOption.utfOffset);
        const record: Types.UserOnDb = {
            id_str: "TIMELINE",
            name: "*My Timeline*",
            screenName: "*My Timeline*",
            sinceId: sinceId,
            updatedAt: now.format()
        };
        return dynamoClient.put({TableName: env.dynamoDb.tableName, Item: record}).promise();
    }

    /**
     * ユーザーのレコードを取得する。見つけられなければnull
     */
    async getUserById(id_str: string) {
        const data = await dynamoClient.query({
            TableName: env.dynamoDb.tableName,
            KeyConditionExpression: "id_str = :val",
            ExpressionAttributeValues: {':val': id_str }
        }).promise();
    
        if (!data || !Array.isArray(data.Items) || data.Items.length === 0) {
            return null;
        }

        const found = data.Items[0];
        if (Types.isUserOnDb(found)) {
            return found;
        } else {
            console.error("DynamoDB record found but type guard function returns false");
            console.error(JSON.stringify(found));
            return null;
        }
    }

    /**
     * ユーザーのレコードを更新する。設定されたTTLを付与する
     */
    async putUser(id_str: string, screenName: string, name: string, sinceId: string) {
        const now = moment().utcOffset(env.tweetOption.utfOffset);
        const ttl = +now.format("X") + env.dynamoDb.ttlInDays*24*3600;
        const record: Types.UserOnDb = {
            id_str: id_str,
            screenName: screenName,
            name: name,
            sinceId: sinceId,
            updatedAt: now.format(),
            TTL: ttl
        };
        return dynamoClient.put({TableName: env.dynamoDb.tableName, Item: record}).promise();
    }
}
