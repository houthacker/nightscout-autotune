import { readFileSync } from 'node:fs';
import { test }  from 'node:test';
import { fileURLToPath } from 'node:url';
import { ns_to_oaps } from '../src/profile_converter.js';
import assert from 'node:assert';

function json_fixture(name) {
    return JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(import.meta.dirname + '/resources/' + name)), 'utf8'));
}

function default_profile(data) {
    let latest = data[0];
    return latest.store[latest.defaultProfile];
}

test('convert a profile', async (t) => {
    let ns_profile = default_profile(json_fixture('ns_profile.json'));
    let oaps_profile = ns_to_oaps(ns_profile);
    
    assert.deepEqual(oaps_profile, json_fixture('oaps_profile.json'));
});