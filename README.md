# source-map-resolver
Easily decode stack traces generated from minified sources

## Install
`npm install source-map-resolver`

## Usage

```js
let sourceMapResolve = require('source-map-resolver');

// stacktraceString is string, generated from new Error().stack
sourceMapResolve('./javascripts/application-2f037b638c.js.map', stacktraceString)
  .then(resolvedStack => {
    // resolvedStack is a string with frames referencing
    // application-2f037b638c.js resolved to the original sources
  });
```
