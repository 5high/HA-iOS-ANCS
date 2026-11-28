#include "notification_sink.h"

#include <inttypes.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "esp_log.h"
#include "platform_identity.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"

static notification_sink_observer_t s_observer;
static void *s_observer_context;

/* Console output runs on a dedicated low-priority task. printf+fflush from
 * the Bluedroid callback task (state JSON) or the ANCS worker (notification
 * JSON) blocks when the USB host stops draining the console endpoint — a
 * stopped laptop is exactly the "phone left for a long time" scenario, and
 * back-pressure there used to wedge the whole BLE stack with no watchdog to
 * recover it. Lines are queued by pointer (ownership transfers to the writer
 * task); when the queue is full we drop the line and count it rather than
 * ever blocking a protocol task. */
#define SINK_CONSOLE_QUEUE_DEPTH 16U
#define SINK_CONSOLE_TASK_STACK 4096
#define SINK_CONSOLE_TASK_PRIORITY 1

static QueueHandle_t s_console_queue;
static uint32_t s_console_dropped;
static portMUX_TYPE s_console_lock = portMUX_INITIALIZER_UNLOCKED;

static void console_writer_task(void *argument)
{
    (void)argument;
    char *line = NULL;
    for (;;) {
        if (xQueueReceive(s_console_queue, &line, portMAX_DELAY) == pdTRUE &&
            line != NULL) {
            fputs(line, stdout);
            fflush(stdout);
            free(line);
        }
    }
}

static void ensure_console_writer(void)
{
    bool create = false;
    taskENTER_CRITICAL(&s_console_lock);
    if (s_console_queue == NULL) {
        create = true; /* Claim creation; losers delete their spare. */
    }
    taskEXIT_CRITICAL(&s_console_lock);
    if (!create) {
        return;
    }
    QueueHandle_t queue = xQueueCreate(SINK_CONSOLE_QUEUE_DEPTH, sizeof(char *));
    if (queue == NULL) {
        return;
    }
    TaskHandle_t task = NULL;
    if (xTaskCreate(console_writer_task, "ancs_console",
                    SINK_CONSOLE_TASK_STACK, NULL, SINK_CONSOLE_TASK_PRIORITY,
                    &task) != pdPASS) {
        vQueueDelete(queue);
        return;
    }
    taskENTER_CRITICAL(&s_console_lock);
    const bool installed = s_console_queue == NULL;
    if (installed) {
        s_console_queue = queue;
    }
    taskEXIT_CRITICAL(&s_console_lock);
    if (!installed) {
        vTaskDelete(task);
        vQueueDelete(queue);
    }
}

static void console_write_async(const char *prefix, const char *json)
{
    const size_t capacity = strlen(prefix) + strlen(json) + 3U;
    char *line = malloc(capacity);
    if (line == NULL) {
        return;
    }
    snprintf(line, capacity, "%s %s\n", prefix, json);
    ensure_console_writer();
    QueueHandle_t queue = NULL;
    taskENTER_CRITICAL(&s_console_lock);
    queue = s_console_queue;
    taskEXIT_CRITICAL(&s_console_lock);
    if (queue == NULL) {
        /* Writer not up yet (early boot): keep the line, block like before. */
        fputs(line, stdout);
        fflush(stdout);
        free(line);
        return;
    }
    if (xQueueSend(queue, &line, 0) != pdTRUE) {
        free(line);
        /* Count drops only. NEVER log from this branch: it runs on the
         * Bluedroid callback thread precisely when the console UART is
         * wedged, and ESP_LOGW would block there again (B3 regression).
         * The counter surfaces via the state JSON instead. */
        taskENTER_CRITICAL(&s_console_lock);
        ++s_console_dropped;
        taskEXIT_CRITICAL(&s_console_lock);
    }
}


typedef struct {
    char *buffer;
    size_t capacity;
    size_t length;
    bool failed;
} json_writer_t;

static void writer_raw(json_writer_t *writer, const char *text)
{
    if (writer == NULL || text == NULL || writer->failed) {
        return;
    }
    const size_t length = strlen(text);
    if (length >= writer->capacity - writer->length) {
        writer->failed = true;
        return;
    }
    memcpy(writer->buffer + writer->length, text, length);
    writer->length += length;
    writer->buffer[writer->length] = '\0';
}

