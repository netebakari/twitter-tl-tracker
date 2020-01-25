#!/bin/sh

if [ -e myFunc.zip ]; then
   rm timeline-tracker-1.1.0.zip
fi

if [ -e node_modules ]; then
   rm -rf node_modules
fi

if [ -e dist ]; then
   rm -rf dist
fi
npm install
npx tsc
rm -rf node_modules
npm install --production
cd dist/src
zip ../../timeline-tracker-1.1.0.zip -r *
cd ../..
zip timeline-tracker-1.1.0.zip -r node_modules/
npm install
