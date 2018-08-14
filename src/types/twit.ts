export declare interface FriendsFollowersIdResult {
    ids: Array<string>;
    next_cursor: number;
    next_cursor_str: string;
    previous_cursor: number;
    previous_cursor_str: string    
}

export declare interface Tweet {
    created_at: string;
    id: number;
    id_str: string;
    full_text: string;
    truncated: boolean;
    user: TwitterUser;
    is_quote_status: boolean;
    in_reply_to_status_id?: number;
    in_reply_to_status_id_str?: string;
    in_reply_to_user_id?: number;
    in_reply_to_user_id_str?: string;
    in_reply_to_screen_name?: string;
    timestampLocal: string;
    dateLocal: string;
    serverTimestamp: string;
}
export declare interface TwitterUser {
    id: number;
    id_str: string;
    name: string;
    screen_name: string;
    location: string;
    description: string;
    url: string;
    //entities: [Object],
    protected: boolean;
    followers_count: number;
    friends_count: number;
    listed_count: number;
}