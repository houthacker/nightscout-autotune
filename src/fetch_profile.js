import { URL } from 'node:url';
import fetch from 'node-fetch';

export async function fetch_profile(ns_url, profile_name = undefined) {
    let url = new URL("api/v2/profile.json", ns_url);
    let response = await fetch(url);
    let data = await response.json();

    if(Array.isArray(data) && data.length > 0) {
        let profiles = data[0];
        let name = profile_name === undefined ? profiles.defaultProfile : profile_name;

        let profile = profiles.store[name];
        if(profile === undefined) {
            throw new Error(`No profile with name '${name}'`);
        }

        return profile;
    } else {
        throw new Error(`No profiles found at ${url.toString()}`);
    }
}