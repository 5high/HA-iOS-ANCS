# iOS 通知 App ID 参考列表

ESP32 从 ANCS 通知中收到的 `app_id` 是 iOS App 的 bundle identifier。固件会把下列 ID
转换为 `App 名称` 传感器使用的显示名。本列表不是完整的 iOS App 目录；当开发者更换
bundle ID 或发布独立 App 时，映射可能变化。

列表中没有的 ID 不会被丢弃，而是原样显示其 `app_id`。任何真实通知的原始 ID 始终可以在
`最近通知` 传感器的属性中查到。

## 当前包含的代表性映射

| App ID | 显示名称 | 确认依据 |
| --- | --- | --- |
| `com.apple.MobileSMS` | Messages | 实际 ANCS 接收值 |
| `com.apple.Maps` | Maps | Apple App Store 搜索 API |
| `com.apple.Music` | Apple Music | Apple App Store 搜索 API |
| `com.iwilab.KakaoTalk` | KakaoTalk | Apple App Store 搜索 API |
| `com.nhncorp.NaverSearch` | Naver | Apple App Store 搜索 API |
| `com.nhncorp.NaverMap` | Naver Map | Apple App Store 搜索 API |
| `com.nhncorp.NaverWebtoon` | Naver Webtoon | Apple App Store 搜索 API |
| `net.daum.maps` | KakaoMap | Apple App Store 搜索 API |
| `com.google.Gmail` | Gmail | Apple App Store 搜索 API |
| `com.google.GoogleMobile` | Google | Apple App Store 搜索 API |
| `com.google.Maps` | Google Maps | Apple App Store 搜索 API |
| `com.google.ios.youtube` | YouTube | Apple App Store 搜索 API |
| `com.google.ios.youtubemusic` | YouTube Music | Apple App Store 搜索 API |
| `com.google.chrome.ios` | Chrome | Apple App Store 搜索 API |
| `net.whatsapp.WhatsApp` | WhatsApp | Apple App Store 搜索 API |
| `net.whatsapp.WhatsAppSMB` | WhatsApp Business | Apple App Store 搜索 API |
| `com.facebook.Facebook` | Facebook | Apple App Store 搜索 API |
| `com.facebook.Messenger` | Messenger | Apple App Store 搜索 API |
| `com.burbn.instagram` | Instagram | Apple App Store 搜索 API |
| `ph.telegra.Telegraph` | Telegram | Apple App Store 搜索 API |
| `com.atebits.Tweetie2` | X | Apple App Store 搜索 API |
| `com.spotify.client` | Spotify | Apple App Store 搜索 API |
| `com.netflix.Netflix` | Netflix | Apple App Store 搜索 API |
| `com.hammerandchisel.discord` | Discord | Apple App Store 搜索 API |
| `com.microsoft.Office.Outlook` | Outlook | Apple App Store 搜索 API |
| `com.microsoft.skype.teams` | Microsoft Teams | Apple App Store 搜索 API |
| `com.microsoft.azureauthenticator` | Microsoft Authenticator | Apple App Store 搜索 API |
| `com.tinyspeck.chatlyio` | Slack | Apple App Store 搜索 API |
| `com.slack.slackintune` | Slack for Intune | Apple App Store 搜索 API |
| `notion.id` | Notion | Apple App Store 搜索 API |
| `com.cron.calendar` | Notion Calendar | Apple App Store 搜索 API |
| `com.openai.chat` | ChatGPT | Apple App Store 搜索 API |
| `com.tving.iphone001` | TVING | Apple App Store 搜索 API |
| `com.jawebs.baedal` | Baedal Minjok | Apple App Store 搜索 API |
| `com.coupang.Coupang` | Coupang | Apple App Store 搜索 API |
| `com.coupang.coupang-eats` | Coupang Eats | Apple App Store 搜索 API |
| `com.vivarepublica.cash` | Toss | Apple App Store 搜索 API |
| `com.kakaobank.channel` | KakaoBank | Apple App Store 搜索 API |
| `com.kakaopay.payapp.store` | KakaoPay | Apple App Store 搜索 API |
| `com.kbstar.kbbank` | KB Star Banking | Apple App Store 搜索 API |
| `com.kbcard.cxh.appcard` | KB Pay | Apple App Store 搜索 API |
| `com.shinhan.sbank` | Shinhan Super SOL | Apple App Store 搜索 API |
| `com.shinhan.sbank2015` | Old Shinhan SOL Bank | Apple App Store 搜索 API |
| `com.wooribank.smart.npib` | Woori WON Banking | Apple App Store 搜索 API |
| `com.wooricard.wcard` | Woori WON Card | Apple App Store 搜索 API |
| `com.hanabank.oqf` | Hana 1Q | Apple App Store 搜索 API |
| `com.kebhana.hanapush` | Old Hana 1Q | Apple App Store 搜索 API |
| `com.samsungCard.samsungCard` | Monimo | Apple App Store 搜索 API |
| `com.shinhancard.MobilePay` | Shinhan SOL Pay | Apple App Store 搜索 API |
| `com.hyundaicard.hcappcard` | Hyundai Card | Apple App Store 搜索 API |
| `com.nonghyup.card.NHAllonePay` | NH pay | Apple App Store 搜索 API |
| `com.nonghyup.newsmartbanking` | NH Smart Banking | Apple App Store 搜索 API |
| `com.naverfin.payapp` | NaverPay | Apple App Store 搜索 API |
| `com.nhncorp.NaverShopping` | Naver Plus Store | Apple App Store 搜索 API |
| `com.towneers.www` | Danggeun | Apple App Store 搜索 API |
| `net.quicket.app` | Buynlarge | Apple App Store 搜索 API |
| `net.bucketplacet.ohouse` | Ohouhouse | Apple App Store 搜索 API |
| `jp.naver.line` | LINE | Apple App Store 搜索 API |
| `com.ss.iphone.ugc.Ame` | TikTok | Apple App Store 搜索 API |
| `com.ss.iphone.ugc.tiktok.lite` | TikTok Lite | Apple App Store 搜索 API |
| `us.zoom.videomeetings` | Zoom Workplace | Apple App Store 搜索 API |
| `us.zoom.videomeetings4intune` | Zoom Workplace for Intune | Apple App Store 搜索 API |
| `com.google.Drive` | Google Drive | Apple App Store 搜索 API |
| `com.google.photos` | Google Photos | Apple App Store 搜索 API |
| `com.google.calendar` | Google Calendar | Apple App Store 搜索 API |
| `com.microsoft.skydrive` | OneDrive | Apple App Store 搜索 API |
| `com.microsoft.msedge` | Microsoft Edge | Apple App Store 搜索 API |
| `com.getdropbox.Dropbox` | Dropbox | Apple App Store 搜索 API |
| `com.reddit.Reddit` | Reddit | Apple App Store 搜索 API |
| `com.linkedin.LinkedIn` | LinkedIn | Apple App Store 搜索 API |
| `org.whispersystems.signal` | Signal | Apple App Store 搜索 API |
| `com.tencent.xin` | WeChat | Apple App Store 搜索 API |
| `com.alipay.iphoneclient` | Alipay | Apple App Store 搜索 API |
| `com.ubercab.UberClient` | Uber | Apple App Store 搜索 API |
| `com.ubercab.UberEats` | Uber Eats | Apple App Store 搜索 API |
| `com.airbnb.app` | Airbnb | Apple App Store 搜索 API |
| `kr.co.withweb.aboutyeogi` | Yeogieotte | Apple App Store 搜索 API |
| `kr.co.rememberapp` | Remember | Apple App Store 搜索 API |
| `com.github.stormbreaker.prod` | GitHub | Apple App Store 搜索 API |
| `com.anthropic.claude` | Claude | Apple App Store 搜索 API |

## 核对与新增方法

1. 在 Home Assistant 的 `最近通知` 传感器属性中查看 `app_id`。
2. 在 Apple App Store 核对 App 与开发商是否一致。
3. 在同一次变更中同时更新固件的 App ID 映射表与本文档。
4. 只添加精确匹配的 ID，不要凭猜测添加。

Apple 说明 bundle identifier 用于唯一标识 App，通常采用反向 DNS 形式。核对 App Store 公开 App 时使用 Apple 的 [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/SearchAPI.html)。
