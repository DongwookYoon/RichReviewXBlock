# MIDDLEWARE

This directory contains your application middleware.
Middleware let you define custom functions that can be run before rendering either a page or a group of pages.

More information about the usage of this directory in [the documentation](https://nuxtjs.org/guide/routing#middleware).

In this app, the middleware is used to authenticate with Canvas via OAuth. The OAuth authentication
token is stored in ~/store/lti_auth and is refreshed if it expires. This allows
the app to establish authentication before processing requests further.
