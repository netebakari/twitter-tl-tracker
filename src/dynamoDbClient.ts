import * as AWS from "aws-sdk"
import * as LambdaType from 'aws-lambda'
import * as Types from "./types"
import * as TwitterTypes from "./types/twit"
import * as _ from "lodash";
import * as Config from "./config"
import moment from "moment";
const dynamoClient = new AWS.DynamoDB.DocumentClient({region: Config.dynamoDb.region, convertEmptyValues: true});
const dynamo = new AWS.DynamoDB({region: Config.dynamoDb.region});

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
        const now = moment().utcOffset(Config.tweetOption.utfOffset);
        return dynamoClient.put({TableName: Config.dynamoDb.tableName, Item: {
            id_str: "TIMELINE",
            sinceId: sinceId,
            updatedAt: now.format(),
        }}).promise();
    }

    /**
     * ユーザーのレコードを取得する。見つけられなければnull
     */
    async getUserById(id_str: string) {
        const data = await dynamoClient.query({
            TableName: Config.dynamoDb.tableName,
            KeyConditionExpression: "id_str = :val",
            ExpressionAttributeValues: {':val': id_str }
        }).promise();
    
        if (!data || !Array.isArray(data.Items) || data.Items.length === 0) {
            return null;
        }
    
        return data.Items[0] as Types.UserOnDb;
    }

    /**
     * ユーザーのレコードを更新する。設定されたTTLを付与する
     */
    async putUser(id_str: string, screenName: string, name: string, sinceId: string) {
        const now = moment().utcOffset(Config.tweetOption.utfOffset);
        const ttl = +now.format("X") + Config.dynamoDb.ttlInDays*24*3600;
        return dynamoClient.put({TableName: Config.dynamoDb.tableName, Item: {
            id_str: id_str,
            screenName: screenName,
            name: name,
            sinceId: sinceId,
            updatedAt: now.format(),
            TTL: ttl
        }}).promise();
    }
}
