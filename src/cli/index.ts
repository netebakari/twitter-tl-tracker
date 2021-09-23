// eslint-disable-next-line @typescript-eslint/no-var-requires
const _module = require("../index");
// import * as _module from "../index";
import * as client from "../twitterClient";
const _event: any = {};

/**
 * コマンドラインからの実行用
 */
const go = async () => {
  switch (process.argv[2]) {
    case "user": {
      const result = await _module.userTL(_event);
      console.log(result);
      break;
    }

    case "home": {
      const result = await _module.homeTimeline(_event);
      console.log(result);
      break;
    }

    case "snapshot": {
      const result = await _module.snapshot(_event);
      console.log(result);
      break;
    }

    case "hourly": {
      const result = await _module.hourlyTask(_event);
      console.log(result);
      break;
    }

    case "archive": {
      _event.destPath = process.argv[3];
      _event.daysToBack = +process.argv[4];
      if (_event.daysToBack !== _event.daysToBack) {
        throw new Error("引数に数値を与えてください");
      }
      const result = await _module.archive(_event);
      console.log(_event);
      break;
    }

    default: {
      console.log("task: user, home, snapshot, hourly, archive");
      break;
    }
  }
};

(async () => {
  go();
})();
