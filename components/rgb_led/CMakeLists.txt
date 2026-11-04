idf_component_register(
    SRCS "rgb_led.c"
    INCLUDE_DIRS "include"
    REQUIRES esp_timer log espressif__led_strip
)

# Optional demo build: loops the shipped comet animation so the effect can be
# eyeballed on a bench (or through a camera) without waiting for a real iOS
# notification. Enable with: RGB_LED_DEMO_COMET=1 tools/build.sh
# Production builds never define it.
if(DEFINED ENV{RGB_LED_DEMO_COMET})
    target_compile_definitions(${COMPONENT_LIB} PRIVATE RGB_LED_DEMO_COMET)
endif()
