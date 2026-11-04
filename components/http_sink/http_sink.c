/*
 * http_sink: HTTP(S) POST forwarding sink.
 *
 * JSON body (chart): {"mac","app","title","message"}
 *   - "mac" is the device ID (MAC-derived), so several boards can share one
 *     receiver endpoint.
 *   - No time field: the receiver records the arrival time.
 *
 * TLS verification mode is a per-request choice:
 *   - cfg.crt_bundle_attach = esp_crt_bundle_attach  -> VERIFY_REQUIRED
 *   - cfg.crt_bundle_attach = NULL                    -> VERIFY_NONE
 * (verified against the esp-tls mbedtls backend)
 */
#include "http_sink.h"

#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "esp_crt_bundle.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

static const char *TAG = "http_sink";

#define HTTP_SINK_TIMEOUT_MS     20000
#define HTTP_SINK_BUFFER_SIZE    512
#define HTTP_SINK_TEST_TIMEOUT_S 15

static http_sink_config_t s_config;
static http_sink_status_t s_status;
static SemaphoreHandle_t s_tls_lock;

/* TLS handshakes are expensive on the C3/S3 heap: serialise them so a portal
 * test and a live notification never overlap. */
static esp_err_t tls_lock_take(uint32_t timeout_ms)
{
    if (s_tls_lock == NULL) {
        s_tls_lock = xSemaphoreCreateMutex();
        if (s_tls_lock == NULL) {
            return ESP_ERR_NO_MEM;
        }
    }
    return xSemaphoreTake(s_tls_lock, pdMS_TO_TICKS(timeout_ms)) == pdTRUE
               ? ESP_OK
               : ESP_ERR_TIMEOUT;
}

static void tls_lock_give(void)
{
    if (s_tls_lock != NULL) {
        (void)xSemaphoreGive(s_tls_lock);
    }
}

void http_sink_get_status(http_sink_status_t *out)
{
    if (out == NULL) {
        return;
    }
    *out = s_status;
}

bool http_sink_enabled(void)
{
    return s_config.enabled && s_config.url[0] != '\0';
}

esp_err_t http_sink_init(const http_sink_config_t *config)
{
    if (config == NULL) {
        return ESP_ERR_INVALID_ARG;
    }
    s_config = *config;
    memset(&s_status, 0, sizeof(s_status));
    ESP_LOGI(TAG,
             "http sink %s url=%s tls_verify=%d",
             s_config.enabled ? "enabled" : "disabled",
             s_config.url,
             (int)s_config.tls_verify);
    return ESP_OK;
}

esp_err_t http_sink_reconfigure(const http_sink_config_t *config)
{
    if (config == NULL) {
        return ESP_ERR_INVALID_ARG;
    }
    s_config = *config;
    ESP_LOGI(TAG,
             "http sink reconfigured %s url=%s tls_verify=%d",
             s_config.enabled ? "enabled" : "disabled",
             s_config.url,
             (int)s_config.tls_verify);
    return ESP_OK;
}

esp_err_t http_sink_deinit(void)
{
    s_config.enabled = false;
    s_config.url[0] = '\0';
    return ESP_OK;
}

/* The auth field accepts either a full header line ("X-Api-Key: abc") or a bare
 * token, which is sent as "Authorization: <token>". */
static void apply_auth_header(esp_http_client_handle_t client, const char *auth)
{
    if (auth == NULL || auth[0] == '\0') {
        return;
    }
    const char *colon = strchr(auth, ':');
    if (colon != NULL && colon != auth) {
        char name[64];
        size_t length = (size_t)(colon - auth);
        if (length >= sizeof(name)) {
            length = sizeof(name) - 1U;
        }
        memcpy(name, auth, length);
        name[length] = '\0';
        while (length > 0U && (name[length - 1U] == ' ' || name[length - 1U] == '\t')) {
            name[--length] = '\0';
        }
        const char *value = colon + 1;
        while (*value == ' ' || *value == '\t') {
            value++;
        }
        (void)esp_http_client_set_header(client, name, value);
    } else {
        (void)esp_http_client_set_header(client, "Authorization", auth);
    }
}

/* Build the chart body: {"mac","app","title","message"}. */
static char *build_body(const ancs_notification_t *notification,
                        const char *device_name,
                        size_t *out_length)
{
    if (notification == NULL || out_length == NULL) {
        return NULL;
    }

    const char *app = notification->app_name[0] != '\0'
                          ? notification->app_name
                          : notification->app_id;

    /* Escape the JSON string values. The notification text may contain
     * quotes, backslashes or control characters. */
    size_t capacity = strlen(app) + strlen(notification->title) +
                      strlen(notification->message) + strlen(device_name) + 128U;
    char *body = malloc(capacity);
    if (body == NULL) {
        return NULL;
    }

    size_t offset = 0U;
    /* device_name carries the MAC-derived device ID. */
    offset += (size_t)snprintf(body + offset,
                                capacity - offset,
                                "{\"mac\":\"%s\",\"app\":\"",
                                device_name != NULL ? device_name : "");
    /* app */
    for (const char *p = app; *p != '\0' && offset + 8U < capacity; p++) {
        if (*p == '"' || *p == '\\') {
            body[offset++] = '\\';
            body[offset++] = *p;
        } else if ((unsigned char)*p < 0x20U) {
            offset += (size_t)snprintf(body + offset,
                                       capacity - offset,
                                       "\\u%04x",
                                       (unsigned char)*p);
        } else {
            body[offset++] = *p;
        }
    }
    offset += (size_t)snprintf(body + offset,
                                capacity - offset,
                                "\",\"title\":\"");
    for (const char *p = notification->title; *p != '\0' && offset + 8U < capacity; p++) {
        if (*p == '"' || *p == '\\') {
            body[offset++] = '\\';
            body[offset++] = *p;
        } else if ((unsigned char)*p < 0x20U) {
            offset += (size_t)snprintf(body + offset,
                                       capacity - offset,
                                       "\\u%04x",
                                       (unsigned char)*p);
        } else {
            body[offset++] = *p;
        }
    }
    offset += (size_t)snprintf(body + offset,
                                capacity - offset,
                                "\",\"message\":\"");
    for (const char *p = notification->message; *p != '\0' && offset + 8U < capacity; p++) {
        if (*p == '"' || *p == '\\') {
            body[offset++] = '\\';
            body[offset++] = *p;
        } else if ((unsigned char)*p < 0x20U) {
            offset += (size_t)snprintf(body + offset,
                                       capacity - offset,
                                       "\\u%04x",
                                       (unsigned char)*p);
        } else {
            body[offset++] = *p;
        }
    }
    offset += (size_t)snprintf(body + offset, capacity - offset, "\"}");
    if (offset >= capacity) {
        free(body);
        return NULL;
    }
    body[offset] = '\0';
    *out_length = offset;
    return body;
}

