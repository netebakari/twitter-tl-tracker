/**
 * コマンドラインからの実行用
 */
import TwitterClient from "../twitterClient";
import * as env from "../env";

(async() => {
    const client = new TwitterClient();
    const myself = await client.lookupUsers([env.options_myUserIdStr]);
    console.log(myself.users);
})();
