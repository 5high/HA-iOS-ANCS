#include "rgb_led.h"

#include <string.h>

#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "led_strip.h"

static const char *TAG = "rgb_led";

/* Onboard addressable LED data pin. ESP32-S3-DevKitC-1 revision v1.0 wires
 * the WS2812 bead to GPIO48 (revision v1.1 moved it to GPIO38). */
#define RGB_LED_GPIO 48

/* The board carries exactly one bead. */
#define LED_COUNT 1

#define FRAME_PERIOD_MS 40 /* ~25 fps refresh while animating */
#define COMET_FRAMES 38    /* ~1.5 s of comet sweep per loop */
#define COMET_LOOPS 3

static led_strip_handle_t s_strip;
static bool s_ready;
static esp_timer_handle_t s_timer;

/* Animation state, guarded by the spinlock. The ticker only reads/writes
 * these under the lock and never blocks inside it. */
static portMUX_TYPE s_mux = portMUX_INITIALIZER_UNLOCKED;
static int s_comet_frame = -1; /* -1 = idle */
static uint32_t s_comet_end;
static rgb_led_idle_mode_t s_idle_mode = RGB_LED_IDLE_OFF;
static uint8_t s_last_r, s_last_g, s_last_b; /* last frame actually pushed */
static bool s_have_last;

/* ---- colour helpers ---------------------------------------------------- */

static void hsv2rgb(uint32_t h, uint8_t *r, uint8_t *g, uint8_t *b)
{
    const uint8_t region = (uint8_t)(h / 60);
    const uint8_t remain = (uint8_t)((h % 60) * 4); /* 0..252 */
    const uint8_t q = (uint8_t)(255 - remain);
    switch (region) {
    case 0: *r = 255; *g = remain; *b = 0; break;
    case 1: *r = q; *g = 255; *b = 0; break;
    case 2: *r = 0; *g = 255; *b = remain; break;
    case 3: *r = 0; *g = q; *b = 255; break;
    case 4: *r = remain; *g = 0; *b = 255; break;
    default: *r = 255; *g = 0; *b = q; break;
    }
}

/* Comet on a single bead: a white-hot head sweeping through a magenta trail,
 * expressed as a brightness ramp along the hue wheel. */
static void comet_colour(int frame, uint8_t *r, uint8_t *g, uint8_t *b)
{
    const int t = frame % COMET_FRAMES;
    const int half = COMET_FRAMES / 2;
    const int pos = t < half ? t : (COMET_FRAMES - 1 - t); /* 0..half */
    const int norm = (half > 0) ? (pos * 255) / half : 0;

    const uint32_t hue = 300; /* magenta trail */
    uint8_t hr, hg, hb;
    hsv2rgb(hue, &hr, &hg, &hb);
    const int fade = norm / 2;
    *r = (uint8_t)((hr * fade) / 255);
    *g = (uint8_t)((hg * fade) / 255);
    *b = (uint8_t)((hb * fade) / 255);
    /* White-hot head rides ahead of the trail. */
    const int head = 255 - norm;
    if (head > 0) {
        const int hw = head / 2;
        if (hw > *r) *r = (uint8_t)hw;
        if (hw > *g) *g = (uint8_t)hw;
        if (hw > *b) *b = (uint8_t)hw;
    }
}

/* ---- frame push --------------------------------------------------------- */

static void show(uint8_t r, uint8_t g, uint8_t b)
{
    if (s_strip == NULL) {
        return;
    }
    led_strip_set_pixel(s_strip, 0, r, g, b);
    if (led_strip_refresh(s_strip) == ESP_OK) {
        s_last_r = r;
        s_last_g = g;
        s_last_b = b;
        s_have_last = true;
    }
}

static void refresh_tick(void *arg)
{
    (void)arg;
    static uint32_t tick;
    tick++;

    int comet = -1;
    rgb_led_idle_mode_t mode;

    taskENTER_CRITICAL(&s_mux);
    comet = s_comet_frame;
    if (comet >= 0) {
        s_comet_frame++;
        if ((uint32_t)s_comet_frame >= s_comet_end) {
            s_comet_frame = -1;
            comet = -1; /* effect over, fall through to idle */
        }
    }
    mode = s_idle_mode;
    taskEXIT_CRITICAL(&s_mux);

    if (comet >= 0) {
        uint8_t r, g, b;
        comet_colour(comet, &r, &g, &b);
        show(r, g, b);
        return;
    }

    if (mode == RGB_LED_IDLE_BREATH_BLUE) {
        const int step = (int)((tick / 3) % 128);
        const int tri = step < 64 ? step * 4 : (127 - step) * 4;
        show(0, 0, (uint8_t)(20 + tri / 3));
        return;
    }

#ifdef RGB_LED_DEMO_COMET
    /* Demo build: loop the very same comet animation the notification path
     * uses, so a camera/eye can verify the shipped effect without waiting
     * for a real iOS notification. */
    if (comet < 0) {
        rgb_led_notify_arrived();
        comet = 0;
    }
    {
        uint8_t r, g, b;
        comet_colour(comet, &r, &g, &b);
        show(r, g, b);
    }
    return;
#else
    /* Idle-off: repaint once, then stay quiet. */
    if (!s_have_last || s_last_r || s_last_g || s_last_b) {
        show(0, 0, 0);
    }
#endif
}

/* ---- public API --------------------------------------------------------- */

esp_err_t rgb_led_init(void)
{
    led_strip_config_t strip_cfg = {
        .strip_gpio_num = RGB_LED_GPIO,
        .max_leds = LED_COUNT,
        .color_component_format = LED_STRIP_COLOR_COMPONENT_FMT_GRB,
    };
    led_strip_rmt_config_t rmt_cfg = {
        .resolution_hz = 10 * 1000 * 1000,
        .flags.with_dma = false,
    };
    esp_err_t err =
        led_strip_new_rmt_device(&strip_cfg, &rmt_cfg, &s_strip);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "strip create failed on gpio%d: %s", RGB_LED_GPIO,
                 esp_err_to_name(err));
        return err;
    }
    led_strip_clear(s_strip);

    const esp_timer_create_args_t timer_args = {
        .callback = refresh_tick,
        .name = "rgb_led",
    };
    err = esp_timer_create(&timer_args, &s_timer);
    if (err != ESP_OK) {
        return err;
    }
    err = esp_timer_start_periodic(s_timer, FRAME_PERIOD_MS * 1000);
    if (err != ESP_OK) {
        return err;
    }
    s_ready = true;

    ESP_LOGI(TAG, "rgb led ready on gpio%d", RGB_LED_GPIO);
    return ESP_OK;
}

void rgb_led_notify_arrived(void)
{
    if (!s_ready) {
        return;
    }
    taskENTER_CRITICAL(&s_mux);
    const uint32_t total = COMET_FRAMES * COMET_LOOPS;
    if (s_comet_frame < 0) {
        s_comet_frame = 0;
        s_comet_end = total;
    } else {
        /* Extend so a burst keeps flowing without restarting mid-sweep. */
        const uint32_t min_end = (uint32_t)s_comet_frame + COMET_FRAMES;
        if (s_comet_end < min_end) {
            s_comet_end = min_end;
        }
    }
    taskEXIT_CRITICAL(&s_mux);
}

esp_err_t rgb_led_set_idle_mode(rgb_led_idle_mode_t mode)
{
    if (mode != RGB_LED_IDLE_OFF && mode != RGB_LED_IDLE_BREATH_BLUE) {
        return ESP_ERR_INVALID_ARG;
    }
    s_idle_mode = mode;
    return ESP_OK;
}
