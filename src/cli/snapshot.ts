/**
 * コマンドラインからの実行用
 */

const module6 = require("../index")

const func6 = async (event: any) => {
    try {
        const result = await module6.snapshot(event);
        console.log("OK!");
        console.log(result);
    }
    catch (e) {
        console.log("ERROR!");
        console.log(e);
    }
};

func6({});
