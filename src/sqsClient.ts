import * as AWS from "aws-sdk"
import * as Config from "./config"
import * as Types from "./types"
const sqs = new AWS.SQS({region: Config.sqs.region});

export default class SqsClient {
    
    async send(userId: string) {

        const params = {
            MessageBody: userId,
            QueueUrl: Config.sqs.queueUrl,
            MessageGroupId: "TRACKER"
        };

        return sqs.sendMessage(params).promise();
    }

    async receiveMessage() {
        const params = {
            QueueUrl: Config.sqs.queueUrl,
            MaxNumberOfMessages: 1
        }
        const data = await sqs.receiveMessage(params).promise();
        if (Array.isArray(data.Messages) && data.Messages.length > 0) {
            return {userId: data.Messages[0].Body as string, receiptHandle: data.Messages[0].ReceiptHandle as string };
        } else {
            return null;
        }
    }

    async deleteMessage(receiptHandle: string) {
        const params = {
            QueueUrl: Config.sqs.queueUrl,
            ReceiptHandle: receiptHandle
        }
        const data = await sqs.deleteMessage (params).promise();

    }
}

