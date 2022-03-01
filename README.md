# Offloc Server

[![CircleCI](https://circleci.com/gh/ministryofjustice/offloc-server.svg?style=svg)](https://circleci.com/gh/ministryofjustice/offloc-server)

A simple server for downloading the latest NOMIS extract.

# Getting started

Install dependencies using `npm ci` ensure you are using >= `Node v14.15.1`

Ensure you have a `.env` file containing all default env variables

`cp .env-template .env`

You will also need have the azure cli installed as well as have access to azure.
For further details see:

https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest

# Starting the app

### Build assets
`npm run build`

### Start the app

Ensure you build assets first

`npm run start`

### Running the app in dev mode**

First ensure you are logged in with the azure cli:

`az login`

Then start the application:

`npm run start:dev`

### Run linter

`npm run lint`

### Run tests

`npm run test`

# Gotchas

If you are having trouble login in locally try logging in again to the azure cli:

`az login`

If you get this error when starting the app:
`Cannot find module './build/Release/DTraceProviderBindings'`

See for more details:

https://stackoverflow.com/questions/37550100/cannot-find-module-dtrace-provider

Run
`npm rebuild dtrace-provider`
