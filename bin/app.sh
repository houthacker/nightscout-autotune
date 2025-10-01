#!/usr/bin/env sh

# Exit immediately on errors.
set -e

# Processing directory
OPENAPS_WORKDIR=${OPENAPS_WORKDIR:-"/tmp/autotune"}
RECOMMENDATIONS_FILE=${OPENAPS_WORKDIR}"/autotune/autotune_recommendations.log"

running_inside_docker () {
    if [ $(cat /proc/1/cgroup | grep docker | wc -l) -eq 0 ]; then
        echo 1
    else
        echo 0
    fi
}

show_docker_usage () {
    cat << EOF
    SYNOPSIS
        docker run  -e NS_HOST=<ns_host> -e AUTOTUNE_DAYS=<autotune_days> -e UAM_AS_BASAL=<true|false> 
                    [-e NS_API_SECRET=<api_secret>] [-e NS_TOKEN=<token>] [-e NS_PROFILE=<profile_name>]
                    [-e MIN_5MIN_CARBIMPACT=<min_5m_carb_impact>] 
                    [-e AUTOSENS_MIN=<autosens_min>] [-e AUTOSENS_MAX=<autosens_max>] [-e INSULIN_TYPE=<rapid-acting|ultra-rapid>]
    
    DESCRIPTION
        Run OpenAPS autotune against a Nightscout profile.

    MANDATORY OPTIONS
        -e NS_HOST=<host>
            The Nightscout base URL, i.e. https://my.nightscout.host

        -e AUTOTUNE_DAYS=<days>
            The amount of days to process, starting from yesterday.

        -e UAM_AS_BASAL=<true|false>
            Whether to categorize UAM as basal.

    NON-MANDATORY OPTIONS
        -e NS_PROFILE=<profile_name>
            The name of the Nightscout profile to use for processing. If omitted, 
            the current default profile is used.

        -e NS_API_SECRET=<sha1(secret)>
            The SHA1 hash of the API secret. Use this or a token if your Nightscout instance is locked down, 
            i.e. has AUTH_DEFAULT_ROLES set to something other than 'readable'.

        -e NS_TOKEN=<sha1(token)>
            The SHA1 hash of a Nightscout access token (admin tools > subjects > access token). Use this,
            or an API secret if your Nightscout instance is locked down, i.e. has AUTH_DEFAULT_ROLES
            set to something other than 'readable'.

        -e MIN_5MIN_CARBIMPACT=<min_5m_carb_impact>
            The minimal carbs absorption per 5 minutes. Defaults to 8.0 if omitted.

        -e AUTOSENS_MIN=<autosens_min>
            The multiplier for adjustments during insulin sensitivity. Defaults to 0.7 if omitted.

        -e AUTOSENS_MAX=<autosens_max>
            The multiplier for adjustments during insulin resistance. Defaults to 1.2 if omitted.

        -e INSULIN_TYPE=<rapid-acting|ultra-rapid>
            The type of insulin used to determine how fast is acts and decays. Defaults to 'rapid-acting' if omitted.

        -e OPENAPS_WORKDIR=<workdir>
            The working directory. Defaults to '/tmp/openaps' if omitted.

    EXAMPLES
        Running the image against a locked-down host using a dedicated token that is stored plaintext in a file:

        $ docker run -e NS_HOST=https://the.nightscout.host -e AUTOTUNE_DAYS=10 -e UAM_AS_BASAL=false -e NS_TOKEN=\$(echo -n "\$(cat ~/.nightscout-token)"|sha1sum|awk '{print \$1}') --rm nightscout-autotune

EOF
}

