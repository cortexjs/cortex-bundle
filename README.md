# cortex-bundle [![NPM version](https://badge.fury.io/js/cortex-bundle.svg)](http://badge.fury.io/js/cortex-bundle) [![Build Status](https://travis-ci.org/cortexjs/cortex-bundle.svg?branch=master)](https://travis-ci.org/cortexjs/cortex-bundle) [![Dependency Status](https://gemnasium.com/cortexjs/cortex-bundle.svg)](https://gemnasium.com/cortexjs/cortex-bundle)

<!-- description -->

## Install

```bash
$ npm install cortex-bundle -g
```

## Usage


Bundle is used as cortex plugin

```bash
cortex bundle
```

By default, bunlde command will bunlde javascript files, with neuron configurations.

If you want to bundle the loader together, you can run following command:

```bash
cortex bundle --with-neuron
```

If you want to bunlde only a portion of libs, but not used as page entry. In this situation, you don't need config:

```bash
cortex bundle --no-config
```


## Licence

MIT
<!-- do not want to make nodeinit to complicated, you can edit this whenever you want. -->