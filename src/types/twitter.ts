// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/twit/index.d.ts

/*
// Type definitions for twit 2.2
// Project: https://github.com/ttezel/twit
// Definitions by: Volox <https://github.com/Volox>
//                 sapphiredev <https://github.com/sapphiredev>
//                 abraham <https://github.com/abraham>
//                 siwalik <https://github.com/siwalikm>
//                 plhery <https://github.com/plhery>
//                 justGoscha <https://github.com/justgoscha>
//                 darkade <https://github.com/darkade>
//                 brianjychan <https://github.com/brianjychan>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.3

// <reference types="node" />
// <reference types="geojson" />
*/

import * as util from "./util";
import * as ApiStatusType from "./apiStatus";
export type StreamEndpoint = "statuses/filter" | "statuses/sample" | "statuses/firehose" | "user" | "site";
export type ResultType = "mixed" | "popular" | "recent";

/**
 * @see https://dev.twitter.com/overview/api/tweets#obj-contributors
 */
export interface Contributors {
  id: number;
  id_str: string;
  screen_name: string;
}

/**
 * @see https://dev.twitter.com/overview/api/entities
 */
export interface HashtagEntity {
  indices: [number, number];
  text: string;
}

export interface Size {
  h: number;
  w: number;
  resize: "crop" | "fit";
}
export interface Sizes {
  thumb: Size;
  large: Size;
  medium: Size;
  small: Size;
}
export interface MediaEntity {
  id: number;
  id_str: string;
  indices: [number, number];
  url: string;
  display_url: string;
  expanded_url: string;
  media_url: string;
  media_url_https: string;
  sizes: Sizes;
  source_status_id: number;
  source_status_id_str: string;
  type: string;
}
export interface UrlEntity {
  url: string;
  display_url: string;
  expanded_url: string;
  indices: [number, number];
}
export interface UserMentionEntity {
  id: number;
  id_str: string;
  indices: [number, number];
  name: string;
  screen_name: string;
}
export interface Entities {
  hashtags: HashtagEntity[];
  media: MediaEntity[];
  urls: UrlEntity[];
  user_mentions: UserMentionEntity[];
}

/**
 * @see https://dev.twitter.com/overview/api/users
 */
export interface User {
  id: number;
  id_str: string;
  name: string;
  screen_name: string;
  location: string;
  description: string;
  url: string | null; // fixed
  entities: UserEntities;
  protected: boolean;
  followers_count: number;
  friends_count: number;
  listed_count: number;
  created_at: string;
  favourites_count: number;
  utc_offset?: number | null; // fixed
  time_zone?: string | null; // fiexed
  geo_enabled?: boolean;
  verified: boolean;
  statuses_count: number;
  lang: string | null;
  status?: Status;
  contributors_enabled: boolean;
  is_translator?: boolean;
  is_translation_enabled?: boolean; // appended
  profile_background_color: string;
  profile_background_image_url: string;
  profile_background_image_url_https: string;
  profile_background_tile: boolean;
  profile_image_url: string;
  profile_image_url_https: string;
  profile_banner_url: string;
  profile_link_color: string;
  profile_sidebar_border_color: string;
  profile_sidebar_fill_color: string;
  profile_text_color: string;
  profile_use_background_image: boolean;
  has_extended_profile?: boolean; // appended
  default_profile: boolean; // fixed
  default_profile_image: boolean; // fixed
  following?: boolean;
  follow_request_sent?: boolean;
  notifications?: boolean;
  translator_type?: string;
  show_all_inline_media?: boolean;
  withheld_in_countries?: string;
  withheld_scope?: string;
}

export interface UserEntities {
  url: UserEntitiesDescription;
  description: UserEntitiesDescription;
}

export interface UserEntitiesDescription {
  urls: URL[];
}

export interface URL {
  url: string;
  expanded_url: string;
  display_url: string;
  indices: number[];
}

/**
 * @see https://dev.twitter.com/overview/api/places
 */
