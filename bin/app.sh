#!/usr/bin/env sh

# Exit immediately on errors.
set -e

PROFILE_DATA=$(convert-ns-profile --ns-host $NS_HOST --api-secret $NS_API_SECRET --token $NS_TOKEN --profile $NS_PROFILE --min-5m-carb-impact $MIN_5MIN_CARBIMPACT --autosens-min $AUTOSENS_MIN --autosens-max $AUTOSENS_MAX)

# Prepare for autotune
echo "Preparing oref0-autotune directory structure..."
export OPENAPS_WORKDIR="/root/openaps"
mkdir -p $OPENAPS_WORKDIR/settings
export SETTINGS_DIR=$OPENAPS_WORKDIR/settings

echo $PROFILE_DATA > $SETTINGS_DIR/profile.json

# Check if profile is valid json, exit if invalid.
jq . $SETTINGS_DIR/profile.json > /dev/null

cp $SETTINGS_DIR/profile.json $SETTINGS_DIR/pumpprofile.json
cp $SETTINGS_DIR/profile.json $SETTINGS_DIR/autotune.json
echo "Done preparing for oref0-autotune."

run-autotune -h=$NS_HOST -s=$NS_API_SECRET -t=$NS_TOKEN -w=$OPENAPS_WORKDIR -d=$AUTOTUNE_DAYS -m=$UAM_AS_BASAL