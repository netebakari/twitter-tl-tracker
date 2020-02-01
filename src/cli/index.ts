// import * as env from "../env";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const _module = require("../index");
// import * as _module from "../index";
const _event = {};

/**
 * コマンドラインからの実行用
 */
(async () => {
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
      const result = await _module.archive(_event);
      console.log(result);
      break;
    }

    default: {
      console.log("task: user, home, snapshot, hourly, archive");
      break;
    }
  }
})();
