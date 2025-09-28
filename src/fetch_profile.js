import { URL } from 'node:url';
import fetch from 'node-fetch';

/**
 * Fetches the requested profile from the Nightscout instance at `ns_url`. 
 * 
 * Between `api_secret` and `token`, `api_secret` is used if both are supplied.
 * 
 * @param {string} ns_url The base url of the Nightscout instance.
 * @param {string | undefined} api_secret The sha1-hash of the API secret to access the Nightscout instance, or `undefined` if no secret is required.
 * @param {string | undefined} ns_token The sha1-hash of the access token of the Nightscout instance, or `undefined` if no token is required.
 * @param {string | undefined} profile_name The name of the profile to fetch, or `undefined` for the default profile.
 * @returns The requested Nightscout profile.
 * @throws `Error` - If no profiles exist or if the specific profile cannot be found.
 */
export async function fetch_profile(ns_url, api_secret = undefined, ns_token = undefined, profile_name = undefined) {
    let url = new URL("api/v1/profile.json", ns_url);
    
    let fetch_options = {
        headers: {}
    };
    if(api_secret !== undefined) {
        
        // We have a passphrase.
        fetch_options.headers['api-secret'] = api_secret;
    } else if(ns_token !== undefined) {

        // If we have a token, add it to the query parameters.
        url.searchParams.append('token', ns_token);
    }

    // Retrieve the profile.
    let response = await fetch(url, fetch_options);
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
        console.error(data);
        throw new Error(`No profiles found at ${url.protocol}//${url.host}`);
    }
}