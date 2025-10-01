#!/usr/bin/env sh

# Exit on errors
set -e

# Show usage.
show_usage () {
    echo "Usage: $0 -h=<ns_host> -w=<workdir> -d=<autotune_days> -m=<uam_as_basal> [-e=true|false] [-s=api_secret] [-t=token]"
    echo
    echo "Run oref0-autotune on a prepared directory."
    echo "This directory must contain a subdirectory called 'settings', which must contain the OpenAPS profiles."
    echo "The profiles must be named 'profile.json', 'autotune.json' and pumpprofile.json'."
    echo
    echo "Both api-secret and token are optional, but if both are provided, only api-secret is used."
    echo
    echo "-h        The Nightscout base URL, i.e. https://my.nightscout.host"
    echo "-w        The working directory for autotune."
    echo "-d        The amount of days to process, starting from yesterday."
    echo "-m        Whether to categorize UAM as basal (true|false)."
    echo "-e        (optional) Export the recommendations to an HTML file."
    echo "-s        (optional) An SHA1 hash of the Nightscout API secret."
    echo "-t        (optional) An SHA1 hash of the Nightscout access token."
    echo
    echo "A more detailed description of oref0-autotune can be found at:"
    echo "https://openaps.readthedocs.io/en/latest/docs/Customize-Iterate/autotune.html#phase-c-running-autotune-for-suggested-adjustments-without-an-openaps-rig"
}

for i in "$@"; do
    case $i in
        -h=*)
            ns_host="${i#*=}"
            shift
            ;;
        -w=*)
            autotune_workdir="${i#*=}"
            shift
            ;;
        -d=*)
            autotune_days="${i#*=}"
            shift
            ;;
        -m=*)
            uam_as_basal="${i#*=}"
            shift
            ;;
        -e=*)
            export_to_html="${i#*=}"
            shift
            ;;
        -s=*)
            secret="${i#*=}"
            shift
            ;;
        -t=*)
            ns_token="${i#*=}"
            shift
            ;;
        -*) 
            echo "Invalid argument '-$i'" >&2
            show_usage
            exit 1
            ;;
        *)
            ;;
    esac
done

validate_arguments () {
    if [ -z ${ns_host} ]; then
        echo "Missing mandatory Nightscout URL"
        show_usage
        exit 1
    elif [ -z ${autotune_workdir} ]; then
        echo "Missing mandatory autotune workdir"
        show_usage
        exit 1
    elif [ -z ${autotune_days} ]; then
        echo "Missing mandatory autotune days"
        show_usage
        exit 1
    elif [ -z ${uam_as_basal} ]; then
        echo "Missing mandatory uam-as-basal"
        show_usage
        exit 1
    fi

    if [ -z ${export_to_html-x} ]; then
        export_to_html="false"
    fi

    # oref0-autotune uses an environment variable to retrieve the Nightscout API secret or token.
    if [ ! -z ${secret} ]; then
        export API_SECRET=${secret}
    elif [ ! -z ${ns_token} ]; then
        export API_SECRET="token="${ns_token}
    fi
}

run_autotune () {
    end_date=$(date --date="yesterday" +%F)
    start_date=$(date --date="${end_date} -${autotune_days} day" +%F)

    API_SECRET=$API_SECRET oref0-autotune --dir=${autotune_workdir} --ns-host=${ns_host} --start-date=${start_date} --end-date=${end_date} \
        --log=true --categorize-uam-as-basal=${uam_as_basal}

    if [ ${export_to_html} = "true" ]; then
        oref_version=$(npm list -g | grep oref0 | awk '{print $2}')
        html-export --recommendations-file=${autotune_workdir}"/autotune/autotune_recommendations.log" \
            --ns-host=${ns_host} --start-date=${start_date} --end-date=${end_date} --uam-as-basal=${uam_as_basal} \
            --autotune-version=${oref_version} > ${autotune_workdir}"/autotune/autotune_recommendations.html"
    fi
}

validate_arguments
run_autotune
