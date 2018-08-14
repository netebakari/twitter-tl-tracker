/**
 * コマンドラインからの実行用
 */

const module1 = require("../index")

const func1 = async (event: any) => {
    try {
        const result = await module1.handler(event);
        console.log("OK!");
        console.log(result);
    }
    catch (e) {
        console.log("ERROR!");
        console.log(e);
    }
};

func1({});
