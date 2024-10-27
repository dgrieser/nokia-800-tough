#!/bin/bash

usage()
{
    echo "Usage: $(basename ${0}) <app-folder> [-p|--push] [-r|--reboot]" 1>&2
    exit 1
}

ROOT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

source "${ROOT_DIR}/functions"

APP_FOLDER=""
PUSH=0
REBOOT=0

while [ $# -gt 0 ]; do
    case ${1} in
        -p|--push)
            [ ${PUSH} -eq 1 ] && usage
            PUSH=1
        ;;
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
[ ${REBOOT} -eq 1 ] && [ ${PUSH} -eq 0 ] && print_error "Reboot only makes sense when pushing data"
[ ${PUSH} -eq 1 ] && check_device

APP_NAME="$(basename ${APP_FOLDER})"

clean_build_dir

echo
echo "Packaging ${APP_NAME}..."
cd "${APP_FOLDER}" >/dev/null || print_error "Failed to cd into ${APP_FOLDER}"
zip -r "${BUILD_DIR}/${APP_NAME}/application.zip" . || print_error "Failed to package ${APP_NAME}"
cd - >/dev/null
cp -v "${APP_FOLDER}_manifest.webapp" "${BUILD_DIR}/${APP_NAME}/manifest.webapp" || print_error "Failed to find ${APP_FOLDER}_manifest.webapp"

if [ ${PUSH} -eq 1 ]; then
    echo
    echo "Attempting to update basePath for ${APP_NAME}..."
    adb pull "${WEBAPP_DIR}/webapps.json" "${BUILD_DIR}/webapps.json"
    jq 'if .["'${APP_NAME}'"].basePath? then .["'${APP_NAME}'"].basePath = "'${WEBAPP_DIR}'" else error("Key not found") end' \
        "${BUILD_DIR}/webapps.json" > "${BUILD_DIR}/webapps_updated.json" \
        || print_error "Failed to update basePath for ${APP_NAME}"
    diff -u --color=always "${BUILD_DIR}/webapps.json" "${BUILD_DIR}/webapps_updated.json"
    mv "${BUILD_DIR}/webapps_updated.json" "${BUILD_DIR}/webapps.json"
    echo
    echo "Pushing ${APP_NAME}..."
    adb push "${BUILD_DIR}/${APP_NAME}" "${WEBAPP_DIR}/${APP_NAME}"
    adb push "${BUILD_DIR}/webapps.json" "${WEBAPP_DIR}/webapps.json"
fi
if [ ${REBOOT} -eq 1 ]; then
    reboot_device
fi

echo "Done"
