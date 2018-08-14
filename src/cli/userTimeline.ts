/**
 * コマンドラインからの実行用
 */

const module2 = require("../index")

const func2 = async (event: any) => {
    try {
        const result = await module2.userTL(event);
        console.log("OK!");
        console.log(result);
    }
    catch (e) {
        console.log("ERROR!");
        console.log(e);
    }
};

func2({});
