#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

/**
 * RGB status effects for the single onboard addressable LED (WS2812 class,
 * DevKitC-1 v1.0: GPIO48).
 *
 * Effects run off an esp_timer ticker over the official led_strip driver, so
 * callers may trigger them from any task (BLE callback included) — nothing
 * here ever blocks waiting for the LED to finish.
 */

esp_err_t rgb_led_init(void);

/** Kick off the "new notification arrived" comet animation (~1.5 s, magenta
 *  trail with a white-hot head). Safe to call repeatedly; overlapping
 *  triggers extend and re-energise the effect. */
void rgb_led_notify_arrived(void);

/** Persistent idle background while no effect is running. Effects take
 *  precedence whenever they run. Default: off. */
typedef enum {
    RGB_LED_IDLE_OFF = 0,
    RGB_LED_IDLE_BREATH_BLUE,
} rgb_led_idle_mode_t;
esp_err_t rgb_led_set_idle_mode(rgb_led_idle_mode_t mode);
