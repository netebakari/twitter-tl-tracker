const twitterToken = {
    consumer_key:        'xxxxxxxxxxxxxxxxxxxxxxxxx',
    consumer_secret:     'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    access_token:        'xxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    access_token_secret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
}

const dynamoDb = {
    region: "ap-northeast-1",
    tableName: "TLTracker-Users",
    ttlInDays: 3
}

const sqs = {
    region: "us-west-2",
    queueUrl: "https://sqs.us-west-2.amazonaws.com/999999999999/TLTracker-Users.fifo"
}

const s3 = {
    region: "ap-northeast-1",
    bucket: "YOUR-BUCKET-NAME",
    fragmentKeyPrefix: "fragments/",
    dailyLogPrefix: "tweets/"
}

const tweetOption = {
    daysToArchive: 3, // 3が指定された場合、8/10 0:00を過ぎた時点で8/7のツイートがアーカイブされ、7日のツイートは保存されなくなる
    includeFollowers: true,
    utfOffset: 9,
    executeTimeInSeconds: 180 // ユーザーTL取得処理を最大何秒実行するか
}

export {
    twitterToken,
    dynamoDb,
    sqs,
    s3,
    tweetOption
}
