/**
 * コマンドラインからの実行用
 */
import * as env from "../env";
const _module = require("../index");

(async() => {
    switch(process.argv[2]) {
        case "user":
            {
                const result = await _module.userTL(event);
                break;
            }

        case "home":
            {
                const result = await _module.homeTimeline(event);
                break;
            }

        case "snapshot":
            {
                const result = await _module.snapshot(event);
                break;
            }

        case "hourly":
            {
                const result = await _module.hourlyTask(event);
                break;
            }

        case "archive":
            {
                const result = await _module.archive(event);
                break;
            }

        default:
            {
                console.log("task: user, home, snapshot, hourly, archive");
                break;
            }
    }
})();
