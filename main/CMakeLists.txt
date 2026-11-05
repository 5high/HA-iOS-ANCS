idf_component_register(
    SRCS "app_main.c"
    INCLUDE_DIRS "."
    REQUIRES
        ancs_client
        ancs_protocol
        esp_app_format
        esp_system
        mqtt_relay
        notification_sink
        nvs_flash
        portal_http
        platform_identity
        provision_store
        provisioning
        rgb_led
)

if(DEFINED ENV{ANCS_DEMO_DELAY_BLE_S})
    target_compile_definitions(${COMPONENT_LIB} PRIVATE ANCS_DEMO_DELAY_BLE_S=1)
endif()
