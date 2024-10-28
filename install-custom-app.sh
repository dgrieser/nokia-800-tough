#!/bin/bash

usage()
{
    echo "Usage: $(basename ${0}) <archive> [-r|--reboot]" 1>&2
    exit 1
}

ROOT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

source "${ROOT_DIR}/functions"

ARCHIVE=""
REBOOT=0

while [ $# -gt 0 ]; do
    case ${1} in
        -r|--reboot)
            [ ${REBOOT} -eq 1 ] && usage
            REBOOT=1
        ;;
        *)
            if [ -z "${ARCHIVE}" ]; then
                ARCHIVE="${1}"
                [ ! -f "${ARCHIVE}" ] && print_error "${ARCHIVE} not found!"
                [ "${ARCHIVE##*.}" != "zip" ] && print_error "${ARCHIVE} is not a zip archive!"
            else
                usage
            fi
        ;;
    esac
    shift
done

[ -z "${ARCHIVE}" ] && usage
check_device

APP_NAME="$(basename ${ARCHIVE} .zip)"

clean_build_dir

echo
echo "Preparing ${APP_NAME}..."
install_with_gdeploy "${ARCHIVE}"

if [ ${REBOOT} -eq 1 ]; then
    reboot_device
fi

echo "Done"
