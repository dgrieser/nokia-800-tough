#!/bin/bash

usage()
{
    echo "Usage: $(basename ${0}) <app-name> [-p|--push] [-r|--reboot]" 1>&2
    exit 1
}

print_error()
{
    echo -e "ERROR: ${1}"
    exit 1
}

cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" 1> /dev/null || print_error "Failed to change to root directory!"

APP_DIR="/data/local/webapps"
WEBAPP_DIR="webapps"
BUILD_DIR="build"

APP_NAME=""
PUSH=0
REBOOT=0

while [ $# -gt 0 ]; do
    case ${1}
        -p|--push)
            PUSH=1
        ;;
        -r|--reboot)
            REBOOT=1
        ;;
        *)
            if [ -z "${APP_NAME}" ]; then
                APP_NAME="${1}"
                [ ! -d "${WEBAPP_DIR}/${APP_NAME}" ] && print_error "App ${APP_NAME} not found!"
            else
                usage
            fi
        ;;
    esac
    shift
done

[ -z "${APP_NAME}" ] && usage
[ ${REBOOT} -eq 1 ] && [ ${PUSH} -eq 0 ] && print_error "Reboot only makes sense when pushing data"
if [ ${PUSH} -eq 1 ]; then
    devices="$(adb devices -l | sed '1d' | grep -v '^$')"
    echo "${devices}" | grep -q "model:Nokia_800_Tough" || print_error "Nokia 800 Tough device not found!\n${devices}"
    echo "${devices}" | wc -l | grep -q '1' || print_error "Multiple devices found!\n${devices}"
fi

echo "Cleaning build dir..."
rm -rf "${BUILD_DIR}"; mkdir "${BUILD_DIR}/${APP_NAME}"

echo
echo "Packaging ${APP_NAME}..."
zip -r "${BUILD_DIR}/${APP_NAME}/application.zip" "${WEBAPP_DIR}/${APP_NAME}" || print_error "Failed to package ${APP_NAME}"
cp -v "${WEBAPP_DIR}/${APP_NAME}_manifest.webapp" "${BUILD_DIR}/${APP_NAME}/manifest.webapp" || print_error "Failed to find ${APP_NAME}_manifest.webapp"

if [ ${PUSH} -eq 1 ]; then
    echo
    echo "Attempting to update basePath for ${APP_NAME}..."
    adb pull "${APP_DIR}/webapps.json" "${BUILD_DIR}/webapps.json"
    jq 'if .["'${APP_NAME}'"].basePath? then .["'${APP_NAME}'"].basePath = "'${APP_DIR}'" else error("Failed to update missing key .'${APP_NAME}'.basePath") end' \
        "${BUILD_DIR}/webapps.json" > "${BUILD_DIR}/webapps_updated.json" \
        || print_error "Failed to update basePath for ${APP_NAME}"
    mv "${BUILD_DIR}/webapps_updated.json" "${BUILD_DIR}/webapps.json"
    echo
    echo "Pushing ${APP_NAME}..."
    echo "adb push \"${BUILD_DIR}/${APP_NAME}\" \"${APP_DIR}/${APP_NAME}\""
    echo "adb push \"${BUILD_DIR}/webapps.json\" \"${APP_DIR}/webapps.json\""
fi
if [ ${REBOOT} -eq 1 ]; then
    echo
    echo "Rebooting..."
    adb reboot
fi

echo "Done"
