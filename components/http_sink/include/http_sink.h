#pragma once
/*
 * http_sink: HTTP(S) POST forwarding sink.
 *
 * Chart (2026-11-02 flow redesign), stage 8 "转发 / Forwarding":
 *   - POST <url> with JSON body {"mac","app","title","message"}
 *   - "mac" is the device ID; the receiver records the timestamp.
 *     The device never sends a time field.
 *   - Optional authentication header (raw value; "Name: value" or a bare token).
 *   - Optional server-certificate verification (HTTPS 校验方式).
 *
 * Both sinks (HTTP and MQTT) can be active at the same time; a notification is
 * delivered to every enabled sink.
 */
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "ancs_protocol.h"
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

#define HTTP_SINK_URL_MAX  257
#define HTTP_SINK_AUTH_MAX 257

typedef struct {
    bool enabled;
    char url[HTTP_SINK_URL_MAX];
    char auth[HTTP_SINK_AUTH_MAX];
    bool tls_verify;   /* true = verify the server certificate chain */
} http_sink_config_t;

typedef struct {
    bool valid;
    uint32_t sent;
    uint32_t failed;
    int last_status_code;
    esp_err_t last_error;
    uint64_t last_error_at_ms;
} http_sink_status_t;

esp_err_t http_sink_init(const http_sink_config_t *config);
esp_err_t http_sink_reconfigure(const http_sink_config_t *config);
esp_err_t http_sink_deinit(void);

bool http_sink_enabled(void);
void http_sink_get_status(http_sink_status_t *out);

/* Deliver one notification. Returns ESP_OK when the POST succeeded. */
esp_err_t http_sink_deliver(const ancs_notification_t *notification,
                            const char *device_name);

/* Synchronous reachability test used by the provisioning portal.
 * Writes a short human-readable detail into `detail`. */
esp_err_t http_sink_test(const char *url,
                         const char *auth,
                         bool tls_verify,
                         char *detail,
                         size_t detail_len);

/* Observer hook so the notification sink can fan out to this sink. */
void http_sink_observe_notification(const ancs_notification_t *notification,
                                    const char *device_name,
                                    void *context);

#ifdef __cplusplus
}
#endif
