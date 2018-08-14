export declare interface ConfigRecordType {
    Provider: string;
    lastId: string;
    screenNames: string[];
    keywords: string[];
}

export declare interface UserType {
    screenName?: string;
    userId?: string
}

export declare interface UserOnDb {
    id_str: string;
    screenName: string;
    name: string;
    sinceId: string;
    updatedAt: string;
    TTL: number;
}