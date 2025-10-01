import { open } from 'node:fs/promises';
import { timeParse } from 'd3-time-format';
import { fileURLToPath } from 'url';
import ejs from 'ejs';

/**
 * @typedef {number} RecommendationType
 * 
 * @readonly
 * @enum {number}
 */
const RecommendationType = {
    ISF: 'ISF',
    CR: 'CR',
    BASAL: 'BASAL'
};

const ISF_LINE_START = 'ISF';
const CR_LINE_START = 'Carb Ratio';

/**
 * Checks whether the given string is numeric.
 * @param {string} str The string to test.
 * @returns {boolean} `true` if the string is numberic, `false` otherwise.
 */
function is_numeric(str) {
    return !isNaN(Number(str));
}

/**
 * A data class to store options used when executing an autotune job.
 * @typedef {Object} AutotuneOptions
 * @property {string} ns_host - The URL of the Nightscout instance autotune ran against.
 * @property {string} date_from - The start date Autotune used to analyze the data.
 * @property {string} date_to - The end date (inclusive) Autotune used to analyze the data.
 * @property {boolean} uam - Whether Unannounced meals counted towards basal recommendations.
 * @property {string} autotune_version - The Autotune version used to compile the recommendation.
 */
export class AutotuneOptions {
    ns_host;
    date_from;
    date_to;
    uam;
    autotune_version;
}

/**
 * A `Recommendation` represents a single line from an autotune 
 * recommendations log file.
 * @typedef {Object} Recommendation
 * @property {RecommendationType} type - The type of this recommendation.
 * @property {number} current - The current profile value.
 * @property {number} recommended_value - The recommended profile value.
 * @property {number} rounded_recommendation - The recommended_value, rounded up to the nearest 0.05.
 */
export class Recommendation {

    /**
     * Create a new `Recommendation`.
     * @param {RecommendationType} type The type of this recommendation.
     * @param {number} current The current profile value.
     * @param {number} recommended The recommended profile value.
     */
    constructor(type, current, recommended) {
        this.type = type;
        this.current_value = current;
        this.recommended_value = recommended;
        this.rounded_recommendation = parseFloat((Math.ceil(recommended * 20 - 0.5) / 20).toFixed(2));
    }

    /**
     * Creates a new `Recommendation` or a subtype based on the given line.
     * @param {string} line A line from an autotune recommendations log file.
     * @returns {Recommendation|undefined} The parsed `Recommendation`, or `undefined` if the line does not contain a recommendation.
     */
    static create_from_line(line) {
        let ln = line.trim();

        // Columns are: [parameter, pump, autotune, days_missing]
        let columns = ln.split('|');

        if (ln.startsWith(ISF_LINE_START)) {
            return new Recommendation(RecommendationType.ISF, parseFloat(columns[1].trim()), parseFloat(columns[2].trim()));
        } else if (ln.startsWith(CR_LINE_START)) {
            return new Recommendation(RecommendationType.CR, parseFloat(columns[1].trim()), parseFloat(columns[2].trim()));
        } else if (is_numeric(ln.charAt(0))) {
            let hour_string = columns[0].trim();
            
            // half hours of basal recommendation have no values, so bail out and ignore those.
            for (const idx of [1, 2, 3]) {
                if (columns[idx].trim().length == 0) {
                    return undefined;
                }
            }

            let when = timeParse('%H:%M')(hour_string);
            return new BasalRecommendation(when, parseFloat(columns[1].trim()), parseFloat(columns[2].trim()), parseInt(columns[3]));
        }

        return undefined;
    }
}

/**
 * A recommendation for basal amount at a specified time of day.
 * 
 * @typedef {Object} BasalRecommendation
 * @extends Recommendation
 * @property {Date} when - The time of day of this recommendation in the format `%H:%M`.
 * @property {number} days_missing - The amount of days without data.
 */
export class BasalRecommendation extends Recommendation {

    /**
     * Create a new `Recommendation`.
     * @param {Date} when The time of day of this recommendation, parsed from the format `%H:%M`.
     * @param {number} current The current profile value.
     * @param {number} recommended The recommended profile value.
     * @param {number} days_missing The amount of days without data.
     */
    constructor(when, current, recommended, days_missing) {
        super(RecommendationType.BASAL, current, recommended, days_missing);

        this.when = when;
        this.days_missing = days_missing;
    }
}

/**
 * A result of a single autotune run, containing the recommendations for
 * the users' profile.
 * @typedef {Object} AutotuneResult
 * @property {Recommendation[]} recommendations - The recommendations.
 */
export class AutotuneResult {

        /**
         * Create a new `AutotuneResult`.
         * 
         * @param {Recommendation[]} recommendations The recommendations.
         * @param {AutotuneOptions} options The arguments used to run autotune.
         */
    constructor(recommendations, options) {
        this.options = options
        this.recommendations = recommendations;
    }

    /**
     * Creates a new `AutotuneResult` based on an autotune recommendations log file.
     * @param {string} path The path to the recommendations log file. May be absolute or relative.
     * @param {object} options The autotune parameters. Defaults to `{}`.
     * @returns {AutotuneResult} The parsed autotune result.
     */
    static async create_from_log(path, options = {}) {
        const file = await open(path);

        let recommendations = [];
        for await (const line of file.readLines()) {
            let r = Recommendation.create_from_line(line);
            if (r instanceof Recommendation) {
                recommendations.push(r);
            }
        }

        return new AutotuneResult(recommendations, options);
    }

    /**
     * Finds the Insuline Sensivitiy Factor recommendation.
     * @returns { Recommendation } The ISF recommendation, or `{}` if no such recommendation exists.
     */
    find_isf() {
        let filtered = this.recommendations.filter(r => r.type == RecommendationType.ISF);
        return filtered[0] || {};
    }

    /**
     * Finds the Carb Ratio recommendation.
     * @returns { Recommendation } The CR recommendation, or `{}` if not such recommendation exists.
     */
    find_cr() {
        let filtered = this.recommendations.filter(r => r.type == RecommendationType.CR);
        return filtered[0] || {};
    }

    /**
     * 
     * Finds all basal recommendations.
     * @return { BasalRecommendation[] } The basal recommendations.
     */
    find_basal() {
        return this.recommendations.filter(r => r.type == RecommendationType.BASAL);
    }
}

/**
 * Creates an HTML page of the given `AutotuneResult`.
 * @param {AutotuneResult} autotune_result The autotune recommendations.
 * @returns {string} The HTML representation of the given result.
 */
export async function result_to_html(autotune_result) {
    let path = fileURLToPath(import.meta.resolve(import.meta.dirname + '/../views/autotune_result.ejs'));
    return await ejs.renderFile(path, { 
        result: autotune_result, 
        isf: autotune_result.find_isf(),
        cr: autotune_result.find_cr(),
        basal: autotune_result.find_basal()
    });
}