static void writer_bytes(json_writer_t *writer, const char *bytes, size_t length)
{
    if (writer == NULL || bytes == NULL || writer->failed) {
        return;
    }
    if (length >= writer->capacity - writer->length) {
        writer->failed = true;
        return;
    }
    memcpy(writer->buffer + writer->length, bytes, length);
    writer->length += length;
    writer->buffer[writer->length] = '\0';
}

static void writer_format(json_writer_t *writer, const char *format, ...)
{
    if (writer == NULL || format == NULL || writer->failed) {
        return;
    }
    va_list args;
    va_start(args, format);
    const int written = vsnprintf(writer->buffer + writer->length,
                                  writer->capacity - writer->length,
                                  format,
                                  args);
    va_end(args);
    if (written < 0 || (size_t)written >= writer->capacity - writer->length) {
        writer->failed = true;
        return;
    }
    writer->length += (size_t)written;
}

static bool continuation(uint8_t byte)
{
    return (byte & 0xC0U) == 0x80U;
}

static size_t valid_utf8_sequence(const uint8_t *bytes, size_t remaining)
{
    const uint8_t first = bytes[0];
    if (first < 0x80U) {
        return 1U;
    }
    if (first >= 0xC2U && first <= 0xDFU && remaining >= 2U &&
        continuation(bytes[1])) {
        return 2U;
    }
    if (remaining >= 3U && continuation(bytes[1]) && continuation(bytes[2])) {
        if ((first == 0xE0U && bytes[1] >= 0xA0U && bytes[1] <= 0xBFU) ||
            ((first >= 0xE1U && first <= 0xECU) ||
             (first >= 0xEEU && first <= 0xEFU)) ||
            (first == 0xEDU && bytes[1] >= 0x80U && bytes[1] <= 0x9FU)) {
            return 3U;
        }
    }
    if (remaining >= 4U && continuation(bytes[1]) && continuation(bytes[2]) &&
        continuation(bytes[3])) {
        if ((first == 0xF0U && bytes[1] >= 0x90U && bytes[1] <= 0xBFU) ||
            (first >= 0xF1U && first <= 0xF3U) ||
            (first == 0xF4U && bytes[1] >= 0x80U && bytes[1] <= 0x8FU)) {
            return 4U;
        }
    }
    return 0U;
}

static void writer_string(json_writer_t *writer, const char *text)
{
    writer_raw(writer, "\"");
    const uint8_t *bytes = (const uint8_t *)(text != NULL ? text : "");
    const size_t length = strlen((const char *)bytes);
    for (size_t index = 0; index < length && !writer->failed;) {
        const uint8_t byte = bytes[index];
        switch (byte) {
        case '"':
            writer_raw(writer, "\\\"");
            index++;
            continue;
        case '\\':
            writer_raw(writer, "\\\\");
            index++;
            continue;
        case '\b':
            writer_raw(writer, "\\b");
            index++;
            continue;
        case '\f':
            writer_raw(writer, "\\f");
            index++;
            continue;
        case '\n':
            writer_raw(writer, "\\n");
            index++;
            continue;
        case '\r':
            writer_raw(writer, "\\r");
            index++;
            continue;
        case '\t':
            writer_raw(writer, "\\t");
            index++;
            continue;
        default:
            break;
        }

        if (byte < 0x20U) {
            writer_format(writer, "\\u%04X", (unsigned int)byte);
            index++;
            continue;
        }
        const size_t sequence = valid_utf8_sequence(bytes + index, length - index);
        if (sequence == 0U) {
            writer_raw(writer, "\\uFFFD");
            index++;
            continue;
        }
        writer_bytes(writer, (const char *)bytes + index, sequence);
        index += sequence;
    }
    writer_raw(writer, "\"");
}

