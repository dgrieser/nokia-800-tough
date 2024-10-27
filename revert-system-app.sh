#!/bin/bash

usage()
{
    echo "Usage: $(basename ${0}) <app-folder> [-r|--reboot]" 1>&2
    exit 1
}

ROOT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

source "${ROOT_DIR}/functions"

BUILD_DIR="$(mktemp -d)"

APP_FOLDER=""
REBOOT=0

while [ $# -gt 0 ]; do
    case ${1} in
        -r|--reboot)
            [ ${REBOOT} -eq 1 ] && usage
            REBOOT=1
        ;;
        *)
            if [ -z "${APP_FOLDER}" ]; then
                APP_FOLDER="${1}"
                [ ! -d "${APP_FOLDER}" ] && print_error "${APP_FOLDER} not found!"
                # normalize path
                APP_FOLDER="$(cd "${APP_FOLDER}"; pwd)"
            else
                usage
            fi
        ;;
    esac
    shift
done

[ -z "${APP_FOLDER}" ] && usage
check_device

APP_NAME="$(basename ${APP_FOLDER})"

echo
echo "Attempting to reset basePath for ${APP_NAME}..."
adb pull "${WEBAPP_DIR}/webapps.json" "${BUILD_DIR}/webapps.json"
jq 'if .["'${APP_NAME}'"].basePath? then .["'${APP_NAME}'"].basePath = "'${SYSTEM_WEBAPP_DIR}'" else error("Key not found") end' \
    "${BUILD_DIR}/webapps.json" > "${BUILD_DIR}/webapps_updated.json" \
    || print_error "Failed to update basePath for ${APP_NAME}"
diff -u --color=always "${BUILD_DIR}/webapps.json" "${BUILD_DIR}/webapps_updated.json"
mv "${BUILD_DIR}/webapps_updated.json" "${BUILD_DIR}/webapps.json"
echo
adb push "${BUILD_DIR}/webapps.json" "${WEBAPP_DIR}/webapps.json"

if [ ${REBOOT} -eq 1 ]; then
    reboot_device
fi

echo "Done"