static esp_err_t post_once(const char *url,
                           const char *auth,
                           bool tls_verify,
                           const char *body,
                           int *out_status)
{
    esp_http_client_config_t config = {
        .url = url,
        .timeout_ms = HTTP_SINK_TIMEOUT_MS,
        .buffer_size = HTTP_SINK_BUFFER_SIZE,
    };
    /* Verify the chain, or explicitly skip it. */
    config.crt_bundle_attach = tls_verify ? esp_crt_bundle_attach : NULL;

    esp_http_client_handle_t client = esp_http_client_init(&config);
    if (client == NULL) {
        return ESP_FAIL;
    }

    esp_err_t err = ESP_OK;
    apply_auth_header(client, auth);
    if (err == ESP_OK) {
        err = esp_http_client_set_method(client, HTTP_METHOD_POST);
    }
    if (err == ESP_OK) {
        err = esp_http_client_set_header(client,
                                         "Content-Type",
                                         "application/json; charset=utf-8");
    }
    if (err == ESP_OK) {
        err = esp_http_client_set_post_field(client, body, strlen(body));
    }
    if (err == ESP_OK) {
        err = esp_http_client_perform(client);
    }

    const int status = esp_http_client_get_status_code(client);
    if (out_status != NULL) {
        *out_status = status;
    }
    if (err == ESP_OK && (status < 200 || status >= 300)) {
        err = ESP_FAIL;
    }
    esp_http_client_cleanup(client);
    return err;
}

esp_err_t http_sink_deliver(const ancs_notification_t *notification,
                            const char *device_name)
{
    if (!http_sink_enabled()) {
        return ESP_ERR_INVALID_STATE;
    }

    size_t length = 0U;
    char *body = build_body(notification, device_name, &length);
    if (body == NULL) {
        return ESP_ERR_NO_MEM;
    }

    int status = 0;
    esp_err_t err = ESP_FAIL;
    if (tls_lock_take(30000) == ESP_OK) {
        err = post_once(s_config.url, s_config.auth, s_config.tls_verify, body, &status);
        tls_lock_give();
    }

    s_status.valid = true;
    s_status.last_status_code = status;
    s_status.last_error = err;
    if (err == ESP_OK) {
        s_status.sent++;
        ESP_LOGI(TAG, "POST %s -> %d", s_config.url, status);
    } else {
        s_status.failed++;
        s_status.last_error_at_ms = (uint64_t)esp_timer_get_time() / 1000U;
        ESP_LOGE(TAG, "POST %s failed: %s (status %d)", s_config.url, esp_err_to_name(err), status);
    }
    free(body);
    return err;
}

void http_sink_observe_notification(const ancs_notification_t *notification,
                                    const char *device_name,
                                    void *context)
{
    (void)context;
    if (!http_sink_enabled()) {
        return;
    }
    (void)http_sink_deliver(notification, device_name);
}

esp_err_t http_sink_test(const char *url,
                         const char *auth,
                         bool tls_verify,
                         char *detail,
                         size_t detail_len)
{
    if (detail == NULL || detail_len == 0U) {
        return ESP_ERR_INVALID_ARG;
    }
    detail[0] = '\0';
    if (url == NULL || url[0] == '\0') {
        snprintf(detail, detail_len, "URL is empty");
        return ESP_ERR_INVALID_ARG;
    }
    if (strncmp(url, "http://", 7) != 0 && strncmp(url, "https://", 8) != 0) {
        snprintf(detail, detail_len, "URL must start with http:// or https://");
        return ESP_ERR_INVALID_ARG;
    }

    static const char probe[] =
        "{\"mac\":\"iOS_MSG_TEST\",\"app\":\"com.iosmsg.probe\","
        "\"title\":\"test\",\"message\":\"connectivity probe\"}";

    int status = 0;
    esp_err_t err = ESP_FAIL;
    if (tls_lock_take((uint32_t)HTTP_SINK_TEST_TIMEOUT_S * 1000U) == ESP_OK) {
        err = post_once(url, auth, tls_verify, probe, &status);
        tls_lock_give();
    }

    if (err == ESP_OK) {
        snprintf(detail, detail_len, "HTTP %d", status);
        return ESP_OK;
    }
    if (err == ESP_ERR_TIMEOUT) {
        snprintf(detail, detail_len, "timeout after %d s", HTTP_SINK_TEST_TIMEOUT_S);
        return err;
    }
    snprintf(detail, detail_len, "%s (status %d)", esp_err_to_name(err), status);
    return err;
}
