idf_component_register(
    SRCS "http_sink.c"
    INCLUDE_DIRS "include"
    REQUIRES ancs_protocol esp_http_client esp_timer freertos mbedtls
)
