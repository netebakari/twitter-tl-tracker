/**
 * コマンドラインからの実行用
 */

const module3 = require("../index")

const func3 = async (event: any) => {
    try {
        const result = await module3.homeTimeline(event);
        console.log("OK!");
        console.log(result);
    }
    catch (e) {
        console.log("ERROR!");
        console.log(e);
    }
};

func3({});
