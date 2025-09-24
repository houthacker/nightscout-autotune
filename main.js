import cli_args from 'command-line-args';
import { fetch_profile } from './src/fetch_profile.js';
import { ns_to_oaps } from './src/profile_converter.js';
import util from 'node:util';

const option_definitions = [
    { name: 'autosens-min', type: Number, defaultValue: 0.7, description: 'Multiplier for adjustments during insulin sensitivity' },
    { name: 'autosens-max', type: Number, defaultValue: 1.2, description: 'Multiplier for adjustments during insulin resistance' },
    { name: 'min-5m-carb-impact', alias: 'c', type: Number, defaultValue: 8.0, description: 'Minimum carb absorption in grams per 5 minutes' },
    { name: 'ns-host', alias: 'n', type: String, defaultOption: true, description: 'The Nightscout base URL, for example https://nightscout.example.com' },
    { name: 'profile', alias: 'p', type: String, description: 'The name of the profile to use. If omitted, the default profile is used.' },   
];
const options = cli_args(option_definitions);

(async function run() {  
    if(options['ns-host'] === undefined) {
        console.error('Missing argument \'ns-host\'. Use --help for more info.');
        process.exit(1);
    }

    let autosens_min = options['autosens-min'];
    let autosens_max = options['autosens-max'];
    let min_5m_carbimpact = options['min-5m-carb-impact'];
    let ns_host = options['ns-host'];
    let profile = options['profile'];

    let ns_profile = await fetch_profile(ns_host, profile);
    let oaps_profile = ns_to_oaps(ns_profile, min_5m_carbimpact, autosens_min, autosens_max);
    console.log(JSON.stringify(oaps_profile));
})();
