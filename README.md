]# cortex-bundle [![NPM version](https://badge.fury.io/js/cortex-bundle.svg)](http://badge.fury.io/js/cortex-bundle) [![Build Status](https://travis-ci.org/cortexjs/cortex-bundle.svg?branch=master)](https://travis-ci.org/cortexjs/cortex-bundle) [![Dependency Status](https://gemnasium.com/cortexjs/cortex-bundle.svg)](https://gemnasium.com/cortexjs/cortex-bundle)

A command-line tool to bundle cortex packages into single js file/css file.

## Install

```bash
$ npm install cortex-bundle -g
```

## Usage


Bundle is used as cortex plugin

```bash
cortex bundle
```

By default, bunlde command will bunlde javascript files, with neuron configurations and loaders together. Which means you just need only include the bundled file in your page.

If you want to the loader in the cdn, so you don't want neuron to be included, you can run:

```bash
cortex bundle --no-neuron
```

If you want to bunlde only a portion of libs, but not used as page entry. In this situation, you should run:

```bash
cortex bundle --lib-only
```

The output file will include projects and dependencies only, without neuron and neuron configuration.

## Licence

MIT
