#!/bin/sh

if [ -e myFunc.zip ]; then
   rm myFunc.zip
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
zip ../../myFunc.zip -r *
cd ../..
zip myFunc.zip -r node_modules/
npm install
