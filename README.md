# twitter-tl-tracker
Twitterのログを取りたい（なるべくたくさん）

# モチベーション
UserStreamが死んでしまったので少なくともそれと同等のツイートのログを取りたい

# 処理概要
* ホームTLを1分ごとに1回取得し、S3に格納する
  * 1分ごとでもいいけど同じAPIキーを何か他のことにも使い回しているなら2分おきが無難
  * 下手に使い回すと凍結されるという話があるのでむしろ1分おきが無難かも
* 自分がフォローしている人を一定時間（30分～1時間程度）おきに1回取得し、巡回するユーザーのリストを作成してSQSに突っ込む
* このリストに従い、ユーザーTLを取得してS3に格納する
* ホームTL・ユーザーTLのデータを後からマージして1日分のツイートのログとする
  * マージ処理は未実装

# 動作環境
全てAWS上で動作。

* Lambda 
  * 今のところ処理は全部Lambda(Node.js v8.10)で書いている
* SQS
  * 上述の「巡回するユーザーのリスト」を格納する場所として利用
  * 定期的に自分がフォローしている人のリストを作成し、ユーザーIDだけを書いたメッセージをSQSに投入
  * フォロイーだけではなく、ここに自分のフォロワーを加えることも可（ストーカー気質の人向け）
* DynamoDB
  * ホームTLおよびユーザーTLをどこまで取得したか管理するためにDynamoDBのテーブルを1件利用している
* S3
  * ツイートの出力先
  * 取得したツイートはJSON形式で `/fragments` 以下に格納する（Lambdaが1回起動するごとに1個作られる）
    * ホームTLは `/fragments/2018-08-20/TIMELINEv2_20180820.063923.920.json` のような名前
    * ユーザーTLは `/fragments/2018-08-20/USERv2_20180820.071617.530.json` のような名前
  * これを1日単位でマージして定期的に `/tweets` 以下に格納する

# インストール
## TwitterのAPIキーを取得
頑張ってください。

## ビルド
```
git clone https://github.com/netebakari/twitter-tl-tracker.git
cd twitter-tl-tracker
npm install
npx tsc
```

ビルドが通ったことを確認したら、不要なモジュールを除去した上でデプロイパッケージを作る。（この辺はどうやるのが正道なのかよく分からない...）

```
rm -rf node_modules/
npm install --production
npm run build
```

これで `myFunc.zip` が生成される。

## S3にアップロード
作ったパッケージをS3の適当な場所にアップロードしておく。

```
aws s3 cp myFunc.zip s3://your-bucket/tracker.zip
```

## CloudFormationを実行
AWSのコンソールから操作する。
https://ap-northeast-1.console.aws.amazon.com/cloudformation/

Create Stackから `cloudformation.yaml` をアップロードしてStackを作成する。設定しなくてはいけないパラメーターがいっぱいある。（TODO: 説明を書く）

* AccessToken
* AccessTokenSecret
* ConsumerKey
* ConsumerSecret
* DaysToArchive
* DynamoDbTableName
* IncludeFollowers
* QueueName
* RoleName
* S3BucketName
* TTLinDays
* TwitterUserId
* UploadedPackageBucketName
* UploadedPackageKeyName
* UtfOffsetInHours



* monitoring timeは1分程度に設定（0だとコケる）
* "I acknowledge that AWS CloudFormation might create IAM resources with custom names" にチェックを入れるのを忘れないようにする





# 作成されるもの
## Lambda
3つのLambdaが作成されるが、内容は全て同じ。実行されるハンドラだけが違う。

### Twitter-TL-Tracker-QueueFiller
* キュー埋めLambda
* ハンドラ: `index.hourlyTask`
* 自動実行: 30分～1時間おき

### Twitter-TL-Tracker-HomeTimeline
* ホームTL取得Lambda
* ハンドラ: `index.homeTimeline`
* 自動実行: 2分おき

### Twitter-TL-Tracker-UserTimeline
* ユーザーTL取得Lambda
* ハンドラ: `index.userTL`
* 自動実行: 5分おき（Configの設定に合わせる）
* メモリ: 320MB
  * 時間帯にもよるが、128MBだとギリギリかメモリが溢れて強制終了する。特に初回は全ユーザーの数日前からのツイートを取得しようとするため320MB程度があたりがオススメ。稼働を始めたら128MBにして多分大丈夫

# Todo
* マージ処理がクソ重たくて実用にならないのをなんとかする

# なぜなに
## Configにベタ書きするな、環境変数に書け
します

## 暗号化しろ
やりたくない
* 暗号化したいキーは最低2つ、できれば4つ
* ホームTLは2分おき＆ユーザーTLは5分おきに起動（＝1時間に合計42回）
* これをかけると1ヶ月あたり12万回でKMSの無料枠をはみ出す（キー1個分の料金とあわせて$1.3ぐらい）
* ログを取るためだけのものに出したくない気持ち

## マージ処理を書け
Lambdaでやるのは無理な気がしてきた
