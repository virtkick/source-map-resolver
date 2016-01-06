'use strict';

let SourceMap = require('source-map');
let SourceMapConsumer = SourceMap.SourceMapConsumer;
let Promise = require('bluebird');
let fs = Promise.promisifyAll(require('fs'));
let sourceMappingURL = require("source-map-url");
let sourceMapCache = {};
let ErrorStackParser = require('error-stack-parser');

function readSourceMap(mapFile) {
  sourceMapCache[mapFile] = sourceMapCache[mapFile] || fs.readFileAsync(mapFile, 'utf8').then(JSON.parse).then(contents => {
    return new SourceMapConsumer(contents);
  }).then(function(smc) {
    return smc;
  });
  return sourceMapCache[mapFile];
}

function extractDataUrl(dataUrl) {
  return new Buffer(dataUrl.split(",")[1], 'base64').toString('utf8');
}

function resolveSourceMap(position, sourceMap) {
  let smc;
  if(! (sourceMap instanceof SourceMapConsumer)) {
    smc = new SourceMapConsumer(sourceMap);
  } else {
    smc = sourceMap;
  }
    
  let resolvedPosition = smc.originalPositionFor(position);
  if(!resolvedPosition.source) {
    return null;
  }
  
  let sourceContent;
  
  try {
    sourceContent = smc.sourceContentFor(resolvedPosition.source);
  } catch(err) {
    return resolvedPosition;
  }
  
  if(sourceMappingURL.existsIn(sourceContent)) {
    let url = sourceMappingURL.getFrom(sourceContent);
    if(!url.match(/^data:application\.json;base64,/)) {
      return resolvedPosition;
    }
    sourceMap = JSON.parse(extractDataUrl(url));
    sourceMap = new SourceMapConsumer(sourceMap);
    
    return resolveSourceMap({
      line: resolvedPosition.line,
      column: resolvedPosition.column
    }, sourceMap);
  } else {
    return resolvedPosition;
  }
}

function resolveStackTrace(sourceMapLocation, errorStack) {
  return readSourceMap(sourceMapLocation).then(smc => {
    return ErrorStackParser.parse({stack: errorStack}).map(sf => {
      let line = sf.lineNumber;
      let column = sf.columnNumber;
            
      let resolvedPosition = resolveSourceMap({
        line: parseInt(line),
        column: parseInt(column)
      }, smc);
      
      if(!resolvedPosition) {
        return sf.toString();
      }
      sf.setLineNumber(resolvedPosition.line);
      sf.setColumnNumber(resolvedPosition.column);
      if(resolvedPosition.name) {
        sf.setFunctionName(resolvedPosition.name);
      }
      sf.setFileName(resolvedPosition.source);
      return sf.toString();
    }).join('\n');
  });
};

module.exports = resolveStackTrace;