# nightscout-autotune
Use `oref0-autotune` on a nightscout instance.

## Description
A small nodejs library that uses the oref0 reference implementation to run autotune on a Nightscout instance.
It can be run as either a nodejs application or a Docker container.

## Getting started
If you want to use the dockerized version of this app, just pull `houthacker42/wearenotwaiting/nightscout-autotune`, after you have ensured that the required dependencies have been installed.

### Dependencies
#### Dockerized app
  * *docker*: https://docs.docker.com/engine/install/

#### Standalone app
  * Node Version Manager: https://github.com/nvm-sh/nvm
  * nodejs

### Supported architectures
#### Dockerized app
  * linux/amd64
  * linux/arm64

### Standalone
  * Native builds

### Installation
#### Dockerized app
```bash
# Just pull the image
$ docker image pull houthacker42/nightscout-autotune:latest
```

#### Standalone
  1. Install *nvm*: Head over to https://github.com/nvm-sh/nvm for installation instructions and install `nvm` and the latest version of `nodejs`. 
  
  2. Install nightscout-autotune
  ```bash
  # Clone this repository and change to its directory
  $ git clone https://github.com/houthacker/nightscout-autotune.git

  $ cd nightscout-autotune

  # Use `npm install -g` if you want to install it globally.
  $ npm install -g

  # Clone the autotune repository and cd into its directory.
  $ git clone git clone --branch v0.7.1 https://github.com/openaps/oref0.git

  $ cd oref0

  # Install oref0
  $ npm run global-install

  ```

### Usage
#### Dockerized app
Run the image without arguments to see its usage description and examples
```bash
$ docker run --rm houthacker42/nightscout-autotune:latest
```

#### Standalone app
Run the app without arguments or with `--help` to see its usage description and examples.
```bash
# If installed globally
$ nightscout-autotune --help

# If installed locally
$ ./bin/app.sh --help
```

### Autotune output
The output of `oref0-autotune` is printed to the console, and looks like the example below.
```bash
... previous logging omitted

Autotune pump profile recommendations:
---------------------------------------------------------
Recommendations Log File: /tmp/autotune/autotune/autotune_recommendations.log

Parameter      | Pump        | Autotune    | Days Missing
---------------------------------------------------------
ISF [mg/dL/U]  | 15.000      | 17.315      |
Carb Ratio[g/U]| 15.500      | 14.728      |
  00:00        | 0.250       | 0.306       | 1           
  01:00        | 0.250       | 0.307       | 1           
  02:00        | 0.250       | 0.307       | 1           
  03:00        | 0.300       | 0.360       | 0           
  04:00        | 0.300       | 0.360       | 1           
  05:00        | 0.300       | 0.357       | 0           
  06:00        | 0.300       | 0.348       | 1           
  07:00        | 0.350       | 0.396       | 1           
  08:00        | 0.350       | 0.245       | 0           
  09:00        | 0.350       | 0.245       | 0           
  10:00        | 0.350       | 0.245       | 0           
  11:00        | 0.350       | 0.276       | 0           
  12:00        | 0.350       | 0.402       | 1           
  13:00        | 0.350       | 0.402       | 1           
  14:00        | 0.350       | 0.388       | 0           
  15:00        | 0.350       | 0.406       | 1           
  16:00        | 0.350       | 0.406       | 1           
  17:00        | 0.350       | 0.406       | 1           
  18:00        | 0.340       | 0.396       | 1           
  19:00        | 0.350       | 0.406       | 1           
  20:00        | 0.330       | 0.387       | 1           
  21:00        | 0.300       | 0.358       | 1           
  22:00        | 0.300       | 0.309       | 0           
  23:00        | 0.300       | 0.296       | 0 
```