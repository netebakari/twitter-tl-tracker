/**
 * コマンドラインからの実行用
 */

const module5 = require("../index")

const func5 = async (event: any) => {
    try {
        const result = await module5.archive(event);
        console.log("OK!");
        console.log(result);
    }
    catch (e) {
        console.log("ERROR!");
        console.log(e);
    }
};

func5({});
