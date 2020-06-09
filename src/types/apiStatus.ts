export type ApiCategoryName = keyof Resources;

export type ApiName =
  | keyof Resources["account"]
  | keyof Resources["account_activity"]
  | keyof Resources["application"]
  | keyof Resources["auth"]
  | keyof Resources["blocks"]
  | keyof Resources["business_experience"]
  | keyof Resources["collections"]
  | keyof Resources["contacts"]
  | keyof Resources["custom_profiles"]
  | keyof Resources["device"]
  | keyof Resources["direct_messages"]
  | keyof Resources["drafts"]
  | keyof Resources["favorites"]
  | keyof Resources["feedback"]
  | keyof Resources["fleets"]
  | keyof Resources["followers"]
  | keyof Resources["friends"]
  | keyof Resources["friendships"]
  | keyof Resources["geo"]
  | keyof Resources["graphql"]
  | keyof Resources["graphql&POST"]
  | keyof Resources["guide"]
  | keyof Resources["help"]
  | keyof Resources["i"]
  | keyof Resources["labs"]
  | keyof Resources["limiter_scalding_report_creation"]
  | keyof Resources["lists"]
  | keyof Resources["live_pipeline"]
  | keyof Resources["live_video_stream"]
  | keyof Resources["media"]
  | keyof Resources["moments"]
  | keyof Resources["mutes"]
  | keyof Resources["oauth"]
  | keyof Resources["safety"]
  | keyof Resources["sandbox"]
  | keyof Resources["saved_searches"]
  | keyof Resources["search"]
  | keyof Resources["statuses"]
  | keyof Resources["teams"]
  | keyof Resources["traffic"]
  | keyof Resources["trends"]
  | keyof Resources["tweet_prompts"]
  | keyof Resources["tweets"]
  | keyof Resources["users"]
  | keyof Resources["webhooks"];

export interface ApiStatus {
  limit: number;
  remaining: number;
  reset: number;
}

export type ApiRateLimitStatusMap = {
  [key: string]: number;
};

export interface ApiRateLimitStatus {
  rate_limit_context: {
    access_token: string;
  };
  resources: Resources;
}

interface Resources {
  lists: {
    "/lists/list": ApiStatus;
    "/lists/memberships": ApiStatus;
    "/lists/subscribers/show": ApiStatus;
    "/lists/members": ApiStatus;
    "/lists/subscriptions": ApiStatus;
    "/lists/show": ApiStatus;
    "/lists/ownerships": ApiStatus;
    "/lists/subscribers": ApiStatus;
    "/lists/members/show": ApiStatus;
    "/lists/statuses": ApiStatus;
  };
  application: {
    "/application/rate_limit_status": ApiStatus;
  };
  mutes: {
    "/mutes/users/list": ApiStatus;
    "/mutes/users/ids": ApiStatus;
  };
  live_video_stream: {
    "/live_video_stream/status/:id": ApiStatus;
  };
  friendships: {
    "/friendships/outgoing": ApiStatus;
    "/friendships/list": ApiStatus;
    "/friendships/no_retweets/ids": ApiStatus;
    "/friendships/lookup": ApiStatus;
    "/friendships/incoming": ApiStatus;
    "/friendships/show": ApiStatus;
  };
  guide: {
    "/guide": ApiStatus;
    "/guide/get_explore_locations": ApiStatus;
    "/guide/explore_locations_with_autocomplete": ApiStatus;
  };
  auth: {
    "/auth/csrf_token": ApiStatus;
  };
  blocks: {
    "/blocks/list": ApiStatus;
    "/blocks/ids": ApiStatus;
  };
  geo: {
    "/geo/similar_places": ApiStatus;
    "/geo/place_page": ApiStatus;
    "/geo/id/:place_id": ApiStatus;
    "/geo/reverse_geocode": ApiStatus;
    "/geo/search": ApiStatus;
  };
  users: {
    "/users/report_spam": ApiStatus;
    "/users/contributors/pending": ApiStatus;
    "/users/show/:id": ApiStatus;
    "/users/search": ApiStatus;
    "/users/suggestions/:slug": ApiStatus;
    "/users/contributees/pending": ApiStatus;
    "/users/derived_info": ApiStatus;
    "/users/profile_banner": ApiStatus;
    "/users/suggestions/:slug/members": ApiStatus;
    "/users/lookup": ApiStatus;
    "/users/suggestions": ApiStatus;
  };