show_standalone_usage () {
    cat << EOF
    SYNOPSIS
        NS_HOST=<ns_host> AUTOTUNE_DAYS=<autotune_days> UAM_AS_BASAL=<true|false> 
        [NS_API_SECRET=<api_secret>] [NS_TOKEN=<token>] [NS_PROFILE=<profile_name>]
        [MIN_5MIN_CARBIMPACT=<min_5m_carb_impact>] 
        [AUTOSENS_MIN=<autosens_min>] [AUTOSENS_MAX=<autosens_max>] 
        [INSULIN_TYPE=<rapid-acting|ultra-rapid>] $0 [help]
    
    DESCRIPTION
        Run OpenAPS autotune against a Nightscout profile.

    MANDATORY OPTIONS
        NS_HOST=<host>
            The Nightscout base URL, i.e. https://my.nightscout.host

        AUTOTUNE_DAYS=<days>
            The amount of days to process, starting from yesterday.

        UAM_AS_BASAL=<true|false>
            Whether to categorize UAM as basal.

    NON-MANDATORY OPTIONS
        help
            Show this usage description.

        NS_PROFILE=<profile_name>
            The name of the Nightscout profile to use for processing. If omitted, 
            the current default profile is used.

        NS_API_SECRET=<sha1(secret)>
            The SHA1 hash of the API secret. Use this or a token if your Nightscout instance is locked down, 
            i.e. has AUTH_DEFAULT_ROLES set to something other than 'readable'.

        NS_TOKEN=<sha1(token)>
            The SHA1 hash of a Nightscout access token (admin tools > subjects > access token). Use this,
            or an API secret if your Nightscout instance is locked down, i.e. has AUTH_DEFAULT_ROLES
            set to something other than 'readable'.

        MIN_5MIN_CARBIMPACT=<min_5m_carb_impact>
            The minimal carbs absorption per 5 minutes. Defaults to 8.0 if omitted.

        AUTOSENS_MIN=<autosens_min>
            The multiplier for adjustments during insulin sensitivity. Defaults to 0.7 if omitted.

        AUTOSENS_MAX=<autosens_max>
            The multiplier for adjustments during insulin resistance. Defaults to 1.2 if omitted.
        
        INSULIN_TYPE=<rapid-acting|ultra-rapid>
            The type of insulin used to determine how fast is acts and decays. Defaults to 'rapid-acting' if omitted.

        OPENAPS_WORKDIR=<workdir>
            The working directory. Defaults to '/tmp/openaps' if omitted.

    EXAMPLES
        Running against a locked-down host using a dedicated token that is stored plaintext in a file:

        $ NS_HOST=https://the.nightscout.host AUTOTUNE_DAYS=10 UAM_AS_BASAL=false NS_TOKEN=\$(echo -n "\$(cat ~/.nightscout-token)"|sha1sum|awk '{print \$1}') $0

EOF
}

show_usage () {
    if [ $(running_inside_docker) -eq 0 ]; then 
        show_docker_usage
    else    
        show_standalone_usage
    fi
}

if [ "${@-x}" = "--help" ]; then
    show_usage
    exit 0
elif [ -z "$NS_HOST" ] || [ -z "$AUTOTUNE_DAYS" ] || [ -z "$UAM_AS_BASAL" ]; then
    show_usage
    exit 1
fi

PROFILE_DATA=$(convert-ns-profile --ns-host $NS_HOST --api-secret $NS_API_SECRET --token $NS_TOKEN --profile $NS_PROFILE \
    --min-5m-carb-impact $MIN_5MIN_CARBIMPACT --autosens-min $AUTOSENS_MIN --autosens-max $AUTOSENS_MAX \
    --insulin-type $INSULIN_TYPE)

# Prepare for autotune
echo "Preparing oref0-autotune directory structure in ${OPENAPS_WORKDIR}..."
mkdir -p $OPENAPS_WORKDIR/settings
export SETTINGS_DIR=$OPENAPS_WORKDIR/settings

echo $PROFILE_DATA > $SETTINGS_DIR/profile.json

# Check if profile is valid json, exit if invalid.
jq . $SETTINGS_DIR/profile.json > /dev/null

cp $SETTINGS_DIR/profile.json $SETTINGS_DIR/pumpprofile.json
cp $SETTINGS_DIR/profile.json $SETTINGS_DIR/autotune.json
echo "Done preparing for oref0-autotune."

run-autotune -h=$NS_HOST -s=$NS_API_SECRET -t=$NS_TOKEN -w=$OPENAPS_WORKDIR -d=$AUTOTUNE_DAYS -m=$UAM_AS_BASAL