# Offloc Server

[![CircleCI](https://circleci.com/gh/ministryofjustice/offloc-server.svg?style=svg)](https://circleci.com/gh/ministryofjustice/offloc-server)

A simple server for downloading the latest NOMIS extract.


## Getting started
Install dependencies using `npm ci` ensure you are using >= `Node v8.4.0`

Ensure you have a `.env` file containing all default env variables

`cp .env-template .env`

**Starting the app**

### Build assets
`npm run build`

### Start the app.

Ensure you build assets first

`npm run start`

### Runing the app in dev mode**

`npm run start:dev`

### Run linter

`npm run lint`

### Run tests

`npm run test`


## Gotchas
If you get this error when starting the app:
`Cannot find module './build/Release/DTraceProviderBindings'`

See for more details:

https://stackoverflow.com/questions/37550100/cannot-find-module-dtrace-provider

Run

`npm rebuild dtrace-provider`
