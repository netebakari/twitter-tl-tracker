import * as AWS from "aws-sdk";

import * as env from "./env";
const sqs = new AWS.SQS({ region: env.sqs.region });

/**
 * IDをSQSに送信する
 * @param userIds 10件までのユーザーIDの配列。重複はないことを前提
 */
export const send = async (userIds: string[]) => {
  // 時刻は13文字
  const timestamp = new Date().getTime();

  const params: AWS.SQS.SendMessageBatchRequest = {
    Entries: userIds.map((id) => {
      return {
        Id: `${id}_${timestamp}`,
        MessageBody: id,
      };
    }),
    QueueUrl: env.sqs.queueUrl,
  };

  return sqs.sendMessageBatch(params).promise();
};

export const receiveMessage = async () => {
  const params = {
    QueueUrl: env.sqs.queueUrl,
    MaxNumberOfMessages: 1,
  };
  const data = await sqs.receiveMessage(params).promise();
  if (Array.isArray(data.Messages) && data.Messages.length > 0) {
    return {
      userId: data.Messages[0].Body as string,
      receiptHandle: data.Messages[0].ReceiptHandle as string,
    };
  } else {
    return null;
  }
};

export const deleteMessage = async (receiptHandle: string) => {
  const params = {
    QueueUrl: env.sqs.queueUrl,
    ReceiptHandle: receiptHandle,
  };
  return sqs.deleteMessage(params).promise();
};

/**
 * キューに入っているメッセージの数を返す
 */
export const getMessageCount = async () => {
  const params: AWS.SQS.GetQueueAttributesRequest = {
    QueueUrl: env.sqs.queueUrl,
    AttributeNames: ["ApproximateNumberOfMessages"],
  };

  const data = await sqs.getQueueAttributes(params).promise();
  if (data === undefined || data.Attributes === undefined) {
    throw new Error("キューの取得に失敗しました");
  }
  return +data.Attributes["ApproximateNumberOfMessages"];
};
