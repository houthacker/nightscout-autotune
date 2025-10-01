import { test } from 'node:test';
import { AutotuneResult } from '../src/autotune_recommendations_parser.js';
import { fileURLToPath } from 'url';
import assert from 'node:assert';

function fixture_path(name) {
    return fileURLToPath(import.meta.resolve(import.meta.dirname + '/resources/' + name));
}

test('parse an autotune recommendations log', async (t) => {
    let autotune_result = await AutotuneResult.create_from_log(fixture_path('autotune_recommendations.log'));

    assert.deepStrictEqual(JSON.parse(JSON.stringify(autotune_result)), {
        recommendations: [
            { type: "ISF", current_value: 15, recommended_value: 17.315, rounded_recommendation: 17.3 },
            { type: "CR", current_value: 15.5 , recommended_value: 14.494 , rounded_recommendation: 14.5 }, 
            { type: "BASAL" , current_value: 0.25 , recommended_value: 0.3 , rounded_recommendation: 0.3 , when: "1900-01-01T00:00:00.000Z" , days_missing: 0 },
            { type: "BASAL" , current_value: 0.25 , recommended_value: 0.295 , rounded_recommendation: 0.3 , when: "1900-01-01T01:00:00.000Z" , days_missing: 0 },
            { type: "BASAL" , current_value: 0.25 , recommended_value: 0.3 , rounded_recommendation: 0.3 , when: "1900-01-01T02:00:00.000Z" , days_missing: 0 },
            { type: "BASAL" , current_value: 0.3 , recommended_value: 0.354 , rounded_recommendation: 0.35 , when: "1900-01-01T03:00:00.000Z" , days_missing: 1 },
            { type: "BASAL", current_value: 0.3 , recommended_value: 0.354 , rounded_recommendation: 0.35 , when: "1900-01-01T04:00:00.000Z" , days_missing: 1 },
            { type: "BASAL" , current_value: 0.3 , recommended_value: 0.354 , rounded_recommendation: 0.35 , when: "1900-01-01T05:00:00.000Z" , days_missing: 1 },
            { type: "BASAL" , current_value: 0.3 , recommended_value: 0.36 , rounded_recommendation: 0.35 , when: "1900-01-01T06:00:00.000Z" , days_missing: 0 },
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.42 , rounded_recommendation: 0.4 , when: "1900-01-01T07:00:00.000Z" , days_missing: 0 },
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.42 , rounded_recommendation: 0.4 , when: "1900-01-01T08:00:00.000Z" , days_missing: 1 }, 
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.42 , rounded_recommendation: 0.4 , when: "1900-01-01T09:00:00.000Z" , days_missing: 1 },
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.42 , rounded_recommendation: 0.4 , when: "1900-01-01T10:00:00.000Z" , days_missing: 0 },
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.269 , rounded_recommendation: 0.25 , when: "1900-01-01T11:00:00.000Z" , days_missing: 1 },
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.309 , rounded_recommendation: 0.3 , when: "1900-01-01T12:00:00.000Z" , days_missing: 0 },
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.251 , rounded_recommendation: 0.25 , when: "1900-01-01T13:00:00.000Z" , days_missing: 1 },
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.245 , rounded_recommendation: 0.25 , when: "1900-01-01T14:00:00.000Z" , days_missing: 0 },
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.245 , rounded_recommendation: 0.25 , when: "1900-01-01T15:00:00.000Z" , days_missing: 0 },
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.245 , rounded_recommendation: 0.25 , when: "1900-01-01T16:00:00.000Z" , days_missing: 0 },
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.397 , rounded_recommendation: 0.4 , when: "1900-01-01T17:00:00.000Z" , days_missing: 1 },
            { type: "BASAL" , current_value: 0.34 , recommended_value: 0.387 , rounded_recommendation: 0.4 , when: "1900-01-01T18:00:00.000Z" , days_missing: 1 },
            { type: "BASAL" , current_value: 0.35 , recommended_value: 0.397 , rounded_recommendation: 0.4 , when: "1900-01-01T19:00:00.000Z" , days_missing: 1 },
            { type: "BASAL" , current_value: 0.33 , recommended_value: 0.377 , rounded_recommendation: 0.4 , when: "1900-01-01T20:00:00.000Z" , days_missing: 1 } , 
            { type: "BASAL" , current_value: 0.3 , recommended_value: 0.349 , rounded_recommendation: 0.35 , when: "1900-01-01T21:00:00.000Z" , days_missing: 1 },
            { type: "BASAL" , current_value: 0.3 , recommended_value: 0.349 , rounded_recommendation: 0.35 , when: "1900-01-01T22:00:00.000Z" , days_missing: 1 },
            { type: "BASAL" , current_value: 0.3 , recommended_value: 0.349 , rounded_recommendation: 0.35 , when: "1900-01-01T23:00:00.000Z" , days_missing: 1 },
        ]
    });
});