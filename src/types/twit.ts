import * as twit from "twit";

/**
 * 手抜き
 * @param arg 
 */
export const isTweet = (arg: any): arg is twit.Twitter.Status => {
    if (!arg) { return false; }
    if (typeof(arg) !== "object") { return false; }
    if (typeof(arg.id) !== "number") { return false; }
    if (typeof(arg.id_str) !== "string") { return false; }

    return true;
}

export const isTweets = (arg: any): arg is twit.Twitter.Status[] => {
    if (!Array.isArray(arg)) { return false; }
    return (arg.every(x => isTweet(x)));
}

/**
 * 手抜き
 * @param arg 
 */
export const isUser = (arg: any): arg is twit.Twitter.User => {
    if (!arg) { return false; }
    if (typeof(arg) !== "object") { return false; }
    if (typeof(arg.id) !== "number") { return false; }
    if (typeof(arg.id_str) !== "string") { return false; }
    if (typeof(arg.name) !== "string") { return false; }

    return true;
}

export const isUsers = (arg: any): arg is twit.Twitter.User[] => {
    if (!Array.isArray(arg)) { return false; }
    return (arg.every(x => isUser(x)));
}