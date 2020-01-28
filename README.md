# twitter-tl-tracker
Twitterのログを取りたい（なるべくたくさん）

# モチベーション
UserStreamが死んでしまったので少なくともそれと同等のツイートのログを取りたい（なるべく）

# 実際にやること
他のクライアントと同様にホームTLを取得するだけでなく、自分のフォロイー全員のTLを巡回して全てのツイートを取得する。これによりUserStreamのall repliesオプションと同じようなTLを保存することを試みる。

サーバーレス。全ての処理はLambdaが行い、結果はS3に保存する。

# 処理概要＆構成
Lambda3つで構成してある。

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
**未実装。** 1と3が吐いた全てのファイルを結合し、ソートして重複を排除して1個のファイルに書き出す

# ツイート保存先
* ホームTLは `s3://YOUR-BUCKET-NAME/raw/2020-01-20/20200120.074634.845.json` のような名前
* ユーザーTLは `s3://YOUR-BUCKET-NAME/raw/user/2020-01-20/20200120.032328.128_859217111108829184.json` のような名前

# インストール
## 1. TwitterのAPIキーを取得
頑張ってください。

## 2. ビルド＆アップロード
自分でやりたい人向け。使うだけの人はステップ3にスキップ。

```
git clone https://github.com/netebakari/twitter-tl-tracker.git
cd twitter-tl-tracker
./build.sh
```

これで `timeline-tracker-1.1.0.zip` が生成されるのでS3の適当な場所にアップロードしておく。

```
aws s3 cp myFunc.zip s3://YOUR-BUCKET-NAME/myFunc.zip
```

## 3. CloudFormationを実行
AWSのコンソールから操作する。東京リージョンでなくてもいい。

https://ap-northeast-1.console.aws.amazon.com/cloudformation/

テンプレートの指定 > テンプレートソース に次のURLを入力する。

https://netebakari.s3-ap-northeast-1.amazonaws.com/twitter-timeline-tracker/cloudformation-1.1.0.yaml

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
    <tr><th>DynamoDbTableName</th><td>TLをどこまで取得したかを管理するDynamoDBのテーブル名</td></tr>
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

## 5. CloudWatch Eventsを調整する
現在は次のような実行間隔になっているが、必要に応じて調整する。

* `Twitter-TL-Tracker-HomeTimeline` : 2分おき
* `Twitter-TL-Tracker-userTL` : 2分おき
* `Twitter-TL-Tracker-QueueFiller` : 30分おき

### 注意点
* "I acknowledge that AWS CloudFormation might create IAM resources with custom names" にチェックを入れるのを忘れないようにする
* 既存のS3バケットを使いたい場合は次の手順に従う
  1. とりあえず適当な名前のS3バケット名を指定してstackを作成
  1. バケットを削除
  1. Lambdaの環境変数を修正
  1. IAM Roleの記述を修正

# CloudFormationによって作成されるもの
## SQS
上述の通り、スケジュール管理に使っている

## DynamoDB
primary keyは `id_str` で、ユーザーの簡単な情報と、取得済みの最新ツイートのID(`sinceId`)を保存している。
ホームTLでも同様の目的で使っていて、そのレコードは `id_str` が `TIMELINE` の固定文字。
RCU/WCUは5にしているが、レコードのサイズが極端に小さいため3でも間に合いそう。

## Lambda
3つのLambdaが作成されるが、内容は全て同じ。名前、実行されるハンドラ、割り当てるメモリが違う。

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

## IAM Role
Lambdaに割り当てるためのロール。最低限必要な権限だけを設定してある。

# なぜなに
## 暗号化しろ
やりたくない
* 暗号化したいキーは最低2つ、できれば4つ
* ホームTLは2分おき＆ユーザーTLは5分おきに起動（＝1時間に合計42回）
* これをかけると1ヶ月あたり12万回でKMSの無料枠をはみ出す（キー1個分の料金とあわせて$1.3ぐらい）
* ログを取るためだけのものに出したくない気持ち

## マージ処理を書け
やる

# Todo
* likeの定期取得＆差分抽出
* フォロワー＆フォロイーの定期取得＆差分抽出
  * UserStreamのEvent通知の代わりにしたい


# リリースノート
## v1.1.0
事実上の初回リリース