static const char *error_name(int error_code)
{
    switch (error_code) {
    case ANCS_PROTOCOL_ERR_ARGUMENT:
        return "invalid_argument";
    case ANCS_PROTOCOL_ERR_LENGTH:
        return "invalid_length";
    case ANCS_PROTOCOL_ERR_EVENT:
        return "invalid_event";
    case ANCS_PROTOCOL_ERR_COMMAND:
        return "invalid_command";
    case ANCS_PROTOCOL_ERR_UID_MISMATCH:
        return "uid_mismatch";
    case ANCS_PROTOCOL_ERR_ATTRIBUTE:
        return "invalid_attribute";
    case ANCS_PROTOCOL_ERR_OVERFLOW:
        return "overflow";
    case ANCS_PROTOCOL_ERR_SEQUENCE:
        return "invalid_sequence";
    case ANCS_PROTOCOL_ERR_CANCELED:
        return "canceled";
    case ANCS_PROTOCOL_ERR_TIMEOUT:
        return "timeout";
    case 0xA0:
        return "unknown_command";
    case 0xA1:
        return "invalid_ancs_command";
    case 0xA2:
        return "invalid_parameter";
    case 0xA3:
        return "action_failed";
    default:
        return "unknown";
    }
}

static const char *json_bool(bool value)
{
    return value ? "true" : "false";
}

int notification_sink_format_json(const ancs_notification_t *notification,
                                  const char *device_name,
                                  char *output,
                                  size_t output_capacity)
{
    if (notification == NULL || device_name == NULL || output == NULL ||
        output_capacity == 0U) {
        return -1;
    }
    output[0] = '\0';
    json_writer_t writer = {
        .buffer = output,
        .capacity = output_capacity,
    };

    writer_raw(&writer,
               "{\"schema_version\":1,\"target\":\"" ANCS_TARGET_ID
               "\",\"device_name\":");
    writer_string(&writer, device_name);
    writer_format(&writer,
                  ",\"session_id\":%" PRIu32 ",\"event\":",
                  notification->session_id);
    writer_string(&writer, ancs_event_name(notification->event_id));
    writer_format(&writer,
                  ",\"event_id\":%u,\"uid\":%" PRIu32
                  ",\"event_flags\":%u,\"silent\":%s,\"important\":%s"
                  ",\"pre_existing\":%s,\"positive_action_available\":%s"
                  ",\"negative_action_available\":%s,\"category_id\":%u,\"category\":",
                  (unsigned int)notification->event_id,
                  notification->uid,
                  (unsigned int)notification->event_flags,
                  json_bool(ancs_event_flag_is_set(notification->event_flags,
                                                   ANCS_EVENT_FLAG_SILENT)),
                  json_bool(ancs_event_flag_is_set(notification->event_flags,
                                                   ANCS_EVENT_FLAG_IMPORTANT)),
                  json_bool(ancs_event_flag_is_set(notification->event_flags,
                                                   ANCS_EVENT_FLAG_PRE_EXISTING)),
                  json_bool(ancs_event_flag_is_set(notification->event_flags,
                                                   ANCS_EVENT_FLAG_POSITIVE_ACTION)),
                  json_bool(ancs_event_flag_is_set(notification->event_flags,
                                                   ANCS_EVENT_FLAG_NEGATIVE_ACTION)),
                  (unsigned int)notification->category_id);
    writer_string(&writer, ancs_category_name(notification->category_id));
    writer_format(&writer,
                  ",\"category_count\":%u,\"app_id\":",
                  (unsigned int)notification->category_count);
    writer_string(&writer, notification->app_id);
    writer_raw(&writer, ",\"app_name\":");
    writer_string(&writer, notification->app_name);
    writer_raw(&writer, ",\"title\":");
    writer_string(&writer, notification->title);
    writer_raw(&writer, ",\"subtitle\":");
    writer_string(&writer, notification->subtitle);
    writer_raw(&writer, ",\"message\":");
    writer_string(&writer, notification->message);
    writer_raw(&writer, ",\"message_size\":");
    writer_string(&writer, notification->message_size_raw);
    writer_raw(&writer, ",\"date\":");
    writer_string(&writer, notification->date_raw);
    writer_format(&writer,
                  ",\"complete\":%s,\"truncated\":{\"app_id\":%s,\"app_name\":%s,\"title\":%s"
                  ",\"subtitle\":%s,\"message\":%s},\"error\":",
                  json_bool(notification->complete),
                  json_bool(notification->app_id_truncated),
                  json_bool(notification->app_name_truncated),
                  json_bool(notification->title_truncated),
                  json_bool(notification->subtitle_truncated),
                  json_bool(notification->message_truncated));
    if (notification->complete && notification->error_code == 0) {
        writer_raw(&writer, "null");
    } else {
        writer_format(&writer, "{\"code\":%d,\"name\":", notification->error_code);
        writer_string(&writer, error_name(notification->error_code));
        writer_raw(&writer, "}");
    }
    writer_format(&writer,
                  ",\"received_at_ms\":%" PRId64 "}",
                  notification->received_at_ms);
    return writer.failed ? -2 : 0;
}