  teams: {
    "/teams/authorize": ApiStatus;
  };
  followers: {
    "/followers/ids": ApiStatus;
    "/followers/list": ApiStatus;
  };
  collections: {
    "/collections/list": ApiStatus;
    "/collections/entries": ApiStatus;
    "/collections/show": ApiStatus;
  };
  statuses: {
    "/statuses/retweeters/ids": ApiStatus;
    "/statuses/retweets_of_me": ApiStatus;
    "/statuses/home_timeline": ApiStatus;
    "/statuses/show/:id": ApiStatus;
    "/statuses/user_timeline": ApiStatus;
    "/statuses/friends": ApiStatus;
    "/statuses/retweets/:id": ApiStatus;
    "/statuses/mentions_timeline": ApiStatus;
    "/statuses/oembed": ApiStatus;
    "/statuses/lookup": ApiStatus;
  };
  custom_profiles: {
    "/custom_profiles/list": ApiStatus;
    "/custom_profiles/show": ApiStatus;
  };
  webhooks: {
    "/webhooks/subscriptions/direct_messages": ApiStatus;
    "/webhooks": ApiStatus;
  };
  contacts: {
    "/contacts/uploaded_by": ApiStatus;
    "/contacts/users": ApiStatus;
    "/contacts/addressbook": ApiStatus;
    "/contacts/users_and_uploaded_by": ApiStatus;
    "/contacts/delete/status": ApiStatus;
  };
  labs: {
    "/labs/2/platform_manipulation/reports": ApiStatus;
    "/labs/:version/tweets/:id/hidden&PUT": ApiStatus;
    "/labs/:version/tweets/stream/filter/": ApiStatus;
    "/labs/:version/users/:id/tweets": ApiStatus;
    "/labs/2/reports": ApiStatus;
    "/labs/:version/tweets/stream/filter/rules&POST": ApiStatus;
    "/labs/:version/tweets/stream/sample": ApiStatus;
    "/labs/:version/users/by/username/:handle/tweets": ApiStatus;
    "/labs/:version/tweets/metrics/private": ApiStatus;
    "/labs/:version/tweets/stream/filter/rules/:instance_name": ApiStatus;
    "/labs/:version/tweets/*": ApiStatus;
    "/labs/:version/users/*": ApiStatus;
    "/labs/:version/tweets/stream/filter/:instance_name": ApiStatus;
    "/labs/:version/tweets/stream/filter/rules/": ApiStatus;
    "/labs/:version/tweets/stream/compliance": ApiStatus;
    "/labs/:version/tweets/search": ApiStatus;
  };
  i: {
    "/i/config": ApiStatus;
    "/i/tfb/v1/smb/web/:account_id/payment/save": ApiStatus;
  };
  tweet_prompts: {
    "/tweet_prompts/report_interaction": ApiStatus;
    "/tweet_prompts/show": ApiStatus;
  };
  moments: {
    "/moments/statuses/update": ApiStatus;
    "/moments/permissions": ApiStatus;
  };
  limiter_scalding_report_creation: {
    "/limiter_scalding_report_creation": ApiStatus;
  };
  fleets: {
    "/fleets/:version/viewers": ApiStatus;
    "/fleets/:version/delete": ApiStatus;
    "/fleets/:version/create": ApiStatus;
    "/fleets/:version/user_fleets": ApiStatus;
    "/fleets/:version/fleetline": ApiStatus;
    "/fleets/:version/fleet_threads": ApiStatus;
    "/fleets/:version/home_timeline": ApiStatus;
    "/fleets/:version/mark_read": ApiStatus;
  };
  help: {
    "/help/tos": ApiStatus;
    "/help/configuration": ApiStatus;
    "/help/privacy": ApiStatus;
    "/help/settings": ApiStatus;
    "/help/languages": ApiStatus;
  };
  feedback: {
    "/feedback/show/:id": ApiStatus;
    "/feedback/events": ApiStatus;
  };
  business_experience: {
    "/business_experience/dashboard_settings/destroy": ApiStatus;
    "/business_experience/dashboard_features": ApiStatus;
    "/business_experience/keywords": ApiStatus;
    "/business_experience/dashboard_settings/update": ApiStatus;
    "/business_experience/dashboard_settings/show": ApiStatus;
  };
  "graphql&POST": {
    "/graphql&POST": ApiStatus;
  };
  friends: {
    "/friends/following/ids": ApiStatus;
    "/friends/following/list": ApiStatus;
    "/friends/list": ApiStatus;
    "/friends/ids": ApiStatus;
  };
  sandbox: {
    "/sandbox/account_activity/webhooks/:id/subscriptions": ApiStatus;
  };
  drafts: {
    "/drafts/statuses/update": ApiStatus;
    "/drafts/statuses/destroy": ApiStatus;
    "/drafts/statuses/ids": ApiStatus;
    "/drafts/statuses/list": ApiStatus;
    "/drafts/statuses/show": ApiStatus;
    "/drafts/statuses/create": ApiStatus;
  };
  direct_messages: {
    "/direct_messages/sent": ApiStatus;
    "/direct_messages/broadcasts/list": ApiStatus;
    "/direct_messages/subscribers/lists/members/show": ApiStatus;
    "/direct_messages/mark_read": ApiStatus;
    "/direct_messages/subscribers/ids": ApiStatus;
    "/direct_messages/sent_and_received": ApiStatus;
    "/direct_messages/broadcasts/statuses/list": ApiStatus;
    "/direct_messages": ApiStatus;
    "/direct_messages/subscribers/lists/members/ids": ApiStatus;
    "/direct_messages/subscribers/show": ApiStatus;
    "/direct_messages/broadcasts/show": ApiStatus;
    "/direct_messages/broadcasts/statuses/show": ApiStatus;
    "/direct_messages/subscribers/lists/list": ApiStatus;
    "/direct_messages/show": ApiStatus;
    "/direct_messages/events/list": ApiStatus;
    "/direct_messages/subscribers/lists/show": ApiStatus;
    "/direct_messages/events/show": ApiStatus;
  };
  media: {
    "/media/upload": ApiStatus;
  };
  traffic: {
    "/traffic/map": ApiStatus;
  };
  account_activity: {
    "/account_activity/all/webhooks": ApiStatus;
    "/account_activity/all/:instance_name/subscriptions": ApiStatus;
    "/account_activity/direct_messages/webhooks": ApiStatus;
    "/account_activity/webhooks/:id/subscriptions/direct_messages/list": ApiStatus;
    "/account_activity/webhooks/:id/subscriptions/all": ApiStatus;
    "/account_activity/direct_messages/:instance_name/webhooks": ApiStatus;
    "/account_activity/webhooks/:id/subscriptions/all/list": ApiStatus;
    "/account_activity/webhooks/:id/subscriptions/direct_messages": ApiStatus;
    "/account_activity/webhooks": ApiStatus;
    "/account_activity/direct_messages/:instance_name/subscriptions": ApiStatus;
    "/account_activity/webhooks/:id/subscriptions": ApiStatus;
    "/account_activity/all/:instance_name/webhooks": ApiStatus;
  };
  account: {
    "/account/login_verification_enrollment": ApiStatus;
    "/account/update_profile": ApiStatus;
    "/account/authenticate_web_view": ApiStatus;
    "/account/verify_credentials": ApiStatus;
    "/account/settings": ApiStatus;
  };
  safety: {
    "/safety/detection_feedback": ApiStatus;
  };
  favorites: {
    "/favorites/list": ApiStatus;
  };
  device: {
    "/device/token": ApiStatus;
  };
  tweets: {
    "/tweets/search/:product/:label": ApiStatus;
    "/tweets/search/:product/:instance/counts": ApiStatus;
  };
  saved_searches: {
    "/saved_searches/destroy/:id": ApiStatus;
    "/saved_searches/show/:id": ApiStatus;
    "/saved_searches/list": ApiStatus;
  };
  oauth: {
    "/oauth/revoke": ApiStatus;
    "/oauth/invalidate_token": ApiStatus;
    "/oauth/revoke_html": ApiStatus;
  };
  search: {
    "/search/tweets": ApiStatus;
  };
  trends: {
    "/trends/closest": ApiStatus;
    "/trends/available": ApiStatus;
    "/trends/place": ApiStatus;
  };
  live_pipeline: {
    "/live_pipeline/events": ApiStatus;
  };
  graphql: {
    "/graphql": ApiStatus;
  };
}
