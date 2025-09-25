import cli_args from 'command-line-args';
import cli_usage from 'command-line-usage';
import { fetch_profile } from './src/fetch_profile.js';
import { ns_to_oaps } from './src/profile_converter.js';

const AUTOSENS_MIN_DEFAULT = 0.7;
const AUTOSENS_MAX_DEFAULT = 1.2;
const MIN_5M_CARBIMPACT_DEFAULT = 8.0;

const option_definitions = [
    { name: 'ns-host', alias: 'n', defaultOption: true, description: 'The Nightscout base URL, for example https://nightscout.example.com' },
    { name: 'profile', alias: 'p', type: String, description: 'The name of the profile to use. If omitted, the default profile is used.' },   
    { name: 'autosens-min', type: Number, defaultValue: AUTOSENS_MIN_DEFAULT, description: 'Multiplier for adjustments during insulin sensitivity. Defaults to 0.7 if omitted.' },
    { name: 'autosens-max', type: Number, defaultValue: AUTOSENS_MAX_DEFAULT, description: 'Multiplier for adjustments during insulin resistance. Defaults to 1.2 if omitted.' },
    { name: 'min-5m-carb-impact', alias: 'c', type: Number, defaultValue: MIN_5M_CARBIMPACT_DEFAULT, description: 'Minimum carb absorption in grams per 5 minutes. Defaults to 8.0 if omitted.' },
    { name: 'help', alias: 'h', type: String, description: 'Print usage instructions.' }
];
const options = cli_args(option_definitions);

function print_usage() {
    const usage = cli_usage([
        {
            header: 'Nightscout profile converter',
            content: [
                'Convert a Nightscout profile to an OpenAPS profile.',
                '',
                'Home: {underline https://github.com/houthacker/nightscout-profile-converter}'
            ]
        },
        {
            header: 'Options',
            optionList: option_definitions,
            tableOptions: {
                noWrap: true
            }
        }
    ])

    console.log(usage);
}

(async function run() {
    if(options['help'] !== undefined) {
        print_usage();
    } else if(options['ns-host'] === undefined) {
        console.error('\x1b[31m%s\x1b[0m\n\nUsage:', 'Missing mandatory argument \'ns-host\'.');
        print_usage();
        process.exit(1);
    } else if(!options['ns-host']) {
        console.error('\x1b[31m%s\x1b[0m\n\nUsage:', 'Missing value of mandatory argument \'ns-host\'.');
        print_usage();
        process.exit(1);
    } else {
        let autosens_min = options['autosens-min'] || AUTOSENS_MIN_DEFAULT;
        let autosens_max = options['autosens-max'] || AUTOSENS_MAX_DEFAULT;
        let min_5m_carbimpact = options['min-5m-carb-impact'] || MIN_5M_CARBIMPACT_DEFAULT;
        let ns_host = options['ns-host'];
        let profile = options['profile'] || undefined;

        console.error('Converting profile using the following parameters:');
        console.error(`ns_host:\t\t${ns_host}`);
        if (profile) {
            console.error(`profile:\t\t${profile}`);
        } else {
            console.error('profile:\t\t<default>');
        }
        console.error(`min_5m_carbimpact:\t${min_5m_carbimpact}`);
        console.error(`autosens_min:\t\t${autosens_min}`);
        console.error(`autosens_max:\t\t${autosens_max}`);
        console.error();
        

        let ns_profile = await fetch_profile(ns_host, profile);
        let oaps_profile = ns_to_oaps(ns_profile, min_5m_carbimpact, autosens_min, autosens_max);
        console.log(JSON.stringify(oaps_profile, null, 2));
    }
})();
