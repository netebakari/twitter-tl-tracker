# twitter-tl-tracker
Twitterのログを取る（なるべくたくさん）ためのクライアント。AWS Lambdaで実装している。

# モチベーション
UserStreamが死んでしまったので、それと同等のツイートのログを24時間取りたい。

# 実際にやること
他のクライアントと同様にホームTLを取得するだけでなく、自分のフォロイー全員のTLを巡回して全てのツイートを取得する。これによりUserStreamのall repliesオプションと同じようなTLを保存することを試みる。

サーバーレス。全ての処理はLambdaが行い、結果はS3に保存する。

# インストール
## 1. TwitterのAPIキーを取得
頑張ってください。

## 2. ログ保存用のS3バケットを作成する
新規作成しても構わないし既存のバケットを使っても構わない。

## 3. CloudFormationを実行
東京リージョンからは次のリンクで実行できる。 [CloudFormation](https://ap-northeast-1.console.aws.amazon.com/cloudformation/home?region=ap-northeast-1#/stacks/create/review?templateURL=https://netebakari.s3-ap-northeast-1.amazonaws.com/twitter-timeline-tracker/cloudformation.yaml&stackName=Twitter-TL-Tracker)

AWSの[コンソール](https://ap-northeast-1.console.aws.amazon.com/cloudformation/)から操作する場合は

テンプレートの指定 > テンプレートソース

で次のURLを入力する。

https://netebakari.s3-ap-northeast-1.amazonaws.com/twitter-timeline-tracker/cloudformation.yaml

設定するパラメーターは次の通り。
<table>
  <thead>
    <tr><th>名前</th><th>内容</th></tr>
  </thead>
  <tbody>
    <tr><th>AccessToken</th><td>TwitterのAccess Token</td></tr>
    <tr><th>AccessTokenSecret</th><td>TwitterのAccess Token Secret</td></tr>
    <tr><th>ConsumerKey</th><td>TwitterのConsumer Key</td></tr>
    <tr><th>ConsumerSecret</th><td>TwitterのConsumer Secret</td></tr>
    <tr><th>DaysToArchive</th><td>ツイートをアーカイブする日数。3に設定すると、8/20 0:00を迎えた時点で8/17のツイートがアーカイブ対象となり、8/17のツイートは新規に取得されなくなる</td></tr>
    <tr><th>DynamoDbTableName</th><td>TLをどこまで取得したかを管理するDynamoDBのテーブル名。新規に作成する</td></tr>
    <tr><th>IncludeFollowers</th><td>trueまたはfalseのいずれか。trueを指定すると自分のフォロワーのTLも取得する</td></tr>
    <tr><th>QueueName</th><td>ユーザーTLを取得するスケジュールを管理するために使うSQSのキュー名</td></tr>
    <tr><th>RoleName</th><td>Lambdaに割り当てるロール名</td></tr>
    <tr><th>S3BucketName</th><td>ツイートのログを保存するS3のバケット名</td></tr>
    <tr><th>TTLinDays</th><td>DynamoDBのTTL（日数。3なら72時間）</td></tr>
    <tr><th>TwitterUserId</th><td>自分のTwitterユーザーID。スクリーンネームではないので注意</td></tr>
    <tr><th>UploadedPackageBucketName</th><td>パッケージ(.zip)をアップロードしたS3のバケット名（デフォルト値でよい）</td></tr>
    <tr><th>UploadedPackageKeyName</th><td>パッケージ(.zip)のキー名（デフォルト値でよい）</td></tr>
    <tr><th>UtcOffsetInHours</th><td>日本時間なら9</td></tr>
  </tboby>
</table>

CLIからの場合は次のように実行する。

```sh
aws cloudformation create-stack \
  --stack-name TwitterTLTracker \
  --template-url "https://netebakari.s3-ap-northeast-1.amazonaws.com/twitter-timeline-tracker/cloudformation.yaml" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
                     ParameterKey=AccessToken,ParameterValue=___YOUR_ACCESS_TOKEN__ \
               ParameterKey=AccessTokenSecret,ParameterValue=___YOUR_ACCESS_TOKEN_SECRET__ \
                     ParameterKey=ConsumerKey,ParameterValue=___YOUR_CONSUMER_KEY__ \
                  ParameterKey=ConsumerSecret,ParameterValue=__YOUR_CONSUMER_SECRET__ \
                   ParameterKey=DaysToArchive,ParameterValue=4 \
               ParameterKey=DynamoDbTableName,ParameterValue=TwitterTLTracker-Timelines \
                ParameterKey=IncludeFollowers,ParameterValue=false \
                       ParameterKey=QueueName,ParameterValue=TwitterTLTracker-ScheduleQueue \
                        ParameterKey=RoleName,ParameterValue=TwitterTLTracker-Lambda \
                    ParameterKey=S3BucketName,ParameterValue=__YOUR_S3_BUCKET_NAME__ \
                       ParameterKey=TTLinDays,ParameterValue=4 \
                   ParameterKey=TwitterUserId,ParameterValue=__YOUR_TWITTER_ID__ \
       ParameterKey=UploadedPackageBucketName,ParameterValue=netebakari \
          ParameterKey=UploadedPackageKeyName,ParameterValue=twitter-timeline-tracker/timeline-tracker-latest.zip \
                ParameterKey=utcOffsetInHours,ParameterValue=9
```

## 4. CloudWatch Eventsを調整する
インストール直後は次のような実行間隔になっているが、必要に応じて調整する。それぞれのLambdaの処理内容は[Details.md](./Details.md)参照。

* `Twitter-TL-Tracker-HomeTimeline` : 2分おき
* `Twitter-TL-Tracker-userTL` : 2分おき
* `Twitter-TL-Tracker-QueueFiller` : 30分おき

## 5. 待つ
ツイートが指定したS3バケットに保存されていく。

# 実装の中身、パラメーター調整など
[Details.md](./Details.md)を参照
