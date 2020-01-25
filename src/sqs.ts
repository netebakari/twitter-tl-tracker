import * as AWS from "aws-sdk"
import * as env from "./env"
const sqs = new AWS.SQS({ region: env.sqs.region });

export const send = async (userId: string) => {
    const params = {
        MessageBody: userId,
        QueueUrl: env.sqs.queueUrl
    };

    return sqs.sendMessage(params).promise();
};

export const receiveMessage = async () => {
    const params = {
        QueueUrl: env.sqs.queueUrl,
        MaxNumberOfMessages: 1
    }
    const data = await sqs.receiveMessage(params).promise();
    if (Array.isArray(data.Messages) && data.Messages.length > 0) {
        return { userId: data.Messages[0].Body as string, receiptHandle: data.Messages[0].ReceiptHandle as string };
    } else {
        return null;
    }
}

export const deleteMessage = async (receiptHandle: string) => {
    const params = {
        QueueUrl: env.sqs.queueUrl,
        ReceiptHandle: receiptHandle
    }
    return sqs.deleteMessage(params).promise();
}

/**
 * キューに入っているメッセージの数を返す
 */
export const getMessageCount = async () => {
    const params = {
        QueueUrl: env.sqs.queueUrl,
        AttributeNames: ["ApproximateNumberOfMessages"]
    };

    const data = await sqs.getQueueAttributes(params).promise();
    if (data === undefined || data.Attributes === undefined) { throw new Error("キューの取得に失敗しました"); }
    return +data.Attributes["ApproximateNumberOfMessages"];
}