int notification_sink_format_state_json(const char *state,
                                        uint32_t session_id,
                                        bool bonded,
                                        bool data_source_subscribed,
                                        bool notification_source_subscribed,
                                        int auth_error,
                                        uint32_t console_dropped,
                                        char *output,
                                        size_t output_capacity)
{
    if (state == NULL || output == NULL || output_capacity == 0U) {
        return -1;
    }
    output[0] = '\0';
    json_writer_t writer = {
        .buffer = output,
        .capacity = output_capacity,
    };
    writer_raw(&writer, "{\"target\":\"" ANCS_TARGET_ID "\",\"state\":");
    writer_string(&writer, state);
    writer_format(&writer,
                  ",\"session_id\":%" PRIu32 ",\"bonded\":%s"
                  ",\"data_source_subscribed\":%s"
                  ",\"notification_source_subscribed\":%s,\"auth_error\":%d"
                  ",\"console_dropped\":%" PRIu32 "}",
                  session_id,
                  json_bool(bonded),
                  json_bool(data_source_subscribed),
                  json_bool(notification_source_subscribed),
                  auth_error,
                  console_dropped);
    return writer.failed ? -2 : 0;
}

int notification_sink_publish(const ancs_notification_t *notification,
                              const char *device_name)
{
    if (notification == NULL || device_name == NULL) {
        return -1;
    }
    const size_t text_length = strlen(notification->app_id) +
                               strlen(notification->app_name) +
                               strlen(notification->title) +
                               strlen(notification->subtitle) +
                               strlen(notification->message) +
                               strlen(notification->message_size_raw) +
                               strlen(notification->date_raw) +
                               strlen(device_name);
    if (text_length > (SIZE_MAX - 2048U) / 6U) {
        return -1;
    }
    const size_t capacity = 2048U + (text_length * 6U);
    char *json = malloc(capacity);
    if (json == NULL) {
        return -1;
    }
    const int result =
        notification_sink_format_json(notification, device_name, json, capacity);
    if (result == 0) {
        console_write_async("ANCS_NOTIFICATION_JSON", json);
        if (s_observer != NULL) {
            s_observer(notification, device_name, s_observer_context);
        }
    }
    free(json);
    return result;
}

int notification_sink_register_observer(notification_sink_observer_t observer,
                                        void *context)
{
    if (s_observer != NULL) {
        /* Single-observer slot is taken — caller must chain observers itself. */
        return -1;
    }
    s_observer = observer;
    s_observer_context = context;
    return 0;
}

int notification_sink_publish_state(const char *state,
                                    uint32_t session_id,
                                    bool bonded,
                                    bool data_source_subscribed,
                                    bool notification_source_subscribed,
                                    int auth_error)
{
    /* Snapshot the console-drop counter first so this very line can carry
     * the drop signal even when the console queue itself is full (SF-1:
     * the drop branch must stay log-free). */
    uint32_t console_dropped = 0;
    taskENTER_CRITICAL(&s_console_lock);
    console_dropped = s_console_dropped;
    taskEXIT_CRITICAL(&s_console_lock);
    char json[768];
    const int result =
        notification_sink_format_state_json(state,
                                            session_id,
                                            bonded,
                                            data_source_subscribed,
                                            notification_source_subscribed,
                                            auth_error,
                                            console_dropped,
                                            json,
                                            sizeof(json));
    if (result == 0) {
        console_write_async("ANCS_STATE_JSON", json);
    }
    return result;
}
