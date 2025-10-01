#!/usr/bin/env node
import cli_args from 'command-line-args';
import cli_usage from 'command-line-usage';
import { AutotuneResult, AutotuneOptions, result_to_html } from './autotune_recommendations_parser.js';

const option_definitions = [
    { name: 'recommendations-file', alias: 'f', type: String, description: 'The path to Autotune recommendations log file.' },
    { name: 'ns-host', alias: 'n', type: String, description: 'The Nightscout base URL, for example https://nightscout.example.com' },
    { name: 'start-date', alias: 's', type: String, description: 'The start date in the format YYYY-MM-DD, used to analyze Nightscout data.'},
    { name: 'end-date', alias: 'e', type: String, description: 'The inclusive end date in the format YYYY-MM-DD, used to analyze Nightscout data.'},
    { name: 'uam-as-basal', alias: 'u', type: String, defaultValue: false, description: 'Whether UAM were counted towards basal insulin.'},
    { name: 'autotune-version', type: String, description: 'The oref0-autotune version.'},
    { name: 'help', alias: 'h', type: String, description: 'Print usage instructions.' }
];
const options = cli_args(option_definitions);

function print_usage() {
    const usage = cli_usage([
        {
            header: 'Autotune HTML export',
            content: [
                'Export an Autotune recommendations log file to HTML.',
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
        process.exit();
    }

    for (const option of option_definitions.filter(o => !['uam-as-basal', 'help'].includes(o.name)).map(o => o.name)) {
        if (options[option] === undefined) {
            print_usage();
            process.exit(1);
        }
    }

    let recommendations_file = options['recommendations-file'];
    let ns_host = options['ns-host'];
    let start_date = options['start-date'];
    let end_date = options['end-date'];
    let uam_as_basal = options['uam-as-basal'];
    let autotune_version = options['autotune-version'];

    if (autotune_version.includes('@')) {
        // Got a version like 'oref0@0.7.1'. Strip the first part.
        let parts = autotune_version.split('@');
        autotune_version = parts[1];
    }
    
    console.error('Exporting recommendations to HTML using the following parameters:');
    console.error(`recommendations_file:\t${recommendations_file}`);
    console.error(`ns_host:\t\t${ns_host}`);
    console.error(`start_date:\t\t${start_date}`);
    console.error(`end_date:\t\t${end_date}`);
    console.error(`uam_as_basal:\t\t${uam_as_basal}`);
    console.error(`autotune_version:\t${autotune_version}`);

    let autotune_result = await AutotuneResult.create_from_log(recommendations_file, 
        new AutotuneOptions(ns_host, start_date, end_date, uam_as_basal, autotune_version));

    let html = await result_to_html(autotune_result);
    console.log(html);
})();