export interface PlaceAttribute {
  street_address: string;
  locality: string;
  region: string;
  iso3: string;
  postal_code: string;
  phone: string;
  twitter: string;
  url: string;
  "app:id": string;
}
export interface Place {
  geometry: any;
  attributes: PlaceAttribute;
  bounding_box: any;
  contained_within: Place[];
  country: string;
  country_code: string;
  full_name: string;
  id: string;
  name: string;
  place_type: string;
  url: string;
}

/**
 * @see https://dev.twitter.com/overview/api/tweets
 */
export interface Status {
  id: number;
  id_str: string;
  annotations?: any;
  contributors?: Contributors[];
  coordinates?: any;
  /**
   * ツイートの時刻。"Tue Feb 20 14:35:54 +0000 2007" 形式
   */
  created_at: string;
  current_user_retweet?: {
    id: number;
    id_str: string;
  };
  entities: Entities;
  favorite_count?: number;
  favorited?: boolean;
  filter_level: "none" | "low" | "medium";
  geo?: any;
  in_reply_to_screen_name?: string;
  in_reply_to_status_id?: number;
  in_reply_to_status_id_str?: string;
  in_reply_to_user_id?: number;
  in_reply_to_user_id_str?: string;
  lang?: string;
  place?: Place;
  possibly_sensitive?: boolean;
  quoted_status_id?: number;
  quoted_status_id_str?: string;
  quoted_status?: Status;
  scopes?: any;
  retweet_count: number;
  retweeted: boolean;
  retweeted_status?: Status;
  source?: string;
  text?: string;
  full_text?: string;
  truncated: boolean;
  user: User;
  withheld_copyright?: boolean;
  withheld_in_countries?: string[];
  withheld_scope?: string;
  display_text_range?: [number, number];
}
export interface Metadata {
  max_id?: number;
  since_id?: number;
  refresh_url?: string;
  next_results?: string;
  count?: number;
  completed_in?: number;
  since_id_str?: string;
  query?: string;
  max_id_str?: string;
}

export interface Errors {
  errors: {
    code: number;
    message: string;
  }[];
}

export interface SearchResults {
  statuses: Status[];
  search_metadata: Metadata;
}

export type Response = object;

interface MediaParam {
  file_path: string;
}
export interface Params {
  // search/tweets
  q?: string;
  geocode?: string;
  lang?: string;
  locale?: string;
  result_type?: ResultType;
  count?: number;
  results_per_page?: number;
  until?: string;
  since_id?: string;
  max_id?: string;
  include_entities?: boolean;

  source_id?: number;
  source_screen_name?: string;
  target_id?: number;
  target_screen_name?: string;

  // Other params from various endpoints
  track?: string | string[];
  media_id?: string;
  media_ids?: string[];
  alt_text?: {
    text?: string;
  };
  media_data?: Buffer | string;
  screen_name?: string;
  id?: string;
  slug?: string;
  owner_screen_name?: string;
  status?: string;
  user_id?: number | string;
  lat?: number;
  long?: number;
  follow?: boolean | string | string[];
  include_email?: boolean;
  cursor?: number | string;
  tweet_mode?: string;
  trim_user?: boolean;
  exclude_replies?: boolean;
  include_rts?: boolean;
  skip_status?: boolean;
  url?: string;
  include_user_entities?: boolean;
  stringify_ids?: boolean;
  in_reply_to_status_id?: number | string;
  page?: number;
}

export type ApiName = ApiStatusType.ApiName;
export type ApiCategoryName = ApiStatusType.ApiCategoryName;
export type ApiRateLimitStatus = ApiStatusType.ApiRateLimitStatus;
export type ApiRateLimitStatusMap = ApiStatusType.ApiRateLimitStatusMap;
export function assertsApiRateLimitStatus(arg: any): asserts arg is ApiRateLimitStatus {
  util.mustBeObject(arg);
  util.mustBeObject(arg.rate_limit_context);
  util.mustBeString(arg.rate_limit_context, "access_token");
  util.mustBeObject(arg.resources);
}
