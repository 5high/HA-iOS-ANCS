#include "mqtt_app_name.h"

#include <stddef.h>
#include <strings.h>

typedef struct {
    const char *app_id;
    const char *display_name;
} mqtt_app_name_entry_t;

static const mqtt_app_name_entry_t APP_NAMES[] = {
    {"com.apple.MobileSMS", "Messages"},
    {"com.apple.Maps", "Maps"},
    {"com.apple.Music", "Apple Music"},
    {"com.iwilab.KakaoTalk", "KakaoTalk"},
    {"com.nhncorp.NaverSearch", "Naver"},
    {"com.nhncorp.NaverMap", "Naver Map"},
    {"com.nhncorp.NaverWebtoon", "Naver Webtoon"},
    {"net.daum.maps", "KakaoMap"},
    {"com.google.Gmail", "Gmail"},
    {"com.google.GoogleMobile", "Google"},
    {"com.google.Maps", "Google Maps"},
    {"com.google.ios.youtube", "YouTube"},
    {"com.google.ios.youtubemusic", "YouTube Music"},
    {"com.google.chrome.ios", "Chrome"},
    {"net.whatsapp.WhatsApp", "WhatsApp"},
    {"net.whatsapp.WhatsAppSMB", "WhatsApp Business"},
    {"com.facebook.Facebook", "Facebook"},
    {"com.facebook.Messenger", "Messenger"},
    {"com.burbn.instagram", "Instagram"},
    {"ph.telegra.Telegraph", "Telegram"},
    {"com.atebits.Tweetie2", "X"},
    {"com.spotify.client", "Spotify"},
    {"com.netflix.Netflix", "Netflix"},
    {"com.hammerandchisel.discord", "Discord"},
    {"com.microsoft.Office.Outlook", "Outlook"},
    {"com.microsoft.skype.teams", "Microsoft Teams"},
    {"com.microsoft.azureauthenticator", "Microsoft Authenticator"},
    {"com.tinyspeck.chatlyio", "Slack"},
    {"com.slack.slackintune", "Slack for Intune"},
    {"notion.id", "Notion"},
    {"com.cron.calendar", "Notion Calendar"},
    {"com.openai.chat", "ChatGPT"},
    {"com.tving.iphone001", "TVING"},
    {"com.jawebs.baedal", "Baedal Minjok"},
    {"com.coupang.Coupang", "Coupang"},
    {"com.coupang.coupang-eats", "Coupang Eats"},
    {"com.vivarepublica.cash", "Toss"},
    {"com.kakaobank.channel", "KakaoBank"},
    {"com.kakaopay.payapp.store", "KakaoPay"},
    {"com.kbstar.kbbank", "KB Star Banking"},
    {"com.kbcard.cxh.appcard", "KB Pay"},
    {"com.shinhan.sbank", "Shinhan Super SOL"},
    {"com.shinhan.sbank2015", "Old Shinhan SOL Bank"},
    {"com.wooribank.smart.npib", "Woori WON Banking"},
    {"com.wooricard.wcard", "Woori WON Card"},
    {"com.hanabank.oqf", "Hana 1Q"},
    {"com.kebhana.hanapush", "Old Hana 1Q"},
    {"com.samsungCard.samsungCard", "Monimo"},
    {"com.shinhancard.MobilePay", "Shinhan SOL Pay"},
    {"com.hyundaicard.hcappcard", "Hyundai Card"},
    {"com.nonghyup.card.NHAllonePay", "NH pay"},
    {"com.nonghyup.newsmartbanking", "NH Smart Banking"},
    {"com.naverfin.payapp", "NaverPay"},
    {"com.nhncorp.NaverShopping", "Naver Plus Store"},
    {"com.towneers.www", "Danggeun"},
    {"net.quicket.app", "Buynlarge"},
    {"net.bucketplacet.ohouse", "Ohouhouse"},
    {"jp.naver.line", "LINE"},
    {"com.ss.iphone.ugc.Ame", "TikTok"},
    {"com.ss.iphone.ugc.tiktok.lite", "TikTok Lite"},
    {"us.zoom.videomeetings", "Zoom Workplace"},
    {"us.zoom.videomeetings4intune", "Zoom Workplace for Intune"},
    {"com.google.Drive", "Google Drive"},
    {"com.google.photos", "Google Photos"},
    {"com.google.calendar", "Google Calendar"},
    {"com.microsoft.skydrive", "OneDrive"},
    {"com.microsoft.msedge", "Microsoft Edge"},
    {"com.getdropbox.Dropbox", "Dropbox"},
    {"com.reddit.Reddit", "Reddit"},
    {"com.linkedin.LinkedIn", "LinkedIn"},
    {"org.whispersystems.signal", "Signal"},
    {"com.tencent.xin", "WeChat"},
    {"com.alipay.iphoneclient", "Alipay"},
    {"com.ubercab.UberClient", "Uber"},
    {"com.ubercab.UberEats", "Uber Eats"},
    {"com.airbnb.app", "Airbnb"},
    {"kr.co.withweb.aboutyeogi", "Yeogieotte"},
    {"kr.co.rememberapp", "Remember"},
    {"com.github.stormbreaker.prod", "GitHub"},
    {"com.anthropic.claude", "Claude"},
};

const char *mqtt_app_name_lookup(const char *app_id)
{
    if (app_id == NULL || app_id[0] == '\0') {
        return "";
    }
    for (size_t index = 0; index < sizeof(APP_NAMES) / sizeof(APP_NAMES[0]);
         ++index) {
        if (strcasecmp(app_id, APP_NAMES[index].app_id) == 0) {
            return APP_NAMES[index].display_name;
        }
    }
    return app_id;
}
