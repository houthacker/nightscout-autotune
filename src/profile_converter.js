import { timeParse } from 'd3-time-format';

/**
 * The type of insulin in the profile.
 * @typedef {('rapid-acting'|'ultra-rapid')} InsulinType
 */
export const InsulinType = {
    RAPID: 'rapid-acting',
    ULTRA_RAPID: 'ultra-rapid'
}

function normalize_ns_timed_element(element) {
    let time = {...element}
    if(time.timeAsSeconds === undefined) {
        let tm = timeParse('%H:%M')(time.time);
        time.timeAsSeconds = tm.getHours() * 3600 + tm.getMinutes() * 60
    }
    if(time.time === undefined) {
        let hours = time.timeAsSeconds / 3600;
        let minutes = time.timeAsSeconds % 60;
        time.time = String(hours).padStart(2, '0') + ":" + String(minutes).padStart(2, '0');
    }

    return {
        ...time,
        start: time.time + ":00",
        minutes: time.timeAsSeconds / 60
    }
}

/**
 * @typedef {Object} TimedValue
 * @property {number} timeAsSeconds - The time of day represented in seconds, e.g. `14400` for `04:00`.
 * @property {number} value - The value to average
 */

/**
 * Calculates the weighted average of CR and ISF elements from a NS profile.
 * This function assigns every hour-of-day a weight of 1.
 * 
 * @param {TimedValue[]} elements The elements to calculate the weighted average of.
 * @returns {number} The weighted average.
 */
function calculate_weighted_average(elements) {
    let maxTimeAsSeconds = 86400;
    let sum = 0;
    for (const [idx, element] of elements.entries()) {
        let nextTimeAsSeconds = elements.length === idx + 1 ? maxTimeAsSeconds : elements[idx + 1].timeAsSeconds;
        let elementHours = (nextTimeAsSeconds - element.timeAsSeconds) / 3600;
        sum += (element.value * elementHours);
    }

    return parseFloat((sum / 24).toFixed(1));
}

/**
 * Converts the given `ns_profile` to an OAPS profile, analog to the OAPS python implementation.
 * 
 * @see https://github.com/openaps/oref0/blob/v0.7.1/bin/get_profile.py
 * @param {object} ns_profile The Nightscout profile.
 * @param {number} min_5m_carbimpact The minimal carbs absorption per 5 minutes.
 * @param {number} autosens_min The multiplier for adjustments during insulin sensitivity.
 * @param {number} autosens_max The multiplier for adjustments during insulin resistance.
 * @param {InsulinType} curve The insulin type to infer how quickly it acts and decays.
 * @returns The OAPS profile.
 */
export function ns_to_oaps(ns_profile, min_5m_carbimpact = 8.0, autosens_min = 0.7, autosens_max = 1.2, curve = InsulinType.RAPID) {
    let oaps_profile = {
        min_5m_carbimpact: min_5m_carbimpact,
        dia: ns_profile.dia,
        autosens_max: autosens_max,
        autosens_min: autosens_min,
        out_units: ns_profile.units,
        timezone: ns_profile.timezone,
        curve: curve
    };

    // Basal profile
    oaps_profile.basalprofile = [];
    for(const [_, basal_item] of Object.entries(ns_profile.basal)) {
        oaps_profile.basalprofile.push({
            i: oaps_profile.basalprofile.length,
            ...normalize_ns_timed_element(basal_item),
            rate: basal_item.value
        });
    }

    // BG targets
    oaps_profile.bg_targets = {
        units: ns_profile.units,
        user_preferred_units: ns_profile.units,
        targets: []
    }
    let targets = {};

    // Extract low targets
    for(const [_, low] of Object.entries(ns_profile.target_low)) {
        let normalized = normalize_ns_timed_element(low);
        targets[normalized.time] = targets[normalized.time] || {};
        targets[normalized.time].low = {
            i: Object.keys(targets).length,
            start: normalized.start,
            offset: normalized.timeAsSeconds,
            low: normalized.value
        };
    }

    // Extract high targets
    for(const [_, high] of Object.entries(ns_profile.target_high)) {
        let normalized = normalize_ns_timed_element(high);
        targets[normalized.time] = targets[normalized.time] || {};
        targets[normalized.time].high = {
            high: normalized.value
        };
    }

    // Append targets to profile
    for(const time of Object.keys(targets).sort()) {
        let ttime = targets[time];
        oaps_profile.bg_targets.targets.push({
            i: oaps_profile.bg_targets.targets.length,
            start: ttime.low.start,
            offset: ttime.low.offset,
            low: ttime.low.low,
            min_bg: ttime.low.low,
            high: ttime.high.high,
            max_bg: ttime.high.high
        });
    }

    // Insulin sensitivity profile.
    // Autotune only uses the first ISF value from the OpenAPS profile.
    // So we calculate the weighted average of the NS profile sensitivities
    // and add just one element here, instead of parsing all ISF elements 
    // from the NS profile.
    // A snippet that uses all ISF elements, if autotune ever is going to do that,
    // can be found in the git history.
    oaps_profile.isfProfile = {
        first: 1,
        sensitivities: [{
            i: 0,
            start: "00:00:00",
            offset: 0,
            sensitivity: calculate_weighted_average(ns_profile.sens),
        }]
    };

    // Carb ratio(s).
    // Autotune only uses the first ISF value from the OpenAPS profile.
    // So we calculate the weighted average of the NS profile ratios
    // and add just one element here, instead of parsing all CR elements 
    // from the NS profile.
    // A snippet that uses all CR elements, if autotune ever is going to do that,
    // can be found in the git history.
    oaps_profile.carb_ratio = calculate_weighted_average(ns_profile.carbratio);
    oaps_profile.carb_ratios = {
        first: 1,
        units: "grams",
        schedule: [{
            i: 0,
            offset: 0,
            ratio: oaps_profile.carb_ratio,
            start: "00:00:00",
        }]
    };

    // Sort profile by keys
    let sorted_profile = {}
    for(const key of Object.keys(oaps_profile).sort()) {
        sorted_profile[key] = oaps_profile[key];
    }

    return sorted_profile;
}