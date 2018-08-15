/**
 * コマンドラインからの実行用
 */

const module4 = require("../index")

const func4 = async (event: any) => {
    try {
        const result = await module4.hourlyTask(event);
        console.log("OK!");
        console.log(result);
    }
    catch (e) {
        console.log("ERROR!");
        console.log(e);
    }
};

func4({});
