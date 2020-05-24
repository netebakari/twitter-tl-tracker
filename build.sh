#!/bin/sh

if [ -e timeline-tracker-latest.zip ]; then
   rm timeline-tracker-latest.zip
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
zip ../../timeline-tracker-latest.zip -r *
cd ../..
zip timeline-tracker-latest.zip -r node_modules/
npm install
