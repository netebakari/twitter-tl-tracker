# twitter-tl-tracker
Twitterのログを取りたい（なるべくたくさん）

# モチベーション
UserStreamが死んでしまったので少なくともそれと同等のツイートのログを取りたい（なるべく）

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
    <tr><th>UtfOffsetInHours</th><td>日本時間なら9</td></tr>
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
                ParameterKey=UtfOffsetInHours,ParameterValue=9
```

## 4. CloudWatch Eventsを調整する
現在は次のような実行間隔になっているが、必要に応じて調整する。

* `Twitter-TL-Tracker-HomeTimeline` : 2分おき
* `Twitter-TL-Tracker-userTL` : 2分おき
* `Twitter-TL-Tracker-QueueFiller` : 30分おき

## 5. 待つ
ツイートがS3に保存されていく。

# 処理概要＆構成
Lambda4つで構成してある。

## 1. ホームTL取得Lambda
* ホームTLをLambdaで1～2分ごとに1回取得し、S3に格納する
  * 1分ごとでもいいけど、同じAPIキーを何か他のことにも使い回しているなら2分おきが無難

## 2. スケジュール作成Lambda
* 自分のフォロイーを一定時間（30分～1時間程度）おきに1回取得し、巡回するユーザーのリストを作成してSQSに突っ込む
* これがユーザーTL取得のスケジュールとなる
* SQSには常時たくさんメッセージが入っているようにする

## 3. ユーザーTL取得Lambda
* 5分おきにSQSのキューからメッセージ（ユーザーIDが書いてある）を取得し、その人のユーザーTLを取得してS3に格納する
* 呼び出しレート（15分で900回）を守るように適当に回数調整をする
* 前回どこまでツイートを取得したかはDynamoDBで管理
* フォロイーだけではなく、フォロワーを取得対象に加えることも可（ストーカー気質の人向け）

## 4. マージ処理
1と3が吐いた全てのファイルを結合し、ソートして重複を排除して1個のファイルに書き出す。

# ツイート保存先
* ホームTLは `s3://YOUR-BUCKET-NAME/raw/2020-12-31/20201231.235959.999.json` のような名前
* ユーザーTLは `s3://YOUR-BUCKET-NAME/raw/user/2020-12-31/20201231.235959.999_123456789012345678.json` のような名前
  * どちらも時刻をミリ秒までつけてキーがユニークになるようにしている。時刻そのものにあまり意味はない


# CloudFormationによって作成されるもの
## SQS
上述の通り、スケジュール管理に使っている

## DynamoDB
primary keyは `id_str` で、ユーザーの簡単な情報と、取得済みの最新ツイートのID(`sinceId`)を保存している。
ホームTLでも同様の目的で使っていて、そのレコードは `id_str` が `TIMELINE` の固定文字。
RCU/WCUは5にしているが、レコードのサイズが極端に小さいため3でも間に合いそう。

## Lambda
4つのLambdaが作成されるが、内容は全て同じ。名前、実行されるハンドラ、割り当てるメモリが違う。

### Twitter-TL-Tracker-HomeTimeline
* ホームTL取得Lambda
* ハンドラ: `index.homeTimeline`
* 自動実行: 2分おき
* メモリ: 256MB

### Twitter-TL-Tracker-userTL
* ユーザーTL取得Lambda
* ハンドラ: `index.userTL`
* 自動実行: 2分おき
* メモリ: 320MB
  * 時間帯にもよるが、128MBだと大抵メモリが溢れて強制終了する。特に初回は全ユーザーの数日前からのツイートを取得しようとするため320MB程度があたりがオススメ。稼働を始めたら128MBにして多分大丈夫

### Twitter-TL-Tracker-QueueFiller
* スケジュール作成Lambda
* ハンドラ: `index.hourlyTask`
* 自動実行: 30分～1時間おき
* メモリ: 320MB

### Twitter-TL-Tracker-merger
* ツイートマージLambda
* ハンドラ: `index.archive`
* 自動実行: 1日1回
* メモリ: 1GB

## IAM Role
Lambdaに割り当てるためのロール。最低限必要な権限だけを設定してある。

# なぜなに
## 暗号化しろ
やりたくない
* 暗号化したいキーは最低2つ、できれば4つ
* ホームTLは2分おき＆ユーザーTLは5分おきに起動（＝1時間に合計42回）
* これをかけると1ヶ月あたり12万回でKMSの無料枠をはみ出す（キー1個分の料金とあわせて$1.3ぐらい）
* ログを取るためだけのものに出したくない気持ち

# Todo
* likeの定期取得＆差分抽出
* フォロワー＆フォロイーの定期取得＆差分抽出
  * UserStreamのEvent通知の代わりにしたい

# リリースノート
## v1.1.0
事実上の初回リリース

## v1.1.1
CloudFormationでLambdaの自動実行もやるようにした

## v1.1.2
ツイートマージ処理を追加
