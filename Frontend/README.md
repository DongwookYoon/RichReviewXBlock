# canvas-lti

> Nuxt App which acts as an LTI producer and  handles LTI requests from a learning platform (i.e. Canvas). Sends the appropriate response with RichReview resource identifiers when assignments are created. Provides a UI for assignment creation. Also supports assignment submission and grading by making the main RichReview annotation app available to the learning platform. 

## Paths
Remember that domain is specified by `process.env.NODE_ENV`, which is set at runtime. E.g. richreview.net in prod.
**Assignment RR Document Creation**
/lti/new_assignment
**Assignment RR Document Access for Grading and Submission**
/lti/assignment


## Build Setup

```bash
# install dependencies
$ npm install

# serve with hot reload at localhost:8001 (NOT the default 3000)
$ npm run dev

# build for production and launch server
$ npm run build
$ npm run start

# generate static project
$ npm run generate
```

For detailed explanation on how things work, check out [Nuxt.js docs](https://nuxtjs.org).
