idf_component_register(
    SRCS "ancs_client.c" "ancs_reconnect_policy.c"
    INCLUDE_DIRS "include"
    REQUIRES provisioning device_credentials ancs_protocol ancs_app_resolver ancs_state notification_sink platform_identity hid_server ble_enroll bt nvs_flash esp_timer esp_system esp_hw_support esp_driver_gpio provision_store
)
