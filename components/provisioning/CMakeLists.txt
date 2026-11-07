idf_component_register(
    SRCS
        "provisioning_state.c"
        "provisioning_retry.c"
        "provisioning_runtime.c"
        "captive_dns.c"
    INCLUDE_DIRS "include"
    REQUIRES esp_event esp_netif esp_wifi esp_timer esp_hw_support provision_store lwip
)

if(DEFINED ENV{PROVISIONING_DEMO_RAW_AP})
    target_compile_definitions(${COMPONENT_LIB} PRIVATE PROVISIONING_DEMO_RAW_AP=1)
endif()

if(DEFINED ENV{PROVISIONING_DEMO_NO_PMF_CCMP})
    target_compile_definitions(${COMPONENT_LIB} PRIVATE PROVISIONING_DEMO_NO_PMF_CCMP=1)
endif()

if(DEFINED ENV{PROVISIONING_DEMO_CH13})
    target_compile_definitions(${COMPONENT_LIB} PRIVATE PROVISIONING_DEMO_CH13=1)
endif()

if(DEFINED ENV{PROVISIONING_DEMO_OPEN_AP})
    target_compile_definitions(${COMPONENT_LIB} PRIVATE PROVISIONING_DEMO_OPEN_AP=1)
endif()

if(DEFINED ENV{PROVISIONING_DEMO_ALT_CHANNEL})
    target_compile_definitions(${COMPONENT_LIB} PRIVATE PROVISIONING_DEMO_ALT_CHANNEL=1)
endif()

if(DEFINED ENV{PROVISIONING_DEMO_5G_CHANNEL})
    target_compile_definitions(${COMPONENT_LIB} PRIVATE PROVISIONING_DEMO_5G_CHANNEL=1)
endif()

if(DEFINED ENV{PROVISIONING_DEMO_LEGACY_TX})
    target_compile_definitions(${COMPONENT_LIB} PRIVATE PROVISIONING_DEMO_LEGACY_TX=1)
endif()

if(DEFINED ENV{PROVISIONING_DEMO_AP_ONLY})
    target_compile_definitions(${COMPONENT_LIB} PRIVATE PROVISIONING_DEMO_AP_ONLY=1)
endif()

